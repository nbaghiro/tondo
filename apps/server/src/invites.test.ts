import { describe, expect, it } from "vitest";
import { createInvites } from "./invites";

const join = { kind: "join", team: "team-1", page: null } as const;

describe("invitation links", () => {
    it("reads back what it made", () => {
        const invites = createInvites("secret", () => 1000);
        const { token, until } = invites.make(join);
        expect(until).toBe(1000 + 7 * 86_400_000);
        expect(invites.read(token)).toEqual({ ...join, madeAt: 1000, until });
    });

    it("stops at its end date", () => {
        let now = 1000;
        const invites = createInvites("secret", () => now);
        const { token, until } = invites.make(join);
        now = until - 1;
        expect(invites.read(token)).not.toBeNull();
        now = until;
        expect(invites.read(token)).toBeNull();
    });

    it("refuses anything altered or signed with another secret", () => {
        const invites = createInvites("secret");
        const { token } = invites.make(join);
        const [payload = "", signature = ""] = token.split(".");
        const other = Buffer.from(JSON.stringify({ ...join, team: "team-2" })).toString(
            "base64url",
        );
        expect(invites.read(`${other}.${signature}`)).toBeNull();
        expect(invites.read(`${payload}.${signature}x`)).toBeNull();
        expect(invites.read(payload)).toBeNull();
        expect(invites.read("")).toBeNull();
        expect(createInvites("another").read(token)).toBeNull();
    });

    it("tells a takeover from a join", () => {
        const invites = createInvites("secret");
        const { token } = invites.make({ kind: "takeover", team: "team-1", page: "p" });
        expect(invites.read(token)?.kind).toBe("takeover");
    });
});
