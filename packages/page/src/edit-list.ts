import { tryBlockField } from "./explain";
import type { Tried } from "./explain";
import { findBlock } from "./operations";
import type { MakeId } from "./operations";
import type { Page } from "./schema";

type Row = Readonly<Record<string, unknown>> & { id: string };

export interface ListEdit {
    add?: readonly { after?: string | undefined; values: Readonly<Record<string, unknown>> }[];
    update?: readonly { id: string; values: Readonly<Record<string, unknown>> }[];
    remove?: readonly string[];
    order?: readonly string[];
}

const isRow = (value: unknown): value is Row =>
    typeof value === "object" && value !== null && "id" in value && typeof value.id === "string";

/** Changes a block's list by row id, so nothing depends on where a row sits. New rows get new ids. */
export function editList(
    page: Page,
    blockId: string,
    list: string,
    edit: ListEdit,
    makeId: MakeId,
): Tried {
    const found = findBlock(page, blockId);
    if (!found) return { ok: false, error: `There's no block ${blockId}.` };
    const current = (found.block as Readonly<Record<string, unknown>>)[list];
    if (!Array.isArray(current) || !current.every(isRow)) {
        return { ok: false, error: `This block has no list called ${list}.` };
    }
    let rows: Row[] = current;
    const known = (id: string) => rows.some((row) => row.id === id);
    const missing = [...(edit.update ?? []).map((entry) => entry.id), ...(edit.remove ?? [])].find(
        (id) => !known(id),
    );
    if (missing) return { ok: false, error: `${list} has no row ${missing}.` };

    for (const { id, values } of edit.update ?? []) {
        rows = rows.map((row) => (row.id === id ? { ...row, ...values, id } : row));
    }
    if (edit.remove?.length) rows = rows.filter((row) => !edit.remove?.includes(row.id));
    for (const { after, values } of edit.add ?? []) {
        const at = after ? rows.findIndex((row) => row.id === after) + 1 : rows.length;
        const made = { ...values, id: makeId() };
        rows = [...rows.slice(0, at || rows.length), made, ...rows.slice(at || rows.length)];
    }
    if (edit.order?.length) {
        const placed = edit.order.flatMap((id) => rows.find((row) => row.id === id) ?? []);
        const left = rows.filter((row) => !edit.order?.includes(row.id));
        rows = [...placed, ...left];
    }
    return tryBlockField(page, blockId, list, rows);
}
