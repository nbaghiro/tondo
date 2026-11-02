import { createHash } from "node:crypto";
import { domainRequest, routes } from "@tondo/contract";
import type { DomainResponse, ErrorResponse } from "@tondo/contract";
import type { Draft, DomainRow, DomainStore, PageStore } from "@tondo/db";
import { canUseDomain } from "@tondo/page";
import { parse } from "tldts";
import type { Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { CurrentPerson } from "./auth";
import { isBlockedLink } from "./blocked";
import type { Hosting } from "./hosting";
import { limitsOf } from "./limits";
import { createLimiter } from "./traffic";
import type { Scale } from "./traffic";

/** Domains nobody can connect, whoever asks. */
const NEVER = ["tondo.page", "onrender.com", "render.com"];

/** The bare domain someone means, however they typed it. Null if it isn't one we can connect. */
export function readDomain(raw: string): string | null {
    const text = raw
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/[/?#].*$/, "")
        .replace(/\.+$/, "");
    if (!text || text.includes("@") || !URL.canParse(`https://${text}`)) return null;
    const url = new URL(`https://${text}`);
    if (url.port) return null;
    const { domain, hostname, isIcann, isIp, subdomain } = parse(url.hostname);
    if (!domain || !hostname || !isIcann || isIp) return null;
    return subdomain === "www" ? domain : hostname;
}

export const isRefusedDomain = (host: string, appHosts: ReadonlySet<string>): boolean =>
    appHosts.has(host) ||
    NEVER.some((name) => host === name || host.endsWith(`.${name}`)) ||
    isBlockedLink(`https://${host}`);

/** The code a page's owner publishes. Tied to the page, so a code left behind proves nothing to anyone else. */
export const domainCode = (pageId: string, host: string): string =>
    `tondo-verify=${createHash("sha256").update(`${pageId}:${host}`).digest("hex").slice(0, 32)}`;

const shapeOf = (host: string) => {
    const { domain, subdomain } = parse(host);
    return { apex: host === domain, label: subdomain ?? "" };
};
const codeName = ({ apex, label }: { apex: boolean; label: string }) =>
    apex ? "_tondo" : `_tondo.${label}`;

export interface DomainDeps {
    store: DomainStore;
    hosting: Hosting;
    /** Addresses that belong to Tondo itself. */
    appHosts: ReadonlySet<string>;
}

export function mountDomains(
    app: Hono,
    {
        store,
        hosting,
        appHosts,
        pages,
        currentPerson,
        scale,
        onChange,
    }: DomainDeps & {
        pages: PageStore;
        currentPerson: CurrentPerson;
        scale: Scale;
        onChange: (host: string, handle: string) => void;
    },
): void {
    const fail = (
        c: Context,
        status: 400 | 401 | 403 | 404 | 409 | 415 | 429 | 503,
        error: string,
    ) => c.json<ErrorResponse>({ error }, status);
    const small = bodyLimit({ maxSize: 4096 });
    const isJson = (c: Context) => c.req.header("content-type")?.startsWith("application/json");
    const allow = createLimiter(scale(30), 60_000);
    const UNREACHABLE = "We couldn't check your domain just now. Please try again in a moment.";
    const IN_USE = "This domain is already connected to another page.";
    const ELSEWHERE =
        "This domain is connected to another service. Remove it there first, then check again.";

    const canChange = (draft: Draft) =>
        draft.side === "own" ||
        draft.side === "joined" ||
        (draft.side === "team" && draft.team?.role === "owner");

    const answer = (
        draft: Draft,
        row: DomainRow | null,
        missing: "code" | "address" | null = null,
    ) => {
        const allowed = canUseDomain(draft.standing, limitsOf);
        const shape = row ? shapeOf(row.host) : null;
        return {
            allowed,
            canChange: canChange(draft),
            domain:
                row && shape
                    ? {
                          host: row.host,
                          status: !row.verified ? "waiting" : allowed ? "live" : "paused",
                          missing,
                          records: [
                              ...hosting.addressRecords(shape),
                              {
                                  type: "TXT",
                                  name: codeName(shape),
                                  value: domainCode(row.pageId, row.host),
                              },
                          ],
                      }
                    : null,
        } satisfies DomainResponse;
    };

    /** The page holding this domain, if the domain's records still name it. */
    const heldElsewhere = async (host: string, pageId: string, codes: readonly string[]) => {
        const holder = await store.holder(host);
        if (!holder || holder.pageId === pageId) return { holder: null, inUse: false };
        return { holder, inUse: codes.includes(domainCode(holder.pageId, host)) };
    };
    const codesAt = (host: string) => hosting.readTxt(`_tondo.${host}`);

    /** Only the page that holds a domain, or nobody, can take it off the host. */
    const removeFromHost = async (pageId: string, host: string) => {
        const holder = await store.holder(host);
        if (holder && holder.pageId !== pageId) return;
        await hosting.remove(host).catch((error: unknown) => {
            // It's no longer served, because the row decides that. It costs a little until removed by hand.
            process.stderr.write(`Couldn't remove ${host} from hosting: ${String(error)}\n`);
        });
    };

    const page = async (c: Context) => {
        const person = await currentPerson(c);
        if (!person) return { refused: fail(c, 401, "You're not logged in.") };
        const draft = await pages.findDraft(person.id, c.req.param("id") ?? "");
        if (!draft) return { refused: fail(c, 404, "We couldn't find that page.") };
        return { person, draft, pageId: c.req.param("id") ?? "" };
    };
    const changing = async (c: Context) => {
        if (!isJson(c)) return { refused: fail(c, 415, "Send this as JSON.") };
        const found = await page(c);
        if (found.refused) return found;
        if (!allow(found.person.id)) {
            return { refused: fail(c, 429, "Too many tries. Wait a little and try again.") };
        }
        if (!canChange(found.draft)) {
            return { refused: fail(c, 403, "Only the page's owner can change its domain.") };
        }
        return found;
    };

    app.get(routes.pageDomain(":id"), async (c) => {
        const { draft, pageId, refused } = await page(c);
        if (refused) return refused;
        return c.json<DomainResponse>(answer(draft, await store.find(pageId)));
    });

    app.post(routes.pageDomain(":id"), small, async (c) => {
        const { draft, pageId, refused } = await changing(c);
        if (refused) return refused;
        if (!canUseDomain(draft.standing, limitsOf)) {
            return fail(c, 403, "Your own domain comes with Pro.");
        }
        const parsed = domainRequest.safeParse(await c.req.json<unknown>().catch(() => null));
        const host = parsed.success ? readDomain(parsed.data.domain) : null;
        if (!host) return fail(c, 400, "Enter a domain you own, such as yourname.com.");
        if (isRefusedDomain(host, appHosts)) return fail(c, 400, "This domain can't be connected.");
        try {
            const { inUse } = await heldElsewhere(host, pageId, await codesAt(host));
            if (inUse) return fail(c, 409, IN_USE);
        } catch {
            return fail(c, 503, UNREACHABLE);
        }
        if (!(await store.add(pageId, host))) {
            return fail(c, 409, "This page already has a domain. Remove it to connect another.");
        }
        return c.json<DomainResponse>(answer(draft, await store.find(pageId)), 201);
    });

    app.post(routes.pageDomainCheck(":id"), small, async (c) => {
        const { draft, pageId, refused } = await changing(c);
        if (refused) return refused;
        const row = await store.find(pageId);
        if (!row) return fail(c, 404, "This page doesn't have a domain yet.");
        if (row.verified) return c.json<DomainResponse>(answer(draft, row));
        if (!canUseDomain(draft.standing, limitsOf)) {
            return fail(c, 403, "Your own domain comes with Pro.");
        }
        try {
            const codes = await codesAt(row.host);
            if (!codes.includes(domainCode(pageId, row.host))) {
                return c.json<DomainResponse>(answer(draft, row, "code"));
            }
            const { holder, inUse } = await heldElsewhere(row.host, pageId, codes);
            if (inUse) return fail(c, 409, IN_USE);
            if ((await hosting.add(row.host)) === "held") return fail(c, 409, ELSEWHERE);
            if (!(await hosting.isReady(row.host))) {
                return c.json<DomainResponse>(answer(draft, row, "address"));
            }
            // The records now name this page, so whoever held it before has stopped owning it.
            if (holder) {
                await store.release(holder.pageId);
                onChange(row.host, holder.handle);
            }
            if (!(await store.verify(pageId))) return fail(c, 409, IN_USE);
        } catch (error) {
            process.stderr.write(`Couldn't check a domain: ${String(error)}\n`);
            return fail(c, 503, UNREACHABLE);
        }
        onChange(row.host, draft.handle);
        return c.json<DomainResponse>(answer(draft, await store.find(pageId)));
    });

    app.delete(routes.pageDomain(":id"), small, async (c) => {
        const { draft, pageId, refused } = await changing(c);
        if (refused) return refused;
        const row = await store.find(pageId);
        if (!row) return c.body(null, 204);
        await removeFromHost(pageId, row.host);
        await store.remove(pageId);
        onChange(row.host, draft.handle);
        return c.body(null, 204);
    });
}
