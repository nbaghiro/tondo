import { blockDefinitions, blockTypes } from "./blocks";
import type { BlockDefinition } from "./define-block";
import type { Field } from "./fields";
import { fontPairs, headerLayouts, linkTypes, wordmarks } from "./schema";
import { sectionAvailable, sectionDefinitions, styleAvailable } from "./sections";

// Written from the same definitions the editor uses, so a new block can't be left out of the prompt.

const OFF_LIMITS = new Set(["photo", "photoList", "file", "source"]);

function fieldText(field: Field): string {
    switch (field.kind) {
        case "text":
        case "longText":
            return `${field.key} ${String(field.max)}`;
        case "link":
            return `${field.key} link`;
        case "toggle":
            return `${field.key} true/false`;
        case "choice":
            return `${field.key} ${field.options.map(([value]) => value).join("|")}`;
        case "dateTime":
            return `${field.key} ${field.local ? "local time like 2026-11-14T10:00" : "UTC instant"}`;
        case "list":
            return `${field.key}: up to ${String(field.max)} rows of (${field.fields
                .filter((inner) => !OFF_LIMITS.has(inner.kind))
                .map(fieldText)
                .join(", ")})`;
        case "photo":
        case "photoList":
        case "file":
        case "source":
            return field.key;
    }
}

function blockLine(type: string, definition: BlockDefinition): string {
    const layouts = Object.entries(definition.layouts)
        .filter(([, layout]) => !layout.held)
        .map(([id]) => id)
        .join("|");
    const fields = definition.fields
        .filter((field) => !OFF_LIMITS.has(field.kind))
        .map(fieldText)
        .join(", ");
    return `${type} [${layouts}]: ${fields || "no fields"}`;
}

/** Sections and blocks as text. Anything held stays out, apart from being named as not available. */
export function assistantCatalogue(): string {
    const available = sectionDefinitions.filter(sectionAvailable);
    const held = sectionDefinitions.filter((definition) => !sectionAvailable(definition));
    const sections = available.map((definition) => {
        const styles = definition.styles
            .filter(styleAvailable)
            .map((style) => `${style.id} (${style.type})`);
        return `${definition.key} "${definition.name}": ${definition.why}. Words: ${definition.words}. Styles: ${styles.join(", ")}`;
    });
    const blocks = blockTypes
        .filter((type) => !blockDefinitions[type].held)
        .map((type) => blockLine(type, blockDefinitions[type]));
    return [
        "Sections you can add:",
        ...sections,
        `Not available yet, so say so and offer a link instead: ${held
            .map((definition) => definition.name)
            .join(", ")}, and calendar or slot bookings.`,
        "",
        "Each style is made of the block in brackets. Its fields and rows are below, with limits in characters:",
        ...blocks,
        "",
        `Header fields: layout ${headerLayouts.join("|")}, wordmark ${wordmarks.join("|")}, name 80, tagline 120, bio 280, buttonText 40, buttonUrl link. Keep layout "look" unless asked.`,
        `Link types for header links and contact rows: ${linkTypes.join(", ")}.`,
        `Fonts: ${fontPairs.join(", ")}.`,
    ].join("\n");
}
