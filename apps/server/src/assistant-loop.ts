import type { AssistantEvent, AssistantOffer } from "@tondo/contract";
import {
    applyTool,
    createEvidence,
    createShortIds,
    digestPage,
    pageSchema,
    toolDeclarations,
    toolInputs,
    toolStatus,
} from "@tondo/page";
import type { Page, ShortIds, ToolContext } from "@tondo/page";
import { costOf } from "./assistant-model";
import type { Content, Model, ModelUsage, Part } from "./assistant-model";
import { systemPrompt, turnText } from "./assistant-prompt";

// One turn: the model calls tools on a working copy, and the result goes back to the browser, which
// saves it the normal way. Nothing here writes to the database, so a failed turn has nothing to undo.

const MAX_CALLS = 6;
const MAX_TOOLS = 12;
const MAX_TOKENS = 8000;
const MAX_SITES = 3;

/** The things a turn can reach outside the page. Each one is left out if it isn't set up. */
export interface Reach {
    readWebsite?: (url: string, said: string, signal: AbortSignal) => Promise<SiteRead>;
    findPhotos?: (query: string, signal: AbortSignal) => Promise<AssistantOfferPhotos>;
    imageCredits?: number;
}

export type AssistantOfferPhotos = Extract<AssistantOffer, { type: "photos" }>["choices"];

export type SiteRead =
    { ok: true; facts: string; usage: ModelUsage } | { ok: false; error: string };

export interface TurnInput {
    model: Model;
    page: Page;
    message: string;
    history: readonly { role: "user" | "model"; text: string }[];
    selected: string | null;
    today: string;
    timeZone: string;
    creditsLeft: number;
    setupCredits: number;
    makeId: () => string;
    isBlocked: (url: string) => boolean;
    /** False only in the eval, to measure the model on its own. */
    guard?: boolean;
    reach?: Reach;
    signal: AbortSignal;
    deadlineMs?: number;
    emit: (event: AssistantEvent) => void;
}

export interface TurnResult {
    finished: boolean;
    page: Page;
    reply: string;
    changes: string[];
    partial: boolean;
    setup: boolean;
    sitesRead: number;
    usd: number;
    usage: ModelUsage;
    tools: { name: string; args: unknown; ok: boolean; error?: string }[];
    offers: AssistantOffer[];
}

const ERROR = "Help me isn't available right now. Your page is safe, and you can keep editing.";
const REFUSED = "I can't help with that. Your page hasn't changed.";

const plainReply = (parts: readonly Part[]) =>
    parts
        .filter((part) => part.text && !part.thought)
        .map((part) => part.text)
        .join("")
        .replace(/\s*[—–]\s*/g, ", ")
        .trim();

function resolveTarget(short: string, ids: ShortIds): string | null {
    if (short === "header" || short === "background") return short;
    return ids.real(short) ?? null;
}

export async function runTurn(input: TurnInput): Promise<TurnResult> {
    const { model, emit, signal } = input;
    const ids = createShortIds();
    const said = [
        ...input.history.filter((entry) => entry.role === "user").map((entry) => entry.text),
        input.message,
    ];
    const start = input.page;
    const siteFacts: string[] = [];
    const evidence = () => createEvidence([...said, ...siteFacts], start);
    const ctx: ToolContext = {
        ids,
        makeId: input.makeId,
        evidence: input.guard === false ? null : evidence(),
        isBlocked: input.isBlocked,
        removed: 0,
        creditsLeft: input.creditsLeft,
        setupCredits: input.setupCredits,
    };
    const selected = input.selected
        ? ids.short(input.selected === "header" ? "s" : "s", input.selected)
        : null;
    const digest = digestPage(start, ids, input.selected).text;
    const contents: Content[] = [
        ...input.history.map((entry): Content => ({
            role: entry.role,
            parts: [{ text: entry.text }],
        })),
        {
            role: "user",
            parts: [
                {
                    text: turnText(start, digest, input.message, {
                        today: input.today,
                        timeZone: input.timeZone,
                        selected: input.selected === "header" ? "header" : selected,
                        creditsLeft: input.creditsLeft,
                    }),
                },
            ],
        },
    ];
    const usage: ModelUsage = { input: 0, cached: 0, output: 0 };
    const count = (extra: ModelUsage) => {
        usage.input += extra.input;
        usage.cached += extra.cached;
        usage.output += extra.output;
    };
    const result: TurnResult = {
        finished: false,
        page: start,
        reply: "",
        changes: [],
        partial: false,
        setup: false,
        sitesRead: 0,
        usd: 0,
        usage,
        tools: [],
        offers: [],
    };
    const stop = (reason: "refusal" | "error", message: string) => {
        result.page = start;
        result.usd = costOf(model.id, usage);
        emit({ type: "stopped", reason, message });
        return result;
    };
    const offer = (next: AssistantOffer) => {
        result.offers.push(next);
        emit({ type: "offer", offer: next });
    };
    const system = systemPrompt();
    const tools = toolDeclarations();
    const deadline = Date.now() + (input.deadlineMs ?? 180_000);
    let used = 0;

    for (let call = 0; ; call += 1) {
        if (call >= MAX_CALLS || Date.now() > deadline) {
            result.partial = true;
            break;
        }
        const reply = await model.generate({
            system,
            tools,
            contents,
            maxTokens: MAX_TOKENS,
            signal,
        });
        count(reply.usage);
        if (reply.blocked) return stop("refusal", REFUSED);
        // A call cut off at the limit can parse as a smaller valid one, so it's never run.
        if (reply.finish === "MAX_TOKENS") return stop("error", ERROR);
        const calls = reply.parts.flatMap((part) => (part.functionCall ? [part.functionCall] : []));
        const text = plainReply(reply.parts);
        if (!calls.length) {
            if (reply.finish && reply.finish !== "STOP") return stop("error", ERROR);
            result.reply = text;
            break;
        }
        contents.push({ role: "model", parts: reply.parts });
        const answers: Part[] = [];
        let endsTurn = false;
        let changed = false;
        for (const tool of calls) {
            used += 1;
            emit({ type: "status", text: toolStatus(tool.name) });
            const reference = { ...(tool.id ? { id: tool.id } : {}), name: tool.name };
            if (used > MAX_TOOLS) {
                result.partial = true;
                answers.push({
                    functionResponse: {
                        ...reference,
                        response: { ok: false, error: "Too many changes for one turn. Stop here." },
                    },
                });
                continue;
            }
            const answer = await runOne(tool.name, tool.args ?? {}, input, result, ctx, ids, {
                offer,
                addFacts: (facts) => {
                    siteFacts.push(facts);
                    if (ctx.evidence) ctx.evidence = evidence();
                },
                count,
            });
            changed ||= answer.changed;
            endsTurn ||= answer.endsTurn;
            result.tools.push({
                name: tool.name,
                args: tool.args,
                ok: answer.ok,
                ...(answer.error ? { error: answer.error } : {}),
            });
            answers.push({ functionResponse: { ...reference, response: answer.response } });
        }
        contents.push({ role: "user", parts: answers });
        if (changed) emit({ type: "page", page: result.page });
        if (result.partial || endsTurn) {
            result.reply = text;
            break;
        }
    }

    const final = pageSchema.safeParse(result.page);
    if (!final.success) {
        process.stderr.write(`Help me made a page that didn't validate, model ${model.id}\n`);
        return stop("error", ERROR);
    }
    result.page = final.data;
    result.finished = true;
    result.usd = costOf(model.id, usage);
    return result;
}

interface Answer {
    ok: boolean;
    error?: string;
    changed: boolean;
    endsTurn: boolean;
    response: Record<string, unknown>;
}

async function runOne(
    name: string,
    args: unknown,
    input: TurnInput,
    result: TurnResult,
    ctx: ToolContext,
    ids: ShortIds,
    hooks: {
        offer: (next: AssistantOffer) => void;
        addFacts: (facts: string) => void;
        count: (usage: ModelUsage) => void;
    },
): Promise<Answer> {
    const refuse = (error: string): Answer => ({
        ok: false,
        error,
        changed: false,
        endsTurn: false,
        response: { ok: false, error },
    });
    const told = (detail: string, ok = true): Answer => ({
        ok,
        changed: false,
        endsTurn: false,
        response: { ok, detail },
    });
    const reach = input.reach ?? {};

    if (name === "read_website") {
        const parsed = toolInputs.read_website.safeParse(args);
        if (!parsed.success) return refuse("Give the address the person pasted.");
        if (!reach.readWebsite) return refuse("Reading websites isn't available here.");
        if (result.sitesRead >= MAX_SITES) return refuse("That's enough pages for one request.");
        const read = await reach.readWebsite(parsed.data.url, input.message, input.signal);
        if (!read.ok) return refuse(read.error);
        hooks.count(read.usage);
        hooks.addFacts(read.facts);
        result.sitesRead += 1;
        return told(`<site_facts>\n${read.facts}\n</site_facts>`);
    }
    if (name === "find_photos") {
        const parsed = toolInputs.find_photos.safeParse(args);
        if (!parsed.success) return refuse("Say what to look for, and where it goes.");
        if (!reach.findPhotos) return refuse("Stock photos aren't available here.");
        const target = resolveTarget(parsed.data.for, ids);
        if (!target)
            return refuse(
                `No place called ${parsed.data.for}. Use "header", "background" or an id.`,
            );
        const choices = await reach.findPhotos(parsed.data.query, input.signal);
        if (!choices.length)
            return told("No photos came back. Tell the person, and suggest other words.");
        hooks.offer({ type: "photos", target, choices });
        return told(
            "The person is seeing these photos to pick from. Nothing is on the page until they do.",
        );
    }
    if (name === "make_image") {
        const parsed = toolInputs.make_image.safeParse(args);
        if (!parsed.success) return refuse("Describe the image, its kind and where it goes.");
        if (reach.imageCredits === undefined)
            return refuse("Generated images aren't available here.");
        const target = resolveTarget(parsed.data.for, ids);
        if (!target)
            return refuse(
                `No place called ${parsed.data.for}. Use "header", "background" or an id.`,
            );
        const count = 2;
        hooks.offer({
            type: "image",
            prompt: parsed.data.prompt,
            kind: parsed.data.kind,
            target,
            count,
            credits: count * reach.imageCredits,
        });
        return told(
            "The person is being asked first, with the cost. Nothing has been made yet. Say so.",
        );
    }

    const before = result.page;
    const done = applyTool(before, name, args, ctx);
    if (!done.ok) return refuse(done.error);
    result.page = done.page;
    if (done.summary) result.changes.push(done.summary);
    ctx.removed += done.removed ?? 0;
    result.setup ||= done.setup === true;
    if (done.offer) hooks.offer(done.offer);
    return {
        ok: true,
        changed: done.page !== before,
        endsTurn: done.offer?.type === "choice",
        response: {
            ok: true,
            ...(done.summary ? { summary: done.summary } : {}),
            ...(done.detail ? { detail: done.detail } : {}),
        },
    };
}
