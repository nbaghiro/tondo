import {
    assistantDiscardRequest,
    assistantImageRequest,
    assistantPhotoRequest,
    assistantTurn,
    routes,
} from "@tondo/contract";
import type { AssistantEvent, AssistantStatus, ErrorResponse } from "@tondo/contract";
import { monthOf } from "@tondo/db";
import type { UsageStore } from "@tondo/db";
import type { Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { streamSSE } from "hono/streaming";
import { runTurn } from "./assistant-loop";
import type { Reach } from "./assistant-loop";
import { IMAGE_MODEL, ModelError } from "./assistant-model";
import type { Model } from "./assistant-model";
import type { CurrentPerson } from "./auth";
import { imageRefusal } from "./image-make";
import { isBlockedLink } from "./blocked";
import { limitsOf, photoLimitMessage } from "./limits";
import type { LimitsOfPerson } from "./limits";
import { isBusy, listInScope, photoScope, storePhoto } from "./photos";
import type { Storage } from "./storage";
import { createLimiter } from "./traffic";
import type { Scale } from "./traffic";

// Every credit figure in one place, so a plan or a model change has only this to touch.
export const CREDITS = { turn: 1, setup: 3, site: 1, image: 3 } as const;

const MAX_BODY = 1024 * 1024 + 16 * 1024;
const PROCESS_TURNS = 8;
const PING_MS = 15_000;
const IMAGE_MS = 60_000;
const UNAVAILABLE =
    "Help me isn't available right now. Your page is safe, and you can keep editing.";
const DROPPED = "That didn't work, and your page hasn't changed. Please try again.";

export interface AssistantDeps {
    model: Model;
    usage: UsageStore;
    storage: Storage | null;
    pages: Parameters<typeof photoScope>[0];
    reach: Reach;
    /** Makes one image. Left out, nothing offers images. */
    makeImage?: ((prompt: string, signal: AbortSignal) => Promise<Uint8Array | null>) | undefined;
    /** Downloads a picked photo through the safe fetcher. */
    download?: ((url: string, signal: AbortSignal) => Promise<Uint8Array | null>) | undefined;
    dailyUsd: number;
}

const firstOfNextMonth = (now: Date) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);

export function mountAssistant(
    app: Hono,
    deps: AssistantDeps | null,
    currentPerson: CurrentPerson,
    scale: Scale,
    limitsOfPerson: LimitsOfPerson = () =>
        Promise.resolve(limitsOf({ plan: "free", endsAt: null })),
    photoLimits: LimitsOfPerson = limitsOfPerson,
): void {
    const fail = (
        c: Context,
        status: 400 | 401 | 402 | 413 | 415 | 429 | 503,
        error: string,
        code?: string,
    ) => c.json<ErrorResponse>({ error, ...(code ? { code } : {}) }, status);
    const isJson = (c: Context) => c.req.header("content-type")?.startsWith("application/json");
    const allowTurn = createLimiter(scale(12), 60_000);
    const allowImage = createLimiter(scale(10), 3_600_000);
    const allowPick = createLimiter(scale(30), 3_600_000);
    const running = new Set<string>();
    // A safety net in memory, so a restart resets it. The provider's spend limit is the real ceiling.
    const today = { day: "", usd: 0 };
    const spentToday = (usd = 0) => {
        const day = new Date().toISOString().slice(0, 10);
        if (today.day !== day) Object.assign(today, { day, usd: 0 });
        today.usd += usd;
        return today.usd;
    };

    const creditsOf = async (userId: string) => {
        const { credits } = await limitsOfPerson(userId);
        const spent = deps ? await deps.usage.spentThisMonth(userId, monthOf(new Date())) : 0;
        return { credits, left: Math.max(0, credits - spent) };
    };

    app.get(routes.assistant, async (c) => {
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        const { credits, left } = await creditsOf(person.id);
        return c.json<AssistantStatus>({
            available: deps !== null,
            credits,
            creditsLeft: left,
            resetsOn: firstOfNextMonth(new Date()),
            imageCredits: CREDITS.image,
            images: Boolean(deps?.makeImage && deps.storage),
        });
    });

    if (!deps) return;
    const { model, usage, storage, pages, reach, makeImage, download } = deps;

    app.post(
        routes.assistantTurn,
        bodyLimit({
            maxSize: MAX_BODY,
            onError: (c) => fail(c, 413, "This page is too large for Help me."),
        }),
        async (c) => {
            if (!isJson(c)) return fail(c, 415, "Send this as JSON.");
            const person = await currentPerson(c);
            if (!person) return fail(c, 401, "You're not logged in.");
            const parsed = assistantTurn.safeParse(await c.req.json<unknown>().catch(() => null));
            if (!parsed.success) return fail(c, 400, "This page has something Help me can't read.");
            if (!allowTurn(person.id))
                return fail(c, 429, "That's a lot of requests. Wait a minute.");
            if (running.has(person.id) || running.size >= PROCESS_TURNS) {
                return fail(c, 429, "Help me is busy. Try again in a moment.");
            }
            if (spentToday() >= deps.dailyUsd) return fail(c, 503, UNAVAILABLE);
            const { left } = await creditsOf(person.id);
            if (left < CREDITS.turn) {
                return fail(
                    c,
                    402,
                    `You've used this month's credits. They reset on ${firstOfNextMonth(new Date())}, and everything else in Tondo still works.`,
                );
            }
            const { page, message, history, selected, timeZone } = parsed.data;
            running.add(person.id);
            const userId = person.id;
            return streamSSE(c, async (stream) => {
                const stopping = new AbortController();
                stream.onAbort(() => {
                    stopping.abort();
                });
                // Written in order, and the stream stays open until the last one has gone.
                let writing: Promise<unknown> = Promise.resolve();
                const emit = (event: AssistantEvent) => {
                    writing = writing
                        .then(() => stream.writeSSE({ data: JSON.stringify(event) }))
                        .catch(() => undefined);
                };
                const ping = setInterval(() => {
                    stream.write(": still working\n\n").catch(() => undefined);
                }, PING_MS);
                try {
                    const result = await runTurn({
                        model,
                        page,
                        message,
                        history,
                        selected,
                        today: new Date().toISOString().slice(0, 10),
                        timeZone: timeZone ?? page.timeZone ?? "UTC",
                        creditsLeft: left,
                        setupCredits: CREDITS.setup,
                        makeId: () => crypto.randomUUID(),
                        isBlocked: isBlockedLink,
                        reach,
                        signal: stopping.signal,
                        emit,
                    });
                    spentToday(result.usd);
                    if (!result.finished || stopping.signal.aborted) return;
                    const charge =
                        (result.setup ? CREDITS.setup : CREDITS.turn) +
                        result.sitesRead * CREDITS.site;
                    const { credits } = await limitsOfPerson(userId);
                    const total = await usage.spend(
                        userId,
                        monthOf(new Date()),
                        Math.min(charge, left),
                        credits,
                    );
                    emit({
                        type: "done",
                        page: result.page,
                        reply: result.reply,
                        changes: result.changes,
                        partial: result.partial,
                        creditsLeft: total === null ? 0 : Math.max(0, credits - total),
                    });
                } catch (error) {
                    if (!stopping.signal.aborted) {
                        // The class and the status only: a message could quote the person's page.
                        const code = error instanceof Error ? error.constructor.name : "unknown";
                        const quota = error instanceof ModelError ? ` ${error.quota}` : "";
                        process.stderr.write(
                            `Help me failed: ${code}${quota}, model ${model.id}\n`,
                        );
                        // Google may use free-tier content to improve its products, so this has to be seen.
                        if (quota.includes("FreeTier")) {
                            process.stderr.write(
                                "Warning: GOOGLE_API_KEY is on Gemini's free tier. Don't use it for real people's pages.\n",
                            );
                        }
                        emit({
                            type: "stopped",
                            reason: "error",
                            message: error instanceof TypeError ? DROPPED : UNAVAILABLE,
                        });
                    }
                } finally {
                    clearInterval(ping);
                    running.delete(userId);
                    await writing;
                }
            });
        },
    );

    app.post(routes.assistantImage, bodyLimit({ maxSize: 4096 }), async (c) => {
        if (!isJson(c)) return fail(c, 415, "Send this as JSON.");
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        if (!storage || !makeImage) return fail(c, 503, UNAVAILABLE);
        const parsed = assistantImageRequest.safeParse(
            await c.req.json<unknown>().catch(() => null),
        );
        if (!parsed.success) return fail(c, 400, "Describe the image in a few words.");
        const { prompt, kind, count, name } = parsed.data;
        const refusal = imageRefusal(prompt, name);
        if (refusal) return fail(c, 400, refusal);
        if (!allowImage(person.id)) return fail(c, 429, "That's a lot of images. Try again later.");
        if (spentToday() >= deps.dailyUsd) return fail(c, 503, UNAVAILABLE);
        const cost = count * CREDITS.image;
        const { credits, left } = await creditsOf(person.id);
        if (left < cost) {
            return fail(
                c,
                402,
                `That needs ${String(cost)} credits, and you have ${String(left)}.`,
            );
        }
        const scope = await photoScope(pages, person.id, c.req.query("page"), photoLimits);
        if (!scope) return fail(c, 400, "We couldn't find that page.");
        const { limits } = scope;
        const stored = await listInScope(storage, scope);
        if (stored.length + count > limits.photos) {
            return fail(c, 413, photoLimitMessage(limits), "plan_limit");
        }
        const signal = AbortSignal.timeout(IMAGE_MS);
        const framed = `${kind === "logo" ? "A simple, flat logo on a plain background:" : kind === "art" ? "An illustration:" : "A natural photograph:"} ${prompt}`;
        const made = await Promise.all(
            Array.from({ length: count }, () => makeImage(framed, signal).catch(() => null)),
        );
        spentToday(made.filter(Boolean).length * IMAGE_MODEL.usd);
        const files = (
            await Promise.all(
                made.map((bytes) =>
                    bytes ? storePhoto(storage, scope.folder, bytes) : Promise.resolve(null),
                ),
            )
        ).filter((file): file is string => file !== null);
        if (!files.length) return fail(c, 503, "No image came back, and no credits were used.");
        const total = await usage.spend(
            person.id,
            monthOf(new Date()),
            files.length * CREDITS.image,
            credits,
        );
        return c.json({ files, creditsLeft: total === null ? 0 : Math.max(0, credits - total) });
    });

    app.post(routes.assistantPhoto, bodyLimit({ maxSize: 4096 }), async (c) => {
        if (!isJson(c)) return fail(c, 415, "Send this as JSON.");
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        if (!storage || !download) return fail(c, 503, UNAVAILABLE);
        const parsed = assistantPhotoRequest.safeParse(
            await c.req.json<unknown>().catch(() => null),
        );
        if (!parsed.success) return fail(c, 400, "Choose a photo.");
        if (!allowPick(person.id)) return fail(c, 429, "That's a lot of photos. Try again later.");
        if (isBusy()) return fail(c, 503, "We're busy with other photos. Try again in a moment.");
        const scope = await photoScope(pages, person.id, c.req.query("page"), photoLimits);
        if (!scope) return fail(c, 400, "We couldn't find that page.");
        const { limits } = scope;
        const existing = await listInScope(storage, scope);
        if (existing.length >= limits.photos) {
            return fail(c, 413, photoLimitMessage(limits), "plan_limit");
        }
        const bytes = await download(parsed.data.url, AbortSignal.timeout(IMAGE_MS)).catch(
            () => null,
        );
        const file = bytes ? await storePhoto(storage, scope.folder, bytes) : null;
        if (!file) return fail(c, 503, "That photo couldn't be downloaded. Try another one.");
        return c.json({ file }, 201);
    });

    // Images nobody picked don't stay around using up someone's photo limit.
    app.post(routes.assistantDiscard, bodyLimit({ maxSize: 4096 }), async (c) => {
        if (!isJson(c)) return fail(c, 415, "Send this as JSON.");
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        const parsed = assistantDiscardRequest.safeParse(
            await c.req.json<unknown>().catch(() => null),
        );
        if (!parsed.success) return fail(c, 400, "That didn't work.");
        const scope = await photoScope(pages, person.id, c.req.query("page"), photoLimits);
        const folders = scope?.folders ?? [];
        await Promise.all(
            parsed.data.files
                .filter(
                    (file) =>
                        folders.some((folder) => file.startsWith(folder)) && !file.includes(".."),
                )
                .map((file) => storage?.remove(file) ?? Promise.resolve()),
        );
        return c.body(null, 204);
    });
}
