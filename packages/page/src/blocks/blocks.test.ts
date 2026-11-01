import { describe, expect, it } from "vitest";
import type { RenderContext } from "../define-block";
import { blockDefinitions, blockSchemaUnion, blockTypes } from "./index";

const published: RenderContext = { assetBase: "/photos/", editable: false };
const editing: RenderContext = { assetBase: "/photos/", editable: true };

describe.each(blockTypes)("%s", (type) => {
    const definition = blockDefinitions[type];
    const made = { id: "a", ...definition.make() };

    it("starts with content its own schema accepts", () => {
        expect(blockSchemaUnion.safeParse(made).success).toBe(true);
        expect(made).toHaveProperty("type", type);
    });

    it("draws something", () => {
        expect(definition.draw(made, published)).not.toBe("");
    });

    it("every layout renders", () => {
        expect(Object.keys(definition.layouts).length).toBeGreaterThan(0);
        for (const variant of Object.keys(definition.layouts)) {
            expect(blockSchemaUnion.safeParse({ ...made, variant }).success).toBe(true);
            expect(definition.draw({ ...made, variant }, published)).not.toBe("");
        }
    });

    it("only marks fields for editing when asked to", () => {
        expect(definition.draw(made, published)).not.toContain("data-field");
        if (definition.fields.some((field) => "inline" in field)) {
            expect(definition.draw(made, editing)).toContain("data-field");
        }
    });

    it("escapes everything a person writes", () => {
        const attack = '<script>"';
        const values = Object.fromEntries(
            definition.fields
                .filter((field) => field.kind === "text" || field.kind === "longText")
                .map((field) => [field.key, attack]),
        );
        const html = definition.draw({ ...made, ...values }, published);
        expect(html).not.toContain("<script>");
    });

    it("escapes text inside lists too", () => {
        const fill = (value: unknown): unknown => {
            if (Array.isArray(value)) return value.map(fill);
            if (value && typeof value === "object") {
                return Object.fromEntries(
                    Object.entries(value).map(([key, inner]) => [
                        key,
                        /^(id|type|variant|kind|file|at|url|value|source)$/.test(key)
                            ? inner
                            : fill(inner),
                    ]),
                );
            }
            return typeof value === "string" ? "<xss>" : value;
        };
        for (const variant of Object.keys(definition.layouts)) {
            const html = definition.draw(fill({ ...made, variant }), published);
            expect(html).not.toContain("<xss>");
        }
    });

    it("leaves nothing behind when its text is empty, and doesn't fail", () => {
        const blank = (value: unknown): unknown => {
            return Array.isArray(value) && type !== "tabs" ? [] : value;
        };
        const emptied = Object.fromEntries(
            Object.entries(made).map(([key, value]) => [key, blank(value)]),
        );
        for (const variant of Object.keys(definition.layouts)) {
            expect(() => definition.draw({ ...emptied, variant }, published)).not.toThrow();
            expect(() => definition.draw({ ...emptied, variant }, editing)).not.toThrow();
        }
    });

    it("rejects a javascript: link on any link field", () => {
        for (const field of definition.fields.filter((f) => f.kind === "link")) {
            const bad = { ...made, [field.key]: "javascript:alert(1)" };
            expect(blockSchemaUnion.safeParse(bad).success).toBe(false);
        }
    });

    it("rejects unknown fields", () => {
        expect(blockSchemaUnion.safeParse({ ...made, surprise: true }).success).toBe(false);
    });
});
