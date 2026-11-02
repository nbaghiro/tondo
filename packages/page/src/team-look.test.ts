import { describe, expect, it } from "vitest";
import { sameTeamLook, teamLookOf, withTeamLook } from "./team-look";
import { starterPage } from "./index";
import type { Page } from "./index";

const own: Page = {
    ...starterPage("Rae Bell"),
    look: "madder",
    seed: 7,
    paint: ["#112233"],
    style: { fill: "soft" },
};
const team: Page = { ...starterPage("Aster & Bell"), look: "sap", seed: 9 };

describe("the team's look", () => {
    it("replaces what's shared and keeps what's the person's", () => {
        const merged = withTeamLook(own, teamLookOf(team));
        expect(merged.look).toBe("sap");
        expect(merged.header.name).toBe("Rae Bell");
        expect(merged.seed).toBe(7);
        expect(merged.blocks).toEqual(own.blocks);
    });

    it("removes the person's colours when the team has none", () => {
        const merged = withTeamLook(own, teamLookOf(team));
        expect(merged.paint).toBeUndefined();
        expect(merged.style).toBeUndefined();
    });

    it("leaves the page alone with no team look, and doesn't change what it's given", () => {
        expect(withTeamLook(own, null)).toBe(own);
        withTeamLook(own, teamLookOf(team));
        expect(own.look).toBe("madder");
        expect(own.paint).toEqual(["#112233"]);
    });

    it("tells whether two looks are the same", () => {
        expect(sameTeamLook(own, { ...own, look: "madder" })).toBe(true);
        expect(sameTeamLook(teamLookOf(own), teamLookOf(team))).toBe(false);
    });
});
