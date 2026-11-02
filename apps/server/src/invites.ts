import { createHmac, timingSafeEqual } from "node:crypto";
import { INVITE_DAYS } from "@tondo/page";

export type Invite =
    | { kind: "join"; team: string; madeAt: number; until: number; page: string | null }
    | { kind: "takeover"; team: string; madeAt: number; until: number; page: string };

export interface Invites {
    make: (
        invite:
            | { kind: "join"; team: string; page: string | null }
            | { kind: "takeover"; team: string; page: string },
    ) => { token: string; until: number };
    /** Null if it's altered, malformed or past its date. */
    read: (token: string) => Invite | null;
}

const isInvite = (value: unknown): value is Invite => {
    if (typeof value !== "object" || value === null) return false;
    const { kind, team, madeAt, until, page } = value as Record<string, unknown>;
    if (typeof team !== "string" || typeof madeAt !== "number" || typeof until !== "number") {
        return false;
    }
    if (kind === "join") return page === null || typeof page === "string";
    return kind === "takeover" && typeof page === "string";
};

// A link stores nothing, so what it says is signed. The key is made from the sign-in secret and can't
// be used for anything else.
export function createInvites(secret: string, now: () => number = Date.now): Invites {
    const key = createHmac("sha256", secret).update("tondo invitations").digest();
    const sign = (payload: string) => createHmac("sha256", key).update(payload).digest();
    return {
        make: (invite) => {
            const madeAt = now();
            const until = madeAt + INVITE_DAYS * 86_400_000;
            const payload = Buffer.from(JSON.stringify({ ...invite, madeAt, until })).toString(
                "base64url",
            );
            return { token: `${payload}.${sign(payload).toString("base64url")}`, until };
        },
        read: (token) => {
            const [payload, signature, extra] = token.split(".");
            if (!payload || !signature || extra !== undefined) return null;
            const given = Buffer.from(signature, "base64url");
            const expected = sign(payload);
            if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
            const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString());
            return isInvite(parsed) && parsed.until > now() ? parsed : null;
        },
    };
}
