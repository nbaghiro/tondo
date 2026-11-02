import { Resolver } from "node:dns/promises";

// The only file that knows who serves customer domains. See .docs/custom-domains.md.

export interface DomainRecord {
    type: "A" | "CNAME" | "TXT";
    name: string;
    value: string;
}

export interface Hosting {
    /** What the person sets at their registrar so the domain reaches us. */
    addressRecords: (shape: { apex: boolean; label: string }) => DomainRecord[];
    /** Safe to repeat. "held" means another account has this domain. */
    add: (host: string) => Promise<"added" | "held">;
    /** Asks the host to look again, and answers whether the domain reaches this service. */
    isReady: (host: string) => Promise<boolean>;
    remove: (host: string) => Promise<void>;
    /** The TXT records at this name. A name with none is an empty list. */
    readTxt: (name: string) => Promise<string[]>;
}

const API = "https://api.render.com/v1";
const APEX_IP = "216.24.57.1";

export function createRenderHosting({
    key,
    service,
    target,
    apiBase,
}: {
    key: string;
    service: string;
    /** The service's onrender.com name, which a CNAME points at. */
    target: string;
    /** A stand-in's address, in tests. */
    apiBase?: string | undefined;
}): Hosting {
    const domainsUrl = `${apiBase ? `${apiBase}/v1` : API}/services/${service}/custom-domains`;
    const call = (method: string, path = "", body?: object) =>
        fetch(`${domainsUrl}${path}`, {
            method,
            headers: {
                authorization: `Bearer ${key}`,
                accept: "application/json",
                ...(body ? { "content-type": "application/json" } : {}),
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
            signal: AbortSignal.timeout(10_000),
        });
    const named = (host: string) => `/${encodeURIComponent(host)}`;
    const refused = (what: string, status: number) =>
        new Error(`Render refused to ${what}: ${String(status)}`);
    const resolver = new Resolver({ timeout: 5000, tries: 2 });
    resolver.setServers(["1.1.1.1", "8.8.8.8"]);
    return {
        addressRecords: ({ apex, label }) =>
            apex
                ? [
                      { type: "A", name: "@", value: APEX_IP },
                      { type: "CNAME", name: "www", value: target },
                  ]
                : [{ type: "CNAME", name: label, value: target }],
        add: async (host) => {
            const found = await call("GET", named(host));
            if (found.ok) return "added";
            const made = await call("POST", "", { name: host });
            if (made.ok) return "added";
            if (made.status === 409) return "held";
            throw refused("add a domain", made.status);
        },
        isReady: async (host) => {
            const asked = await call("POST", `${named(host)}/verify`);
            if (!asked.ok) throw refused("check a domain", asked.status);
            const found = await call("GET", named(host));
            if (!found.ok) throw refused("read a domain", found.status);
            const { verificationStatus } = (await found.json()) as { verificationStatus?: string };
            return verificationStatus === "verified";
        },
        remove: async (host) => {
            const res = await call("DELETE", named(host));
            // Already gone is what was asked for.
            if (!res.ok && res.status !== 404) throw refused("remove a domain", res.status);
        },
        readTxt: async (name) => {
            if (apiBase) {
                const res = await fetch(`${apiBase}/dns/txt/${encodeURIComponent(name)}`);
                return (await res.json()) as string[];
            }
            const found = await resolver.resolveTxt(name).catch((error: unknown) => {
                const { code } = error as { code?: unknown };
                if (code === "ENOTFOUND" || code === "ENODATA") return [];
                throw error;
            });
            return found.map((parts) => parts.join(""));
        },
    };
}

/** Reads the environment. Null means customer domains are off here. Render sets the last two itself. */
export function hostingFromEnv(env: NodeJS.ProcessEnv): Hosting | null {
    const key = env["RENDER_API_KEY"];
    const service = env["RENDER_SERVICE_ID"];
    const target = env["RENDER_EXTERNAL_HOSTNAME"];
    if (!key || !service || !target) return null;
    return createRenderHosting({ key, service, target, apiBase: env["RENDER_API_BASE"] });
}
