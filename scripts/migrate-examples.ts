// Rewrites the example pages as ordinary saved pages at the current version, grouped into sections
// the way the builder groups them. It's safe to run again: pnpm examples:migrate
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PAGE_VERSION, pageSchema } from "@tondo/page";

const DIRECTORY = "apps/marketing/src/data/pages";

type Loose = Record<string, unknown>;
const listOf = (value: unknown) => (Array.isArray(value) ? (value as Loose[]) : []);
const isLink = (block: Loose) =>
    block["type"] === "button" ||
    (block["type"] === "link-card" &&
        (block["variant"] === "small" || block["variant"] === "icon"));

/** A title joins what follows it, and links of one style in a row are one section. */
function grouped(blocks: readonly Loose[]): Loose[] {
    let section = "";
    return blocks.map((block, i) => {
        const before = blocks[i - 1];
        const sameLinks =
            before &&
            isLink(before) &&
            isLink(block) &&
            before["type"] === block["type"] &&
            before["variant"] === block["variant"];
        if (before?.["type"] !== "heading" && !sameLinks) section = String(block["id"]);
        const { id, type, variant, section: _old, ...rest } = block;
        const tabs = listOf(rest["tabs"]).map((tab) => ({
            ...tab,
            blocks: grouped(listOf(tab["blocks"])),
        }));
        return {
            id,
            type,
            ...(variant === undefined ? {} : { variant }),
            section,
            ...rest,
            ...(type === "tabs" ? { tabs } : {}),
        };
    });
}

for (const file of readdirSync(DIRECTORY).sort()) {
    const path = join(DIRECTORY, file);
    const raw = JSON.parse(readFileSync(path, "utf8")) as Loose;
    const page = { ...raw, version: PAGE_VERSION, blocks: grouped(listOf(raw["blocks"])) };
    pageSchema.parse(page);
    writeFileSync(path, `${JSON.stringify(page, null, 4)}\n`);
}
process.stdout.write("Migrated the example pages.\n");
