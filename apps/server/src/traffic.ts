import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context, MiddlewareHandler } from "hono";

// All of this is per process, which suits one server. With several, each limit applies per server
// and a shared store such as Redis would be needed to make them exact.

/**
 * Which address to count a visitor under. Each proxy adds one entry on the right, so with N proxies
 * of ours in front, the Nth entry from the right is the first one anyone outside couldn't forge.
 */
export function pickIp(forwarded: string | undefined, hops: number, socket: string): string {
    if (hops <= 0) return socket;
    const entries = (forwarded ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    return entries[entries.length - hops] ?? socket;
}

const proxyHops = () => Number(process.env["TRUSTED_PROXY_HOPS"] ?? 0);

/** The visitor's address. It only believes as many forwarded entries as we have proxies. */
export function clientIp(c: Context): string {
    let socket = "local";
    try {
        socket = getConnInfo(c).remote.address ?? "local";
    } catch {
        // Tests call the app directly, so there's no connection to ask.
    }
    return pickIp(c.req.header("x-forwarded-for"), proxyHops(), socket);
}

/**
 * Counts per key. When full it forgets whichever key has gone quiet longest, so a flood of new keys
 * can't wipe the count of someone who's still being limited.
 */
export function createLimiter(max: number, windowMs: number, maxKeys = 50_000) {
    const seen = new Map<string, { count: number; resetAt: number }>();
    return (key: string, now = Date.now()): boolean => {
        const found = seen.get(key);
        const entry = !found || found.resetAt < now ? { count: 0, resetAt: now + windowMs } : found;
        entry.count += 1;
        seen.delete(key);
        seen.set(key, entry);
        if (seen.size > maxKeys) {
            const quietest = seen.keys().next().value;
            if (quietest !== undefined) seen.delete(quietest);
        }
        return entry.count <= max;
    };
}

export type Scale = (max: number) => number;

const MINUTE = 60_000;

/** Refuses a request over the limit for its key. A null key isn't limited. */
export function limit(
    max: number,
    key: (c: Context) => string | null | Promise<string | null>,
    windowMs = MINUTE,
): MiddlewareHandler {
    const allow = createLimiter(max, windowMs);
    return async (c, next) => {
        const value = await key(c);
        if (value !== null && !allow(value)) {
            c.header("Retry-After", String(Math.ceil(windowMs / 1000)));
            return c.json({ error: "Too many tries. Wait a little and try again." }, 429);
        }
        await next();
        return undefined;
    };
}

const BOTS =
    /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|curl|wget|python|monitor/i;

/** Only real visits count, so link previews and crawlers don't inflate someone's numbers. */
export function countsAsVisit(c: Context): boolean {
    return c.req.method === "GET" && !BOTS.test(c.req.header("user-agent") ?? "");
}

export type Count = (pageId: string, target: string) => void;

/** Adds counts up in memory and writes them together, so a burst of visits is one write. */
export function createCounter(
    write: (pageId: string, target: string, by: number) => Promise<void>,
    everyMs: number,
) {
    const waiting = new Map<string, { pageId: string; target: string; by: number }>();
    const flush = async () => {
        const batch = [...waiting.values()];
        waiting.clear();
        await Promise.all(
            batch.map(({ pageId, target, by }) =>
                write(pageId, target, by).catch((error: unknown) => {
                    process.stderr.write(`Couldn't save a count: ${String(error)}\n`);
                }),
            ),
        );
    };
    const timer = setInterval(() => {
        flush().catch(() => undefined);
    }, everyMs);
    timer.unref();
    const count: Count = (pageId, target) => {
        const key = `${pageId}|${target}`;
        const entry = waiting.get(key);
        if (entry) entry.by += 1;
        else waiting.set(key, { pageId, target, by: 1 });
    };
    return {
        count,
        stop: async () => {
            clearInterval(timer);
            await flush();
        },
    };
}

/** Remembers answers briefly, so a busy page doesn't read the database on every visit. */
export function createCache<Value>(ttlMs: number, maxEntries = 5000) {
    const entries = new Map<string, { value: Value; until: number }>();
    return {
        get: async (key: string, load: () => Promise<Value>): Promise<Value> => {
            const found = entries.get(key);
            if (found && found.until > Date.now()) return found.value;
            const value = await load();
            if (entries.size >= maxEntries) entries.clear();
            entries.set(key, { value, until: Date.now() + ttlMs });
            return value;
        },
        drop: (key: string) => {
            entries.delete(key);
        },
    };
}
