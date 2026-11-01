import type { Block } from "./blocks";
import { liveContent } from "./sample-content";
import type { Page } from "./schema";
import { findSection, sectionsOf } from "./sections";
import type { Section } from "./sections";

// What the model reads: the page as compact text, with short ids that last for one turn. Short ids
// save tokens and can't be mistyped into some other real id.

const LONG_PAGE = 30_000;

/** Fields the model has no use for. Photos are shown only as being there or not. */
const SKIP = new Set(["id", "type", "variant", "section"]);
const PHOTO_KEYS = new Set(["photo", "cover", "logo", "bgPhoto"]);

export interface ShortIds {
    short: (kind: "s" | "b" | "i" | "h", real: string) => string;
    real: (short: string) => string | undefined;
}

export function createShortIds(): ShortIds {
    const toShort = new Map<string, string>();
    const toReal = new Map<string, string>();
    const counts: Record<string, number> = {};
    return {
        short(kind, real) {
            const key = `${kind}:${real}`;
            const known = toShort.get(key);
            if (known) return known;
            counts[kind] = (counts[kind] ?? 0) + 1;
            const made = `${kind}${String(counts[kind])}`;
            toShort.set(key, made);
            toReal.set(made, real);
            return made;
        },
        real: (short) => toReal.get(short.trim()),
    };
}

/** Keeps anything in a person's text from closing the tags around it. */
export const inert = (text: string): string => text.replace(/<(\/?)(?=[a-z_]+>)/gi, "‹$1");

const quoted = (value: string) => `"${inert(value).replace(/\s*\n\s*/g, " / ")}"`;

type Values = Readonly<Record<string, unknown>>;

function fieldsOf(values: Values, live: Values | undefined, skip: ReadonlySet<string>): string {
    return Object.entries(values)
        .flatMap(([key, value]) => {
            if (skip.has(key) || value === undefined) return [];
            if (PHOTO_KEYS.has(key)) return [`${key}=yes`];
            if (key === "photos" && Array.isArray(value)) {
                return [`photos=${String(value.length)}`];
            }
            if (typeof value === "string") {
                if (!value) return [];
                const sample = live && live[key] !== value ? " [sample]" : "";
                return [`${key}=${quoted(value)}${sample}`];
            }
            if (typeof value === "number" || typeof value === "boolean") {
                return [`${key}=${String(value)}`];
            }
            return [];
        })
        .join(" ");
}

function liveBlocks(page: Page): Map<string, Block> {
    const map = new Map<string, Block>();
    const walk = (blocks: readonly Block[]) => {
        for (const block of blocks) {
            map.set(block.id, block);
            if (block.type === "tabs") for (const tab of block.tabs) walk(tab.blocks);
        }
    };
    walk(page.blocks);
    return map;
}

function blockLines(
    block: Block,
    ids: ShortIds,
    live: Map<string, Block>,
    indent: string,
): string[] {
    const mine = live.get(block.id) as Values | undefined;
    const values = block as Values;
    const lists = Object.entries(values).filter(
        ([key, value]) => Array.isArray(value) && key !== "photos" && key !== "tabs",
    );
    const head = `${indent}${ids.short("b", block.id)} ${block.type} ${block.variant}${mine ? "" : " [sample]"}`;
    const own = fieldsOf(values, mine, SKIP);
    const lines = [own ? `${head}: ${own}` : head];
    for (const [key, list] of lists) {
        const liveRows = mine?.[key];
        lines.push(`${indent}  ${key}:`);
        for (const row of list as Values[]) {
            if (typeof row !== "object") continue;
            const id = typeof row["id"] === "string" ? row["id"] : "";
            const liveRow = Array.isArray(liveRows)
                ? (liveRows as Values[]).find((other) => other["id"] === id)
                : undefined;
            const text = fieldsOf(row, mine && (liveRow ?? {}), SKIP);
            lines.push(
                `${indent}    ${ids.short("i", id)} ${text}${mine && !liveRow ? " [sample]" : ""}`,
            );
        }
    }
    if (block.type === "tabs") {
        for (const tab of block.tabs) {
            lines.push(`${indent}  tab ${ids.short("i", tab.id)} ${quoted(tab.label)}`);
            for (const section of sectionsOf(tab.blocks)) {
                lines.push(...sectionLines(section, ids, live, `${indent}    `));
            }
        }
    }
    return lines;
}

function sectionLines(
    section: Section,
    ids: ShortIds,
    live: Map<string, Block>,
    indent = "",
): string[] {
    const title = section.title ? ` title ${quoted(section.title.text)}` : "";
    const flags = [
        section.blocks[0]?.hidden ? " hidden" : "",
        section.blocks[0]?.tint ? " tint" : "",
    ];
    return [
        `${indent}${ids.short("s", section.id)} ${section.definition.key} "${section.definition.name}" style ${section.style.id}${title}${flags.join("")}`,
        ...section.blocks.flatMap((block) => blockLines(block, ids, live, `${indent}  `)),
    ];
}

function headerLines(page: Page, ids: ShortIds): string[] {
    const { header, look, paint, seed, style } = page;
    const parts = [
        `layout ${header.layout}`,
        `wordmark ${header.wordmark ?? "none"}`,
        `name ${quoted(header.name)}`,
        `tagline ${quoted(header.tagline ?? "")}`,
        `bio ${quoted(header.bio ?? "")}`,
        `photo ${header.photo ? "yes" : "none"}`,
        ...(header.buttonText ? [`button ${quoted(header.buttonText)}`] : []),
        ...(header.buttonUrl ? [`buttonUrl ${quoted(header.buttonUrl)}`] : []),
    ];
    const choices = Object.entries(style ?? {}).map(
        ([key, value]) => `${key} ${typeof value === "object" ? JSON.stringify(value) : value}`,
    );
    return [
        `look: ${look}. style: ${choices.join(", ") || "the look's own"}.${paint ? ` paint: ${paint.join(" ")}.` : ""}${seed ? ` seed: ${String(seed)}.` : ""}`,
        ...(page.title || page.description
            ? [
                  `share title ${quoted(page.title ?? "")}, description ${quoted(page.description ?? "")}`,
              ]
            : []),
        `header: ${parts.join(", ")}`,
        `links: ${
            header.links
                .map((link) => `${ids.short("h", link.id)} ${link.type} ${quoted(link.value)}`)
                .join(", ") || "none"
        }`,
    ];
}

export interface Digest {
    text: string;
    /** True when some sections show only their names, and read_section fetches the rest. */
    map: boolean;
}

/** The page for the model. Never includes `unreadable`, upload paths or anything about visits. */
export function digestPage(page: Page, ids: ShortIds, selected?: string | null): Digest {
    const live = liveBlocks(liveContent(page).page);
    const sections = sectionsOf(page.blocks);
    const full = [
        ...headerLines(page, ids),
        ...sections.flatMap((section) => sectionLines(section, ids, live)),
    ].join("\n");
    if (full.length <= LONG_PAGE) return { text: full, map: false };
    const chosen = selected ? findSection(page, selected)?.section.id : undefined;
    return {
        map: true,
        text: [
            ...headerLines(page, ids),
            "This page is long, so most sections show only their names. Use read_section for the rest.",
            ...sections.flatMap((section) =>
                section.id === chosen
                    ? sectionLines(section, ids, live)
                    : [
                          `${ids.short("s", section.id)} ${section.definition.key} "${section.definition.name}" style ${section.style.id}`,
                      ],
            ),
        ].join("\n"),
    };
}

/** One section's lines, for read_section and to show the model what it just added. */
export function digestSection(page: Page, id: string, ids: ShortIds): string | null {
    const found = findSection(page, id);
    if (!found) return null;
    return sectionLines(found.section, ids, liveBlocks(liveContent(page).page)).join("\n");
}
