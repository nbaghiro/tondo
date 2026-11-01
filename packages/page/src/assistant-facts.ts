import { readLink } from "./links";
import type { Page } from "./schema";
import { liveContent } from "./sample-content";

// Anything the model writes counts as the person's own and goes live, so an invented review or price
// has to be stopped before it enters the page. This is plain code and not a model's judgement.
//
// A claim passes only if it can be traced to what the person said, their page or a site they gave.
// Words like "award-winning" can't be caught this way: the prompt, the evals and the note asking
// people to check are what cover them.

export type ClaimKind = "quote" | "link" | "date" | "words" | "digits";

const LINK_KEYS = new Set(["url", "value", "buttonUrl"]);
const DATE_KEYS = new Set(["at", "showFrom", "showUntil", "date"]);

/** Fields where a wrong value is a false claim. Everything else still gets the digit rule. */
const CLAIMS: Readonly<Record<string, ClaimKind>> = {
    "quotes.items.text": "quote",
    "quotes.items.by": "quote",
    "products.items.name": "words",
    "services.items.name": "words",
    "team.items.name": "words",
    "team.items.role": "words",
    "logos.items.name": "words",
    "stats.items.label": "words",
    "events.items.name": "words",
    "events.items.place": "words",
    "timeline.items.title": "words",
    "posts.items.title": "words",
    "music.title": "words",
    "music.sub": "words",
    "music.tracks.name": "words",
    "location.address": "words",
    "location.note": "words",
    "header.name": "words",
};

export function claimKind(owner: string, path: string): ClaimKind {
    const key = path.split(".").at(-1) ?? path;
    if (LINK_KEYS.has(key)) return "link";
    if (DATE_KEYS.has(key)) return "date";
    return CLAIMS[`${owner}.${path}`] ?? "digits";
}

const plain = (text: string) =>
    text
        .normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .replace(/[’‘]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/\s+/g, " ")
        .trim();

const digitRuns = (text: string) =>
    [...text.replace(/(\d)[,. ](?=\d{3}\b)/g, "$1").matchAll(/\d+/g)].map((match) => match[0]);

const bareLink = (raw: string) =>
    plain(raw)
        .replace(/^(?:https?:\/\/)?(?:www\.)?/, "")
        .replace(/^(?:mailto:|tel:)/, "")
        .replace(/[/?#]+$/, "");

const WEB_WORD = /\b(?:https?:\/\/)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/[^\s"'<>)]*)?/gi;
const WHEN_WORD =
    /\b(?:today|tonight|tomorrow|next|mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/;

export interface Evidence {
    text: string;
    /** What the person said this conversation, without their page. */
    said: string;
    digits: ReadonlySet<string>;
    words: ReadonlySet<string>;
}

/** Text the person gave, plus their page without its sample words. */
export function createEvidence(texts: readonly string[], page?: Page): Evidence {
    const own = page
        ? JSON.stringify(liveContent(page).page.blocks) + JSON.stringify(page.header)
        : "";
    const text = plain([...texts, own].join("\n"));
    return {
        text,
        said: plain(texts.join("\n")),
        digits: new Set(digitRuns(text)),
        words: new Set(text.split(/[^\p{L}\p{N}]+/u).filter(Boolean)),
    };
}

const refuse = (what: string) =>
    `${what} isn't in anything the person told you. Ask them for it, and don't guess.`;

function checkDigits(value: string, evidence: Evidence): string | null {
    // "9:00" and "$12.00" shouldn't need the person to have typed the zeros.
    const missing = digitRuns(value).find((run) => !/^0+$/.test(run) && !evidence.digits.has(run));
    return missing ? refuse(`The number ${missing}`) : null;
}

function checkLink(value: string, evidence: Evidence): string | null {
    if (!value) return null;
    const bare = bareLink(value);
    if (evidence.text.includes(bare)) return null;
    // "My Instagram is @lowtide" is enough for a known service's address.
    const reading = readLink(value);
    if (reading.state === "ok" && reading.service) {
        const last = bare.split("/").at(-1)?.replace(/^@/, "") ?? "";
        if (last && evidence.words.has(last)) return null;
    }
    const digits = bare.replace(/[^\d]/g, "");
    if (
        value.startsWith("tel:") &&
        digits &&
        evidence.text.replace(/[^\d]/g, "").includes(digits)
    ) {
        return null;
    }
    return refuse(`The link ${value}`);
}

/** Null if the value is fine, or a reason the model can act on. */
export function checkClaim(kind: ClaimKind, value: string, evidence: Evidence): string | null {
    const text = plain(value);
    if (!text) return null;
    switch (kind) {
        case "quote":
            return evidence.text.includes(text)
                ? null
                : "Quotes have to be someone's real words. Ask the person to paste them, and use them exactly.";
        case "link":
            return checkLink(value, evidence);
        case "date":
            // "Next Friday" is fine: the tool result reads the date back for the person to check.
            if (WHEN_WORD.test(evidence.said)) return null;
            return evidence.digits.has(String(Number(value.slice(8, 10))))
                ? null
                : refuse(`The date ${value}`);
        case "words": {
            const missing = text
                .split(/[^\p{L}\p{N}]+/u)
                .find((word) => word.length > 3 && !evidence.text.includes(word.replace(/s$/, "")));
            if (missing) return refuse(`The word "${missing}"`);
            return checkDigits(value, evidence);
        }
        case "digits": {
            const links = (value.match(WEB_WORD) ?? []).map((word) => checkLink(word, evidence));
            return links.find(Boolean) ?? checkDigits(value, evidence);
        }
    }
}
