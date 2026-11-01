import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const tokens = read("packages/brand/styles/tokens.css");
const shell = read("apps/editor/src/styles/shell.css");
const builder = read("apps/editor/src/styles/builder.css");

function token(css: string, name: string): string {
    const value = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i").exec(css)?.[1];
    if (!value) throw new Error(`No --${name} found`);
    return value;
}

function luminance(hex: string): number {
    const channels = [1, 3, 5].map((start) => {
        const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0);
}

function contrast(a: string, b: string): number {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

describe("Porcelain text contrast", () => {
    const paper = token(tokens, "paper");
    const surfaces = {
        paper,
        band: token(tokens, "band"),
        hover: token(shell, "hover"),
        on: token(shell, "on"),
    };
    const text = {
        ink: token(tokens, "ink"),
        soft: token(tokens, "soft"),
        faint: token(tokens, "faint"),
        madder: token(tokens, "madder"),
        bad: token(shell, "bad"),
        warn: token(shell, "warn"),
        amber: token(builder, "amber"),
    };

    for (const [textName, colour] of Object.entries(text)) {
        for (const [surfaceName, surface] of Object.entries(surfaces)) {
            it(`${textName} on ${surfaceName} is at least 4.5:1`, () => {
                expect(contrast(colour, surface)).toBeGreaterThanOrEqual(4.5);
            });
        }
    }

    it("white on the ink and madder buttons is at least 4.5:1", () => {
        expect(contrast("#ffffff", text.ink)).toBeGreaterThanOrEqual(4.5);
        expect(contrast("#ffffff", text.madder)).toBeGreaterThanOrEqual(4.5);
    });
});
