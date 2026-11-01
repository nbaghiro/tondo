import { lookup } from "node:dns";
import type { LookupAddress } from "node:dns";
import { request as httpRequest } from "node:http";
import type { IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

// Fetches addresses people give us, so nothing here may reach our own network. Each address is
// checked at the moment the connection is made, rather than looked up first and trusted after, so a
// name that changes its answer between the two can't slip through. Galleo's fetcher is the starting
// point, with that gap closed, more private ranges covered and only the usual web ports allowed.

export const MAX_PAGE_BYTES = 2_000_000;
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const TOTAL_MS = 15_000;
const MAX_REDIRECTS = 3;
const USER_AGENT = "TondoBot/1.0 (+https://tondo.page/support)";
const PORTS = new Set(["", "80", "443"]);

const PRIVATE_V4: readonly (readonly [number, number, number])[] = [
    [0, 0, 8],
    [10, 0, 8],
    [100, 64 << 16, 10],
    [127, 0, 8],
    [169, 254 << 16, 16],
    [172, 16 << 16, 12],
    [192, 168 << 16, 16],
    [192, 0, 24],
    [198, 18 << 16, 15],
    [224, 0, 4],
    [240, 0, 4],
];

function v4Number(ip: string): number {
    return ip.split(".").reduce((sum, part) => sum * 256 + Number(part), 0);
}

function isPrivateV4(ip: string): boolean {
    const value = v4Number(ip);
    return PRIVATE_V4.some(([first, rest, bits]) => {
        const base = first * 2 ** 24 + rest;
        const size = 2 ** (32 - bits);
        return value >= base && value < base + size;
    });
}

/** Expands an IPv6 address to its 8 groups, or null if it can't be read. */
function v6Groups(ip: string): number[] | null {
    let text = ip.toLowerCase().split("%")[0] ?? "";
    const dotted = /(\d+\.\d+\.\d+\.\d+)$/.exec(text)?.[1];
    if (dotted) {
        const value = v4Number(dotted);
        const high = Math.floor(value / 65536).toString(16);
        const low = (value % 65536).toString(16);
        text = text.slice(0, -dotted.length) + `${high}:${low}`;
    }
    const [left = "", right] = text.split("::");
    const head = left ? left.split(":") : [];
    const tail = right ? right.split(":") : [];
    const missing = right === undefined ? 0 : 8 - head.length - tail.length;
    if (missing < 0) return null;
    const groups = [...head, ...Array<string>(missing).fill("0"), ...tail].map((part) =>
        Number.parseInt(part, 16),
    );
    return groups.length === 8 && groups.every((part) => part >= 0 && part <= 0xffff)
        ? groups
        : null;
}

/** Anything that isn't plainly a public address counts as private. */
export function isPrivateAddress(ip: string): boolean {
    const kind = isIP(ip.split("%")[0] ?? "");
    if (kind === 4) return isPrivateV4(ip);
    if (kind !== 6) return true;
    const groups = v6Groups(ip);
    if (!groups) return true;
    const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0] = groups;
    const zeros = a === 0 && b === 0 && c === 0 && d === 0 && e === 0;
    if (zeros && f === 0 && g === 0 && (h === 0 || h === 1)) return true;
    // IPv4 hiding inside IPv6: mapped, compatible, NAT64 and 6to4.
    const inner = (high: number, low: number) =>
        `${String(high >> 8)}.${String(high & 255)}.${String(low >> 8)}.${String(low & 255)}`;
    if (zeros && (f === 0xffff || f === 0)) return isPrivateV4(inner(g, h));
    if (a === 0x64 && b === 0xff9b) return isPrivateV4(inner(g, h));
    if (a === 0x2002) return isPrivateV4(inner(b, c));
    if ((a & 0xfe00) === 0xfc00) return true;
    if ((a & 0xffc0) === 0xfe80) return true;
    if ((a & 0xffc0) === 0xfec0) return true;
    if ((a & 0xff00) === 0xff00) return true;
    return a === 0x2001 && b === 0xdb8;
}

/** Why an address can't be fetched, or null if it can be. */
export function urlProblem(url: URL): string | null {
    if (url.protocol !== "http:" && url.protocol !== "https:") return "Only web addresses work.";
    if (url.username || url.password) return "Addresses with a password can't be read.";
    if (!PORTS.has(url.port)) return "That address uses an unusual port.";
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (isIP(host) && isPrivateAddress(host)) return "That address isn't reachable from here.";
    if (/^localhost$|\.(?:localhost|local|internal)$/i.test(host)) {
        return "That address isn't reachable from here.";
    }
    return null;
}

type LookupCallback = (
    error: NodeJS.ErrnoException | null,
    address: string | LookupAddress[],
    family?: number,
) => void;

type Resolve = (
    host: string,
    options: { all: true },
    done: (error: NodeJS.ErrnoException | null, found: LookupAddress[]) => void,
) => void;

const resolveHost: Resolve = (host, options, done) => {
    lookup(host, options, done);
};

/** Refuses at connection time if a name resolves anywhere private. */
export function guardedLookup(
    host: string,
    options: { all?: boolean },
    callback: LookupCallback,
    resolve: Resolve = resolveHost,
): void {
    resolve(host, { all: true }, (error, found) => {
        if (error) {
            callback(error, []);
            return;
        }
        if (!found.length || found.some((entry) => isPrivateAddress(entry.address))) {
            callback(Object.assign(new Error("Private address"), { code: "EBLOCKED" }), []);
            return;
        }
        if (options.all) {
            callback(null, found);
            return;
        }
        const first = found[0];
        if (first) callback(null, first.address, first.family);
    });
}

export interface Fetched {
    status: number;
    type: string;
    location: string | null;
    bytes: Uint8Array;
}

/** One request, with no redirects followed and its size capped. Swappable in tests. */
export type GetOne = (url: URL, maxBytes: number, signal: AbortSignal) => Promise<Fetched>;

export const getOne: GetOne = (url, maxBytes, signal) =>
    new Promise((resolve, reject) => {
        const request = url.protocol === "https:" ? httpsRequest : httpRequest;
        const req = request(
            url,
            {
                method: "GET",
                lookup: guardedLookup as never,
                signal,
                headers: {
                    "user-agent": USER_AGENT,
                    accept: "text/html,text/plain;q=0.9,image/*;q=0.8",
                },
            },
            (res: IncomingMessage) => {
                const chunks: Buffer[] = [];
                let size = 0;
                const done = () => {
                    resolve({
                        status: res.statusCode ?? 0,
                        type: res.headers["content-type"] ?? "",
                        location: res.headers.location ?? null,
                        bytes: new Uint8Array(Buffer.concat(chunks).subarray(0, maxBytes)),
                    });
                };
                res.on("data", (chunk: Buffer) => {
                    chunks.push(chunk);
                    size += chunk.length;
                    if (size >= maxBytes) {
                        done();
                        res.destroy();
                    }
                });
                res.on("end", done);
                res.on("error", reject);
            },
        );
        req.on("error", reject);
        req.end();
    });

export type SafeFetch = (
    raw: string,
    maxBytes: number,
    signal: AbortSignal,
    get?: GetOne,
) => Promise<Fetched & { url: string }>;

/** Follows up to 3 redirects, checking each hop as if it were the first. */
export const safeFetch: SafeFetch = async (raw, maxBytes, signal, get = getOne) => {
    let url = new URL(raw);
    const limit = AbortSignal.any([signal, AbortSignal.timeout(TOTAL_MS)]);
    for (let hop = 0; ; hop += 1) {
        const problem = urlProblem(url);
        if (problem) throw new Error(problem);
        const answer = await get(url, maxBytes, limit);
        if (answer.status >= 300 && answer.status < 400) {
            if (!answer.location || hop >= MAX_REDIRECTS) {
                throw new Error("That address redirects too many times.");
            }
            url = new URL(answer.location, url);
            continue;
        }
        return { ...answer, url: url.href };
    }
};

const ENTITIES: Readonly<Record<string, string>> = {
    "&nbsp;": " ",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&amp;": "&",
};

/** The words a visitor would see. Comments, scripts and hidden elements stay out, since they're where instructions hide. */
export function htmlToText(html: string): string {
    return html
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<(script|style|noscript|svg|template|head|iframe|object)\b[\s\S]*?<\/\1>/gi, " ")
        .replace(
            /<(\w+)\b[^>]*(?:\bhidden\b|display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0|aria-hidden\s*=\s*["']?true)[^>]*>[\s\S]*?<\/\1>/gi,
            " ",
        )
        .replace(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi, " $1 ")
        .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article)[^>]*>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&(?:nbsp|lt|gt|quot|apos|amp|#39);/g, (entity) => ENTITIES[entity] ?? " ")
        .replace(/[ \t]+/g, " ")
        .replace(/ ?\n ?/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

/** Whether robots.txt lets anyone, or us by name, read this path. */
export function robotsAllow(robots: string, path: string): boolean {
    let applies = false;
    let inGroup = false;
    const rules: string[] = [];
    for (const raw of robots.split(/\r?\n/)) {
        const line = raw.split("#")[0]?.trim() ?? "";
        const at = line.indexOf(":");
        if (at < 0) continue;
        const field = line.slice(0, at).trim().toLowerCase();
        const value = line.slice(at + 1).trim();
        if (field === "user-agent") {
            if (!inGroup) applies = false;
            inGroup = true;
            applies ||= value === "*" || value.toLowerCase().includes("tondobot");
        } else {
            inGroup = false;
            if (field === "disallow" && applies && value) rules.push(value);
        }
    }
    return !rules.some((rule) => path.startsWith(rule.replace(/\*$/, "")));
}

export const READ_FAILED =
    "I couldn't read that page. It may block automated visits. Tell me what's on it, or paste the text here.";

export type PageRead =
    { ok: true; html: string; text: string; url: string } | { ok: false; error: string };

/** Reads a person's page: robots.txt first, then the page, text only. */
export async function readPage(
    raw: string,
    signal: AbortSignal,
    get: GetOne = getOne,
): Promise<PageRead> {
    if (!URL.canParse(raw)) return { ok: false, error: READ_FAILED };
    const url = new URL(raw);
    try {
        const robots = await safeFetch(new URL("/robots.txt", url).href, 200_000, signal, get);
        if (
            robots.status === 200 &&
            !robotsAllow(new TextDecoder().decode(robots.bytes), url.pathname)
        ) {
            return { ok: false, error: `${READ_FAILED} Its robots.txt asks not to be read.` };
        }
        const page = await safeFetch(raw, MAX_PAGE_BYTES, signal, get);
        if (page.status !== 200 || !/text\/html|text\/plain|xhtml/.test(page.type)) {
            return { ok: false, error: READ_FAILED };
        }
        const html = new TextDecoder().decode(page.bytes);
        const text = page.type.includes("plain") ? html.trim() : htmlToText(html);
        return text ? { ok: true, html, text, url: page.url } : { ok: false, error: READ_FAILED };
    } catch {
        return { ok: false, error: READ_FAILED };
    }
}

/** The URL has to be in what the person wrote, or on the same site as something they wrote. */
export function isInMessage(url: string, message: string): boolean {
    if (!URL.canParse(url)) return false;
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return message.toLowerCase().includes(host);
}
