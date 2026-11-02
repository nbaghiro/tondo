// A stand-in for the parts of Render's API Tondo uses, on the Neon stand-in's port, and for DNS, which
// the tests set through /render-control. The real client talks to it, so no test mode is in the app.
import type { ServerResponse } from "node:http";

const domains = new Map<string, { verified: boolean }>();
const txt = new Map<string, string[]>();
const pointed = new Set<string>();
/** Domains another Render account holds. */
const held = new Set<string>();

const json = (res: ServerResponse, status: number, body?: unknown) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(body === undefined ? undefined : JSON.stringify(body));
};
const view = (name: string, verified: boolean) => ({
    id: `cdm-${name}`,
    name,
    verificationStatus: verified ? "verified" : "unverified",
});

/** Answers if this path is Render's. */
export function renderStandIn(
    method: string,
    url: string,
    headers: Record<string, string | string[] | undefined>,
    raw: string,
    res: ServerResponse,
): boolean {
    const { pathname, searchParams } = new URL(url, "http://stand-in");
    if (pathname.startsWith("/dns/txt/")) {
        json(res, 200, txt.get(decodeURIComponent(pathname.split("/")[3] ?? "")) ?? []);
        return true;
    }
    if (pathname === "/render-control/dns") {
        const name = searchParams.get("host") ?? "";
        const code = searchParams.get("txt");
        if (code) txt.set(`_tondo.${name}`, [code]);
        if (searchParams.has("cleartxt")) txt.delete(`_tondo.${name}`);
        if (searchParams.has("points")) pointed.add(name);
        if (searchParams.has("held")) held.add(name);
        json(res, 200, { ok: true, added: domains.has(name) });
        return true;
    }
    const match = /^\/v1\/services\/[^/]+\/custom-domains(?:\/([^/]+))?(\/verify)?$/.exec(pathname);
    if (!match) return false;
    if (headers["authorization"] !== "Bearer rnd_stand_in") {
        json(res, 401, { message: "Unauthorized" });
        return true;
    }
    const name = decodeURIComponent(match[1] ?? "");
    const found = domains.get(name);
    if (!name && method === "POST") {
        const asked = (JSON.parse(raw) as { name: string }).name;
        if (held.has(asked) || domains.has(asked)) {
            json(res, 409, { message: "Already in use." });
            return true;
        }
        domains.set(asked, { verified: false });
        json(res, 201, [view(asked, false)]);
        return true;
    }
    if (!found) {
        json(res, 404, { message: "Not found." });
        return true;
    }
    if (match[2] && method === "POST") {
        found.verified = pointed.has(name);
        json(res, 202);
    } else if (method === "GET") {
        json(res, 200, view(name, found.verified));
    } else if (method === "DELETE") {
        domains.delete(name);
        json(res, 204);
    } else {
        json(res, 400, { message: "Bad request." });
    }
    return true;
}
