import type { z } from "zod";
import { blockSchemaUnion, leafSchemaUnion } from "./blocks";
import { findBlock, setBlockField, setHeaderField } from "./operations";
import { headerSchema } from "./schema";
import type { Page } from "./schema";

// The editor's setters quietly keep the old value, which suits a text field. These say why, for
// anything that needs to correct itself.

export type Tried = { ok: true; page: Page } | { ok: false; error: string };

function reason(issue: z.core.$ZodIssue | undefined): string {
    if (!issue) return "That value isn't allowed.";
    const where = issue.path.filter((part) => typeof part === "string").join(".");
    if (issue.code === "too_big" && issue.origin === "string") {
        return `${where} is over its limit of ${String(issue.maximum)} characters. Shorten it.`;
    }
    if (issue.code === "too_big" && issue.origin === "array") {
        return `${where} can hold at most ${String(issue.maximum)}.`;
    }
    if (issue.code === "invalid_value") {
        return `${where} has to be one of: ${issue.values.join(", ")}.`;
    }
    if (issue.code === "unrecognized_keys") {
        return `This has no field called ${issue.keys.join(", ")}.`;
    }
    return `${where}: ${issue.message}`;
}

const isSame = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function tryBlockField(page: Page, id: string, key: string, value: unknown): Tried {
    const found = findBlock(page, id);
    if (!found) return { ok: false, error: `There's no block ${id}.` };
    const next = setBlockField(page, id, key, value);
    if (next !== page) return { ok: true, page: next };
    const schema = found.place ? leafSchemaUnion : blockSchemaUnion;
    const parsed = schema.safeParse({ ...found.block, [key]: value });
    if (parsed.success) {
        return isSame(found.block, parsed.data)
            ? { ok: true, page }
            : { ok: false, error: "That value isn't allowed." };
    }
    return { ok: false, error: reason(parsed.error.issues[0]) };
}

export function tryHeaderField(page: Page, key: string, value: unknown): Tried {
    const next = setHeaderField(page, key, value);
    if (next !== page) return { ok: true, page: next };
    const parsed = headerSchema.safeParse({ ...page.header, [key]: value });
    if (parsed.success) return { ok: true, page };
    return { ok: false, error: reason(parsed.error.issues[0]) };
}
