import { z } from "zod";
import { addFromLink } from "./add-link";
import { blockDefinitions, blockSchemaUnion } from "./blocks";
import type { Block } from "./blocks";
import { checkClaim, claimKind } from "./assistant-facts";
import type { Evidence } from "./assistant-facts";
import { digestSection } from "./assistant-digest";
import type { ShortIds } from "./assistant-digest";
import { editList, editRows } from "./edit-list";
import { tryBlockField, tryHeaderField } from "./explain";
import type { Field, ListField } from "./fields";
import { addBlock, findBlock, MAX_HIGHLIGHTS, removeBlock } from "./operations";
import type { MakeId } from "./operations";
import { resetStyle, setLook, setPageText, setPaint, setSeed, setStyle } from "./page-settings";
import { fontPairs, lookNameSchema, pageSchema, PAGE_VERSION } from "./schema";
import type { Header, Page, PageStyle } from "./schema";
import { liveContent } from "./sample-content";
import {
    addSection,
    duplicateSection,
    findSection,
    makeSection,
    moveSection,
    removeSection,
    sectionAvailable,
    sectionDefinition,
    sectionDefinitions,
    sectionsOf,
    setSectionBigTitle,
    setSectionShared,
    setSectionStyle,
    setSectionTitle,
    styleAvailable,
} from "./sections";

// The only way the model changes anything. Each tool takes small generic shapes, and the real checks
// are the same zod schemas a manual edit passes through. Nothing here can publish: that's an offer,
// and only the person's tap acts on it.

const scalar = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const values = z.record(z.string(), scalar);
const sectionShape = {
    key: z.string().describe("A section key from the catalogue"),
    style: z.string().optional().describe("A style id of that section"),
    title: z.string().optional(),
    fields: values.optional().describe("Values for the section's main block"),
    rows: z.array(values).max(30).optional().describe("Rows of its list, or one per link"),
};
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const styleShape = {
    colour: z
        .strictObject({ mode: z.enum(["preset", "brand", "plain", "dark"]), brand: hex.optional() })
        .optional(),
    font: z.enum(fontPairs).optional(),
    shape: z.enum(["square", "soft", "round"]).optional(),
    fill: z.enum(["filled", "outline", "soft", "rows", "card", "lead"]).optional(),
    bg: z.enum(["solid", "gradient"]).optional(),
    reset: z.boolean().optional().describe("Goes back to the look's own choices"),
};

export const toolInputs = {
    read_section: z.strictObject({ section: z.string() }),
    add_section: z.strictObject({
        ...sectionShape,
        after: z.string().optional().describe('A section id, or "top". Left out means the end'),
        tab: z.string().optional().describe("A tab id, to add inside that tab"),
    }),
    move_section: z.strictObject({
        section: z.string(),
        after: z.string().describe('A section id, or "top"'),
    }),
    remove_section: z.strictObject({
        sections: z.array(z.string()).min(1).describe("Every section to remove, in one call"),
    }),
    duplicate_section: z.strictObject({ section: z.string() }),
    set_section: z.strictObject({
        section: z.string(),
        style: z.string().optional(),
        title: z.string().optional(),
        big_title: z.boolean().optional(),
        hidden: z.boolean().optional(),
        tint: z.boolean().optional(),
        show_from: z.string().optional().describe("UTC instant. Empty clears it"),
        show_until: z.string().optional().describe("UTC instant. Empty clears it"),
    }),
    set_fields: z.strictObject({
        target: z.string().describe('A block id, or "header"'),
        values,
    }),
    edit_list: z.strictObject({
        block: z.string().describe('A block id, or "header" for its links'),
        list: z.string().describe("items, hours, tracks, links or tabs"),
        add: z
            .array(z.strictObject({ after: z.string().optional(), values }))
            .max(30)
            .optional(),
        update: z
            .array(z.strictObject({ id: z.string(), values }))
            .max(30)
            .optional(),
        remove: z.array(z.string()).max(30).optional(),
        order: z.array(z.string()).max(30).optional(),
    }),
    remove_link: z.strictObject({ block: z.string().describe("One link in a Links section") }),
    add_link: z.strictObject({ url: z.string(), text: z.string().optional() }),
    set_look: z.strictObject({ look: lookNameSchema }),
    set_style: z.strictObject(styleShape),
    set_art: z.strictObject({
        paint: z.array(hex).min(1).max(6).optional(),
        new_painting: z.boolean().optional(),
    }),
    set_page_text: z.strictObject({
        title: z.string().optional(),
        description: z.string().optional(),
    }),
    build_page: z.strictObject({
        name: z.string(),
        tagline: z.string().optional(),
        bio: z.string().optional(),
        links: z.array(z.string()).max(12).optional().describe("Addresses the person gave"),
        look: lookNameSchema,
        wordmark: z.enum(["bubble", "poster", "script", "paint", "seal"]).optional(),
        font: z.enum(fontPairs).optional(),
        sections: z.array(z.strictObject(sectionShape)).max(8),
    }),
    read_website: z.strictObject({ url: z.string() }),
    find_photos: z.strictObject({
        query: z.string().max(100),
        for: z.string().describe('"header", "background", a block id or a row id'),
    }),
    make_image: z.strictObject({
        prompt: z.string().max(400),
        kind: z.enum(["photo", "logo", "art"]),
        for: z.string().describe('"header", "background", a block id or a row id'),
    }),
    offer_choices: z.strictObject({
        question: z.string().max(200),
        options: z.array(z.string().max(60)).min(2).max(5),
    }),
    request_publish: z.strictObject({}),
} as const;

export type ToolName = keyof typeof toolInputs;
export const toolNames = Object.keys(toolInputs) as ToolName[];

/** "apply" runs straight away on the working copy. "offer" only shows a card for the person's tap. */
export const toolLevels: Readonly<Record<ToolName, "apply" | "offer">> = {
    read_section: "apply",
    add_section: "apply",
    move_section: "apply",
    remove_section: "apply",
    duplicate_section: "apply",
    set_section: "apply",
    set_fields: "apply",
    edit_list: "apply",
    remove_link: "apply",
    add_link: "apply",
    set_look: "apply",
    set_style: "apply",
    set_art: "apply",
    set_page_text: "apply",
    build_page: "apply",
    read_website: "apply",
    find_photos: "offer",
    make_image: "offer",
    offer_choices: "offer",
    request_publish: "offer",
};

const DESCRIPTIONS: Readonly<Record<ToolName, string>> = {
    read_section: "Read one section in full. Only needed when the page was sent as a map.",
    add_section:
        "Add a section. With no fields or rows it keeps its sample words, which stay off the live page.",
    move_section: "Move a section to just below another, or to the top.",
    remove_section: "Remove sections. Two or more at once asks the person first.",
    duplicate_section: "Copy a section to just below itself.",
    set_section: "Change a section's style, title, visibility, band or schedule.",
    set_fields: "Set fields on a block or the header, including layout through 'variant'.",
    edit_list: "Add, change, remove or reorder rows in a block's list, by row id.",
    remove_link: "Remove one link from a Links section.",
    add_link: "Add a pasted address, placing it in the section it belongs in.",
    set_look: "Change the whole look. Keeps a brand colour and drops other style choices.",
    set_style: "Change colour, font, corners, button fill or background.",
    set_art: "Change the painted art's colours, or paint a new one.",
    set_page_text: "Set what shows in browser tabs and when the link is shared.",
    build_page:
        "Build a whole page from what the person said. On a page with content, it asks first.",
    read_website: "Read the person's own website. The address has to be in their message.",
    find_photos: "Search stock photos and show the person some to pick from.",
    make_image:
        "Offer to generate an image. It shows the cost and spends nothing until the person agrees.",
    offer_choices: "Ask the person to choose between a few options. Ends the turn.",
    request_publish: "Show a button that opens the publish check. You can't publish yourself.",
};

export interface ToolDeclaration {
    name: string;
    description: string;
    parametersJsonSchema: object;
}

/** The same bytes every time, so the start of each request can be cached. */
export function toolDeclarations(): ToolDeclaration[] {
    return toolNames.map((name) => {
        const { $schema: _schema, ...schema } = z.toJSONSchema(toolInputs[name]);
        return { name, description: DESCRIPTIONS[name], parametersJsonSchema: schema };
    });
}

/** Things that need the person's tap. The browser acts on them with the same functions. */
export type Offer =
    | { type: "choice"; question: string; options: string[] }
    | { type: "publish" }
    | { type: "remove"; sections: { id: string; name: string }[] }
    | { type: "replace"; page: Page };

export interface ToolContext {
    ids: ShortIds;
    makeId: MakeId;
    /** Null turns off the facts guard, which only the eval does, to measure the model alone. */
    evidence: Evidence | null;
    isBlocked: (url: string) => boolean;
    /** Sections removed so far this turn. A second one needs the person's agreement. */
    removed: number;
    /** Credits left, since building a page costs more than an edit. */
    creditsLeft: number;
    setupCredits: number;
}

export type ToolResult =
    | {
          ok: true;
          page: Page;
          /** For the person. What actually happened, in the words shown under the reply. */
          summary: string;
          /** For the model, when it needs more than the summary. */
          detail?: string;
          offer?: Offer;
          removed?: number;
          setup?: boolean;
      }
    | { ok: false; error: string };

const fail = (error: string): ToolResult => ({ ok: false, error });

const noSection = (key: string) =>
    `There's no section called ${key}. Sections: ${sectionDefinitions
        .filter(sectionAvailable)
        .map((definition) => definition.key)
        .join(", ")}.`;

const NOT_YOURS = new Set([
    "id",
    "type",
    "section",
    "source",
    "count",
    "kind",
    "progress",
    "slots",
]);
const PHOTO_KINDS = new Set<Field["kind"]>(["photo", "photoList", "file"]);

function sectionChoices(page: Page, ids: ShortIds): string {
    const list = sectionsOf(page.blocks).map(
        (section) => `${ids.short("s", section.id)} ${section.definition.name}`,
    );
    return list.length ? `Sections: ${list.join(", ")}.` : "The page has no sections yet.";
}

const missingId = (page: Page, ids: ShortIds, id: string) =>
    fail(`No section ${id}. ${sectionChoices(page, ids)}`);

function findField(fields: readonly Field[], key: string): Field | undefined {
    return fields.find((field) => field.key === key);
}

/** Refuses a value the person hasn't given, or a link Tondo doesn't allow. */
function checked(ctx: ToolContext, owner: string, path: string, value: unknown): string | null {
    if (typeof value !== "string") return null;
    const kind = claimKind(owner, path);
    if (kind === "link" && value && ctx.isBlocked(value))
        return "That link can't be used on Tondo.";
    return ctx.evidence ? checkClaim(kind, value, ctx.evidence) : null;
}

function checkValues(
    ctx: ToolContext,
    owner: string,
    prefix: string,
    fields: readonly Field[],
    given: Readonly<Record<string, unknown>>,
): string | null {
    for (const [key, value] of Object.entries(given)) {
        if (NOT_YOURS.has(key)) return `${key} is set by Tondo, so you can't change it.`;
        const field = findField(fields, key);
        if (field && PHOTO_KINDS.has(field.kind)) {
            return `${key} holds a photo. Use find_photos or make_image, or ask the person to upload one.`;
        }
        const problem = checked(ctx, owner, `${prefix}${key}`, value);
        if (problem) return `${key}: ${problem}`;
    }
    return null;
}

/** Null values mean "clear this". */
const cleaned = (given: Readonly<Record<string, unknown>>) =>
    Object.fromEntries(
        Object.entries(given).map(([key, value]) => [key, value === null ? "" : value]),
    );

function applyFields(
    start: Page,
    block: Block,
    given: Readonly<Record<string, unknown>>,
    ctx: ToolContext,
): { ok: true; page: Page } | { ok: false; error: string } {
    const definition = blockDefinitions[block.type];
    if (definition.held) return { ok: false, error: `${definition.name} isn't available yet.` };
    const problem = checkValues(ctx, block.type, "", definition.fields, given);
    if (problem) return { ok: false, error: problem };
    let page = start;
    for (const [key, raw] of Object.entries(cleaned(given))) {
        if (key === "variant") {
            const layout = typeof raw === "string" ? definition.layouts[raw] : undefined;
            if (!layout) {
                const known = Object.keys(definition.layouts).join(", ");
                return { ok: false, error: `variant has to be one of: ${known}.` };
            }
            if (layout.held)
                return { ok: false, error: `The ${layout.label} layout isn't available yet.` };
        }
        if (key === "highlight" && raw === true) {
            const count = sectionsOf(page.blocks)
                .flatMap((section) => section.blocks)
                .filter((other) => other.highlight).length;
            if (count >= MAX_HIGHLIGHTS) {
                return {
                    ok: false,
                    error: `A page can have at most ${String(MAX_HIGHLIGHTS)} highlights.`,
                };
            }
        }
        const done = tryBlockField(page, block.id, key, raw);
        if (!done.ok) return done;
        page = done.page;
    }
    return { ok: true, page };
}

const listFieldOf = (block: Block): ListField | undefined =>
    blockDefinitions[block.type].fields.find((field): field is ListField => field.kind === "list");

/** Fills a new section's blocks with what was given, leaving everything else as its sample. */
function fillSection(
    start: Page,
    sectionId: string,
    input: {
        title?: string | undefined;
        fields?: Record<string, unknown> | undefined;
        rows?: readonly Record<string, unknown>[] | undefined;
    },
    ctx: ToolContext,
): { ok: true; page: Page } | { ok: false; error: string } {
    let page = start;
    const found = findSection(page, sectionId);
    if (!found) return { ok: false, error: "That section couldn't be made." };
    if (input.title) {
        const problem = checked(ctx, "heading", "text", input.title);
        if (problem) return { ok: false, error: `title: ${problem}` };
        page = setSectionTitle(page, sectionId, input.title, ctx.makeId);
    }
    const first = found.section.blocks[0];
    if (!first) return { ok: true, page };
    if (input.fields) {
        const done = applyFields(page, first, input.fields, ctx);
        if (!done.ok) return done;
        page = done.page;
    }
    if (input.rows?.length) {
        const list = listFieldOf(first);
        if (list) {
            const rows: Record<string, unknown>[] = [];
            for (const row of input.rows) {
                const problem = checkValues(ctx, first.type, `${list.key}.`, list.fields, row);
                if (problem) return { ok: false, error: problem };
                rows.push({ ...list.make(), ...cleaned(row), id: ctx.makeId() });
            }
            const done = tryBlockField(page, first.id, list.key, rows);
            if (!done.ok) return done;
            page = done.page;
        } else {
            // A Links section has one block per link, so each row replaces or adds a block.
            const owned = found.section.blocks;
            const at = findBlock(page, first.id)?.index ?? 0;
            for (const block of owned) page = removeBlock(page, block.id);
            for (const [i, row] of input.rows.entries()) {
                const problem = checkValues(
                    ctx,
                    first.type,
                    "",
                    blockDefinitions[first.type].fields,
                    row,
                );
                if (problem) return { ok: false, error: problem };
                const parsed = {
                    ...first,
                    ...cleaned(row),
                    id: ctx.makeId(),
                };
                const made = blockSchemaUnion.safeParse(parsed);
                if (!made.success) {
                    return {
                        ok: false,
                        error: `Row ${String(i + 1)}: ${made.error.issues[0]?.message ?? "not allowed"}`,
                    };
                }
                page = addBlock(page, made.data, at + i);
            }
        }
    }
    return { ok: true, page };
}

function resolveSection(page: Page, ids: ShortIds, short: string) {
    const real = ids.real(short);
    return real ? findSection(page, real) : null;
}

function atAfter(page: Page, ids: ShortIds, after: string | undefined): number | null {
    if (!after) return sectionsOf(page.blocks).length;
    if (after === "top") return 0;
    const found = resolveSection(page, ids, after);
    return found ? found.index + 1 : null;
}

function applyStyle(
    page: Page,
    input: z.output<typeof toolInputs.set_style>,
): { page: Page; said: string[] } {
    let next = input.reset ? resetStyle(page) : page;
    const said: string[] = input.reset ? ["Went back to the look's own style"] : [];
    const patch: Partial<PageStyle> = {};
    if (input.colour) {
        const { mode, brand } = input.colour;
        const known = next.style?.colour?.brand ?? "#a42a55";
        patch.colour = { mode, brand: (brand ?? known).toLowerCase() };
        said.push(
            mode === "brand" ? `Used ${brand ?? known} as the colour` : `Colours set to ${mode}`,
        );
    }
    if (input.font) {
        patch.font = input.font;
        said.push(`Font set to ${input.font}`);
    }
    if (input.shape) {
        patch.shape = input.shape;
        said.push(`Corners set to ${input.shape}`);
    }
    if (input.fill) {
        patch.fill = input.fill === "filled" ? undefined : input.fill;
        said.push(`Buttons set to ${input.fill}`);
    }
    if (input.bg) {
        patch.bg = input.bg;
        said.push(
            input.bg === "gradient" ? "Background set to a soft fade" : "Background set to solid",
        );
    }
    next = setStyle(next, patch);
    return { page: next, said };
}

/** True when nothing of the person's is on the page yet, so building can't replace anything. */
export function isBlankPage(page: Page): boolean {
    const { header } = page;
    return (
        liveContent(page).page.blocks.length === 0 &&
        !header.tagline &&
        !header.bio &&
        !header.photo &&
        header.links.length === 0
    );
}

function buildPage(
    current: Page,
    input: z.output<typeof toolInputs.build_page>,
    ctx: ToolContext,
): ToolResult {
    const header: Header = {
        layout: "look",
        name: input.name,
        links: [],
        ...(input.wordmark ? { wordmark: input.wordmark } : {}),
        ...(input.tagline ? { tagline: input.tagline } : {}),
        ...(input.bio ? { bio: input.bio } : {}),
    };
    for (const key of ["name", "tagline", "bio"] as const) {
        const value = header[key];
        const problem = checked(ctx, "header", key, value);
        if (problem) return fail(`${key}: ${problem}`);
    }
    let page: Page = {
        version: PAGE_VERSION,
        look: input.look,
        header,
        blocks: [],
        ...(current.timeZone ? { timeZone: current.timeZone } : {}),
    };
    if (input.font) page = setStyle(page, { font: input.font });
    const names: string[] = [];
    for (const section of input.sections) {
        const definition = sectionDefinition(section.key);
        if (!definition) return fail(noSection(section.key));
        if (!sectionAvailable(definition)) return fail(`${definition.name} isn't available yet.`);
        const style = section.style
            ? definition.styles.find((other) => other.id === section.style)
            : undefined;
        if (section.style && !style) {
            return fail(
                `${definition.name} styles: ${definition.styles
                    .filter(styleAvailable)
                    .map((other) => other.id)
                    .join(", ")}.`,
            );
        }
        const blocks = makeSection(definition, ctx.makeId, section.style);
        const id = blocks[0]?.section;
        if (!id) return fail("That section couldn't be made.");
        page = addSection(page, blocks, sectionsOf(page.blocks).length);
        const filled = fillSection(page, id, section, ctx);
        if (!filled.ok) return fail(`${definition.name}: ${filled.error}`);
        page = filled.page;
        names.push(definition.name);
    }
    for (const url of input.links ?? []) {
        const problem = checked(ctx, "links", "url", url);
        if (problem) return fail(problem);
        const added = addFromLink(page, url, ctx.makeId);
        if (added) page = added.page;
    }
    const parsed = pageSchema.safeParse(page);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "That page isn't valid.");
    const blank = isBlankPage(current);
    if (ctx.creditsLeft < ctx.setupCredits) {
        return fail(
            `Building a page needs ${String(ctx.setupCredits)} credits, and the person has ${String(ctx.creditsLeft)}. Tell them, and offer smaller edits.`,
        );
    }
    const detail = `Built ${names.join(", ")}.`;
    if (!blank) {
        return {
            ok: true,
            page: current,
            summary: "Asked before replacing your page",
            detail: `${detail} The person's page has content, so they're being asked whether to replace it. Say so.`,
            offer: { type: "replace", page: parsed.data },
            setup: true,
        };
    }
    return {
        ok: true,
        page: parsed.data,
        summary: `Built your page: ${names.join(", ") || "your name and links"}`,
        detail,
        setup: true,
    };
}

/** Runs one tool on a working copy. Tools outside the page, such as reading a site, aren't here. */
export function applyTool(page: Page, name: string, args: unknown, ctx: ToolContext): ToolResult {
    if (!(name in toolInputs)) return fail(`There's no tool called ${name}.`);
    const tool = name as ToolName;
    const parsed = toolInputs[tool].safeParse(args ?? {});
    if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return fail(`${issue?.path.join(".") ?? "input"}: ${issue?.message ?? "not allowed"}`);
    }
    return run(page, tool, parsed.data, ctx);
}

function run(page: Page, tool: ToolName, raw: unknown, ctx: ToolContext): ToolResult {
    const { ids, makeId } = ctx;
    switch (tool) {
        case "read_section": {
            const input = raw as z.output<typeof toolInputs.read_section>;
            const real = ids.real(input.section);
            const text = real ? digestSection(page, real, ids) : null;
            if (!text) return missingId(page, ids, input.section);
            return { ok: true, page, summary: "", detail: text };
        }
        case "add_section": {
            const input = raw as z.output<typeof toolInputs.add_section>;
            const definition = sectionDefinition(input.key);
            if (!definition) return fail(noSection(input.key));
            if (!sectionAvailable(definition))
                return fail(`${definition.name} isn't available yet.`);
            const style = input.style
                ? definition.styles.find((other) => other.id === input.style)
                : undefined;
            if (input.style && (!style || !styleAvailable(style))) {
                return fail(
                    `${definition.name} styles: ${definition.styles
                        .filter(styleAvailable)
                        .map((other) => other.id)
                        .join(", ")}.`,
                );
            }
            const blocks = makeSection(definition, makeId, input.style);
            const id = blocks[0]?.section;
            if (!id) return fail("That section couldn't be made.");
            let next: Page;
            if (input.tab) {
                const tabId = ids.real(input.tab);
                const holder = page.blocks.find(
                    (block) =>
                        block.type === "tabs" && block.tabs.some((entry) => entry.id === tabId),
                );
                if (!holder || !tabId) return fail(`No tab ${input.tab}.`);
                next = addSection(page, blocks, Number.MAX_SAFE_INTEGER, {
                    tabs: holder.id,
                    tab: tabId,
                });
            } else {
                const at = atAfter(page, ids, input.after);
                if (at === null) return missingId(page, ids, input.after ?? "");
                next = addSection(page, blocks, at);
            }
            const filled = fillSection(next, id, input, ctx);
            if (!filled.ok) return filled;
            return {
                ok: true,
                page: filled.page,
                summary: `Added ${definition.name}`,
                detail: digestSection(filled.page, id, ids) ?? "",
            };
        }
        case "move_section": {
            const input = raw as z.output<typeof toolInputs.move_section>;
            const found = resolveSection(page, ids, input.section);
            if (!found) return missingId(page, ids, input.section);
            const target = input.after === "top" ? null : resolveSection(page, ids, input.after);
            if (input.after !== "top" && !target) return missingId(page, ids, input.after);
            const to = !target ? 0 : found.index < target.index ? target.index : target.index + 1;
            const name = found.section.definition.name;
            return {
                ok: true,
                page: moveSection(page, found.section.id, to),
                summary: target
                    ? `Moved ${name} below ${target.section.definition.name}`
                    : `Moved ${name} to the top`,
            };
        }
        case "remove_section": {
            const input = raw as z.output<typeof toolInputs.remove_section>;
            const found = input.sections.map(
                (short) => [short, resolveSection(page, ids, short)] as const,
            );
            const gone = found.find(([, section]) => !section);
            if (gone) return missingId(page, ids, gone[0]);
            const sections = found.flatMap(([, entry]) =>
                entry ? [{ id: entry.section.id, name: entry.section.definition.name }] : [],
            );
            if (ctx.removed + sections.length >= 2) {
                return {
                    ok: true,
                    page,
                    summary: "Asked before removing sections",
                    detail: "Nothing is removed yet. The person is being asked to confirm. Say so.",
                    offer: { type: "remove", sections },
                };
            }
            const only = sections[0];
            if (!only) return fail("Name a section to remove.");
            return {
                ok: true,
                page: removeSection(page, only.id),
                summary: `Removed ${only.name}`,
                removed: 1,
            };
        }
        case "duplicate_section": {
            const input = raw as z.output<typeof toolInputs.duplicate_section>;
            const found = resolveSection(page, ids, input.section);
            if (!found) return missingId(page, ids, input.section);
            const [next, copy] = duplicateSection(page, found.section.id, makeId);
            return {
                ok: true,
                page: next,
                summary: `Copied ${found.section.definition.name}`,
                detail: copy ? (digestSection(next, copy, ids) ?? "") : "",
            };
        }
        case "set_section": {
            const input = raw as z.output<typeof toolInputs.set_section>;
            const found = resolveSection(page, ids, input.section);
            if (!found) return missingId(page, ids, input.section);
            const id = found.section.id;
            const name = found.section.definition.name;
            let next = page;
            const said: string[] = [];
            if (input.style) {
                const { definition, blocks } = found.section;
                const style = definition.styles.find((other) => other.id === input.style);
                if (!style || !styleAvailable(style)) {
                    return fail(
                        `${name} styles: ${definition.styles
                            .filter(styleAvailable)
                            .map((other) => other.id)
                            .join(", ")}.`,
                    );
                }
                const swaps = blocks.some((block) => block.type !== style.type);
                const live = liveContent(page);
                const own = sectionsOf(live.page.blocks).some((other) => other.id === id);
                if (swaps && definition.key !== "links" && own) {
                    return fail(
                        `Changing ${name} to ${input.style} would replace the person's words with samples. Tell them, and offer to add it as a new section instead.`,
                    );
                }
                next = setSectionStyle(next, id, input.style, makeId);
                said.push(`${name} style set to ${style.label}`);
            }
            if (input.title !== undefined) {
                const problem = checked(ctx, "heading", "text", input.title);
                if (problem) return fail(`title: ${problem}`);
                next = setSectionTitle(next, id, input.title, makeId);
                said.push(
                    input.title ? `Titled ${name} "${input.title}"` : `Removed ${name}'s title`,
                );
            }
            if (input.big_title !== undefined) {
                next = setSectionBigTitle(next, id, input.big_title);
                said.push(`${name}'s title made ${input.big_title ? "bigger" : "plain"}`);
            }
            if (input.hidden !== undefined) {
                next = setSectionShared(next, id, "hidden", input.hidden);
                said.push(`${input.hidden ? "Hid" : "Showed"} ${name}`);
            }
            if (input.tint !== undefined) {
                next = setSectionShared(next, id, "tint", input.tint);
                said.push(
                    `${input.tint ? "Put" : "Took"} ${name} ${input.tint ? "on" : "off"} a coloured band`,
                );
            }
            for (const [key, value, words] of [
                ["showFrom", input.show_from, "starts showing"],
                ["showUntil", input.show_until, "stops showing"],
            ] as const) {
                if (value === undefined) continue;
                const problem = checked(ctx, "section", key, value);
                if (problem) return fail(`${key}: ${problem}`);
                if (value && !z.iso.datetime().safeParse(value).success) {
                    return fail(`${key} has to be a UTC instant like 2026-11-14T18:00:00Z.`);
                }
                next = setSectionShared(next, id, key, value);
                said.push(value ? `${name} ${words} at ${value}` : `Cleared when ${name} ${words}`);
            }
            if (!said.length) return fail("Say what to change on this section.");
            return { ok: true, page: next, summary: said.join(". ") };
        }
        case "set_fields": {
            const input = raw as z.output<typeof toolInputs.set_fields>;
            if (input.target === "header") {
                const allowed = [
                    "layout",
                    "wordmark",
                    "name",
                    "tagline",
                    "bio",
                    "buttonText",
                    "buttonUrl",
                    "hideName",
                ];
                let next = page;
                const said: string[] = [];
                for (const [key, value] of Object.entries(cleaned(input.values))) {
                    if (!allowed.includes(key)) {
                        return fail(
                            `The header's fields are: ${allowed.join(", ")}. Use edit_list for its links.`,
                        );
                    }
                    const problem = checked(ctx, "header", key, value);
                    if (problem) return fail(`${key}: ${problem}`);
                    const done = tryHeaderField(next, key, value);
                    if (!done.ok) return done;
                    next = done.page;
                    said.push(key);
                }
                return {
                    ok: true,
                    page: next,
                    summary: `Updated ${said.join(", ")} at the top of your page`,
                };
            }
            const real = ids.real(input.target);
            const found = real ? findBlock(page, real) : null;
            if (!found)
                return fail(`No block ${input.target}. Use an id from the page, or "header".`);
            const done = applyFields(page, found.block, input.values, ctx);
            if (!done.ok) return done;
            const keys = Object.keys(input.values).join(", ");
            const section =
                findSection(page, found.block.id)?.section.definition.name ?? "that section";
            const said = Object.entries(input.values)
                .filter(([key]) => DATE_FIELDS.has(key))
                .map(([key, value]) => `${key} is now ${String(value)}`);
            return {
                ok: true,
                page: done.page,
                summary: `Updated ${keys} in ${section}`,
                ...(said.length
                    ? { detail: `Read this back to the person: ${said.join(", ")}.` }
                    : {}),
            };
        }
        case "edit_list": {
            const input = raw as z.output<typeof toolInputs.edit_list>;
            const realRow = (id: string) => ids.real(id) ?? id;
            const edit = {
                ...(input.add
                    ? {
                          add: input.add.map(({ after, values: given }) => ({
                              after: after ? realRow(after) : undefined,
                              values: given,
                          })),
                      }
                    : {}),
                ...(input.update
                    ? {
                          update: input.update.map(({ id, values: given }) => ({
                              id: realRow(id),
                              values: given,
                          })),
                      }
                    : {}),
                ...(input.remove ? { remove: input.remove.map(realRow) } : {}),
                ...(input.order ? { order: input.order.map(realRow) } : {}),
            };
            const given = [...(edit.add ?? []), ...(edit.update ?? [])].map(
                (entry) => entry.values,
            );
            if (input.block === "header") {
                if (input.list !== "links") return fail("The header's only list is links.");
                for (const entry of given) {
                    const problem = checkValues(ctx, "header", "links.", [], entry);
                    if (problem) return fail(problem);
                }
                const rows = editRows(
                    page.header.links,
                    {
                        ...edit,
                        ...(edit.add
                            ? {
                                  add: edit.add.map((row) => ({
                                      ...row,
                                      values: { type: "globe", value: "", ...cleaned(row.values) },
                                  })),
                              }
                            : {}),
                        ...(edit.update
                            ? {
                                  update: edit.update.map((row) => ({
                                      ...row,
                                      values: cleaned(row.values),
                                  })),
                              }
                            : {}),
                    },
                    makeId,
                    "links",
                );
                if (typeof rows === "string") return fail(rows);
                const done = tryHeaderField(page, "links", rows);
                return done.ok
                    ? { ok: true, page: done.page, summary: "Updated your social links" }
                    : done;
            }
            const realBlock = ids.real(input.block);
            const found = realBlock ? findBlock(page, realBlock) : null;
            if (!found) return fail(`No block ${input.block}. Use an id from the page.`);
            const field = blockDefinitions[found.block.type].fields.find(
                (other) => other.key === input.list,
            );
            if (blockDefinitions[found.block.type].held) {
                return fail(`${blockDefinitions[found.block.type].name} isn't available yet.`);
            }
            if (field?.kind !== "list" && input.list !== "tabs") {
                return fail(`${found.block.type} has no list called ${input.list}.`);
            }
            const inner = field?.kind === "list" ? field.fields : [];
            for (const entry of given) {
                const problem = checkValues(ctx, found.block.type, `${input.list}.`, inner, entry);
                if (problem) return fail(problem);
            }
            const done = editList(
                page,
                found.block.id,
                input.list,
                {
                    ...edit,
                    ...(edit.add
                        ? {
                              add: edit.add.map((row) => ({
                                  ...row,
                                  values: {
                                      ...(field?.kind === "list" ? field.make() : {}),
                                      ...cleaned(row.values),
                                  },
                              })),
                          }
                        : {}),
                    ...(edit.update
                        ? {
                              update: edit.update.map((row) => ({
                                  ...row,
                                  values: cleaned(row.values),
                              })),
                          }
                        : {}),
                },
                makeId,
            );
            if (!done.ok) return done;
            const name =
                findSection(page, found.block.id)?.section.definition.name ?? "that section";
            return {
                ok: true,
                page: done.page,
                summary: `Updated the rows in ${name}`,
                detail: digestSection(done.page, found.block.id, ids) ?? "",
            };
        }
        case "remove_link": {
            const input = raw as z.output<typeof toolInputs.remove_link>;
            const real = ids.real(input.block);
            const found = real ? findSection(page, real) : null;
            if (!real || !found) return fail(`No block ${input.block}.`);
            if (found.section.blocks.length <= 1) {
                return {
                    ok: true,
                    page: removeSection(page, found.section.id),
                    summary: `Removed ${found.section.definition.name}`,
                    removed: 1,
                };
            }
            return { ok: true, page: removeBlock(page, real), summary: "Removed a link" };
        }
        case "add_link": {
            const input = raw as z.output<typeof toolInputs.add_link>;
            const problem = checked(ctx, "links", "url", input.url);
            if (problem) return fail(problem);
            const added = addFromLink(page, input.url, makeId);
            if (!added)
                return fail("That doesn't look like an address. Ask the person to check it.");
            return {
                ok: true,
                page: added.page,
                summary: `Added the link to ${added.name}`,
                detail: digestSection(added.page, added.section, ids) ?? "",
            };
        }
        case "set_look": {
            const input = raw as z.output<typeof toolInputs.set_look>;
            return {
                ok: true,
                page: setLook(page, input.look),
                summary: `Changed the look to ${input.look}`,
            };
        }
        case "set_style": {
            const input = raw as z.output<typeof toolInputs.set_style>;
            const { page: next, said } = applyStyle(page, input);
            if (!said.length) return fail("Say which style choice to change.");
            return { ok: true, page: next, summary: said.join(". ") };
        }
        case "set_art": {
            const input = raw as z.output<typeof toolInputs.set_art>;
            let next = page;
            const said: string[] = [];
            if (input.paint) {
                // A chosen colour overrides paint, so it has to go first or the paint does nothing.
                if (next.style?.colour) {
                    const { colour: _colour, ...style } = next.style;
                    const { style: _style, ...rest } = next;
                    next = Object.keys(style).length ? { ...rest, style } : rest;
                    said.push("Cleared your colour choice so the paint shows");
                }
                next = setPaint(
                    next,
                    input.paint.map((colour) => colour.toLowerCase()),
                );
                said.push("Repainted the art");
            }
            if (input.new_painting) {
                next = setSeed(next, 1 + (((page.seed ?? 0) + 137) % 998));
                said.push("Painted a new one");
            }
            if (!said.length) return fail("Give paint colours or ask for a new painting.");
            return { ok: true, page: next, summary: said.join(". ") };
        }
        case "set_page_text": {
            const input = raw as z.output<typeof toolInputs.set_page_text>;
            let next = page;
            for (const key of ["title", "description"] as const) {
                const value = input[key];
                if (value === undefined) continue;
                const problem = checked(ctx, "page", key, value);
                if (problem) return fail(`${key}: ${problem}`);
                next = setPageText(next, key, value);
            }
            const parsed = pageSchema.safeParse(next);
            if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "That's too long.");
            return {
                ok: true,
                page: parsed.data,
                summary: "Updated what shows when your link is shared",
            };
        }
        case "build_page":
            return buildPage(page, raw as z.output<typeof toolInputs.build_page>, ctx);
        case "offer_choices": {
            const input = raw as z.output<typeof toolInputs.offer_choices>;
            return {
                ok: true,
                page,
                summary: "",
                offer: { type: "choice", question: input.question, options: input.options },
            };
        }
        case "request_publish":
            return {
                ok: true,
                page,
                summary: "",
                detail: "A button is showing. Only the person's tap can publish.",
                offer: { type: "publish" },
            };
        case "read_website":
        case "find_photos":
        case "make_image":
            return fail(`${tool} isn't available here.`);
    }
}

const DATE_FIELDS = new Set(["at", "date"]);

/** What the person sees while a tool runs. Written by us, so it's always what's really happening. */
export function toolStatus(name: string): string {
    const words: Readonly<Partial<Record<ToolName, string>>> = {
        read_section: "Reading your page",
        add_section: "Adding a section",
        move_section: "Moving a section",
        remove_section: "Removing a section",
        duplicate_section: "Copying a section",
        set_section: "Changing a section",
        set_fields: "Changing your words",
        edit_list: "Changing a list",
        remove_link: "Removing a link",
        add_link: "Adding a link",
        set_look: "Changing the look",
        set_style: "Changing the style",
        set_art: "Repainting the art",
        set_page_text: "Changing your share text",
        build_page: "Building your page",
        read_website: "Reading your website",
        find_photos: "Finding photos",
        make_image: "Getting an image ready",
    };
    return words[name as ToolName] ?? "Working";
}

/** Puts a picked or generated image where it was asked for. Null if that place has gone. */
export function placePhoto(page: Page, target: string, file: string): Page | null {
    const photo = { file };
    if (target === "header") {
        const done = tryHeaderField(page, "photo", photo);
        return done.ok ? done.page : null;
    }
    if (target === "background") return setStyle(page, { bg: "photo", bgPhoto: photo });
    const found = findBlock(page, target);
    if (found) {
        const fields = blockDefinitions[found.block.type].fields;
        const field = fields.find((other) => other.kind === "photo" || other.kind === "photoList");
        if (!field) return null;
        const current = (found.block as Readonly<Record<string, unknown>>)[field.key];
        const value =
            field.kind === "photoList"
                ? [...(Array.isArray(current) ? (current as unknown[]) : []), photo]
                : photo;
        const done = tryBlockField(page, target, field.key, value);
        return done.ok ? done.page : null;
    }
    for (const block of allOwners(page)) {
        const list = listFieldOf(block);
        const rows = list ? (block as Readonly<Record<string, unknown>>)[list.key] : null;
        if (!list || !Array.isArray(rows)) continue;
        const row = rows.find((entry: { id?: string }) => entry.id === target) as
            { id: string } | undefined;
        if (!row) continue;
        const field = list.fields.find((other) => other.kind === "photo");
        if (!field) return null;
        const done = tryBlockField(
            page,
            block.id,
            list.key,
            rows.map((entry: { id?: string }) =>
                entry.id === target ? { ...entry, [field.key]: photo } : entry,
            ),
        );
        return done.ok ? done.page : null;
    }
    return null;
}

const allOwners = (page: Page): Block[] =>
    page.blocks.flatMap((block) =>
        block.type === "tabs" ? block.tabs.flatMap((tab) => tab.blocks) : [block],
    );

/** Keeps the person's look and top of the page, and adds the built sections below theirs. */
export function addBuilt(current: Page, built: Page): Page {
    return { ...current, blocks: [...current.blocks, ...built.blocks].slice(0, 200) };
}
