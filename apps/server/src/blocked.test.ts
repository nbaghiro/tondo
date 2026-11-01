import { samplePage } from "@tondo/page";
import type { Page } from "@tondo/page";
import { describe, expect, it } from "vitest";
import { blockedIssues, isBlockedLink } from "./blocked";

const BAD = ["bad.example"];
const withText = (text: string): Page => ({
    ...samplePage,
    blocks: [{ id: "a", type: "text", variant: "plain", section: "a", text }],
});

describe("blocked links", () => {
    it.each([
        "Go to https://bad.example/win now",
        "Go to bad.example.",
        "(see www.bad.example/win), thanks",
        "Mail win@bad.example",
    ])("finds one in a sentence: %s", (text) => {
        const [issue] = blockedIssues(withText(text), BAD);
        expect(issue?.target).toBe("a");
        expect(issue?.message).toContain("bad.example");
    });

    it("leaves ordinary sentences and other sites alone", () => {
        const page = withText("Not bad, example: see good.example and notbad.example today.");
        expect(blockedIssues(page, BAD)).toEqual([]);
    });

    it("still reads a whole link", () => {
        expect(isBlockedLink("http://BAD.example.:80/x", BAD)).toBe(true);
    });
});
