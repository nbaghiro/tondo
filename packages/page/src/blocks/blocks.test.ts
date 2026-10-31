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

    it("has a label for every variant", () => {
        expect(Object.keys(definition.variantLabels).length).toBeGreaterThan(0);
    });

    it("every field exists on the block", () => {
        for (const field of definition.fields) expect(made).toHaveProperty(field.key);
    });

    it("only marks fields for editing when asked to", () => {
        expect(definition.draw(made, published)).not.toContain("data-field");
        expect(definition.draw(made, editing)).toContain("data-field");
    });

    it("escapes everything a person writes", () => {
        const attack = '<script>alert(1)</script>"';
        const values = Object.fromEntries(
            definition.fields
                .filter((field) => field.kind === "text" || field.kind === "longText")
                .map((field) => [field.key, attack]),
        );
        const html = definition.draw({ ...made, ...values }, published);
        expect(html).not.toContain("<script>");
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
