import { describe, expect, it } from "vitest";
import type { Block } from "./blocks";
import { readLink } from "./links";
import { publishWarnings } from "./publish";
import { liveContent } from "./sample-content";
import { starterPage } from "./samples";
import { makeSection, sectionAvailable, sectionDefinitions, styleAvailable } from "./sections";

const OWN = "Mine and nobody else's";
let next = 0;
const makeId = () => `id${String(next++)}`;
type Row = Record<string, unknown>;
const page = (blocks: Block[]) => ({ ...starterPage("June"), blocks });

const freshBlocks = (key: string, style?: string): Block[] => {
    const definition = sectionDefinitions.find((one) => one.key === key);
    if (!definition) throw new Error(key);
    return makeSection(definition, makeId, style);
};
const rowsOf = (block: Block, key: string): Row[] => (block as Row)[key] as Row[];
const blockOf = (blocks: Block[], type: string): Block => {
    const found = blocks.find((block) => block.type === type);
    if (!found) throw new Error(type);
    return found;
};
const withField = (block: Block, key: string, value: unknown) => ({ ...block, [key]: value });
const live = (blocks: Block[]) => JSON.stringify(liveContent(page(blocks)).page.blocks);

describe("sample content, field by field", () => {
    it("keeps a typed address and drops the sample hours and note", () => {
        const blocks = freshBlocks("find", "place");
        const block = blockOf(blocks, "location");
        const text = live([withField(block, "address", "9 King Street")]);
        expect(text).toContain("9 King Street");
        expect(text).not.toContain("Mon to Fri");
        expect(text).not.toContain("Open today until 5 pm");
    });

    it("keeps real hours beside a sample day name", () => {
        const block = blockOf(freshBlocks("find", "place"), "location");
        const hours = rowsOf(block, "hours");
        const text = live([
            withField(block, "hours", [{ ...hours[0], time: "10 to 4" }, hours[1]]),
        ]);
        expect(text).toContain("10 to 4");
        expect(text).toContain("Mon to Fri");
        expect(text).not.toContain("10 am to 2 pm");
    });

    it("keeps music with its own link and title, without the sample songs", () => {
        const block = blockOf(freshBlocks("media", "music"), "music");
        const samples = rowsOf(block, "tracks");
        let edited = withField(block, "url", "https://open.spotify.com/album/1");
        edited = withField(edited, "title", "Low Water");
        const text = live([edited]);
        expect(text).toContain("https://open.spotify.com/album/1");
        expect(text).toContain("Low Water");
        for (const track of samples) expect(text).not.toContain(String(track["name"]));
    });

    it("keeps a pasted Spotify link on its own", () => {
        const block = blockOf(freshBlocks("media", "music"), "music");
        expect(live([withField(block, "url", "https://open.spotify.com/album/1")])).toContain(
            "open.spotify.com",
        );
    });

    it("keeps an event when only its date changed", () => {
        const block = blockOf(freshBlocks("events", "list"), "events");
        const items = rowsOf(block, "items");
        const text = live([
            withField(block, "items", [{ ...items[0], at: "2027-03-13T10:00" }, items[1]]),
        ]);
        expect(text).toContain("2027-03-13T10:00");
        expect(text).not.toContain("First event");
        expect(text).not.toContain("Second event");
    });

    it("keeps a countdown when only its date changed, and drops an untouched one", () => {
        const block = blockOf(freshBlocks("events", "countdown"), "countdown");
        expect(live([block])).toBe("[]");
        expect(live([withField(block, "at", "2027-03-13T10:00")])).toContain("2027-03-13T10:00");
    });

    it("keeps a logo row's own label", () => {
        const block = blockOf(freshBlocks("proof", "logos"), "logos");
        expect(live([withField(block, "label", "Printed in")])).toContain("Printed in");
    });

    it("drops the invented review when only the name changed, and says what it needs", () => {
        const blocks = freshBlocks("proof", "quote");
        const block = blockOf(blocks, "quotes");
        const items = rowsOf(block, "items");
        const edited = withField(block, "items", [{ ...items[0], by: "Sarah Lin" }, items[1]]);
        const text = live([edited]);
        expect(text).not.toContain("Sarah Lin");
        expect(text).not.toContain("exactly what I needed");
        expect(
            publishWarnings(page([edited]))
                .map((one) => one.message)
                .join(),
        ).toContain("really said");
    });

    it("keeps a real review and drops the sample name beside it", () => {
        const block = blockOf(freshBlocks("proof", "quote"), "quotes");
        const items = rowsOf(block, "items");
        const text = live([withField(block, "items", [{ ...items[0], text: OWN }, items[1]])]);
        expect(text).toContain(OWN);
        expect(text).not.toContain("A happy client");
    });

    it("drops a sample price beside a real product name, and a real price beside a sample name", () => {
        const block = blockOf(freshBlocks("shop", "grid"), "products");
        const items = rowsOf(block, "items");
        const named = live([withField(block, "items", [{ ...items[0], name: "Vase" }])]);
        expect(named).toContain("Vase");
        expect(named).not.toContain("$24");
        const priced = live([withField(block, "items", [{ ...items[0], price: "$99" }])]);
        expect(priced).not.toContain("$99");
    });

    it("drops the Spotlight's sample words once its title and link are real", () => {
        const block = blockOf(freshBlocks("spotlight", "large"), "link-card");
        let edited = withField(block, "title", "Autumn sale");
        edited = withField(edited, "url", "https://example.com/sale");
        const text = live([edited]);
        expect(text).toContain("Autumn sale");
        for (const words of ["why it matters", "Take a look", '"Just in"']) {
            expect(text).not.toContain(words);
        }
    });

    it("drops a title with nothing under it, and rows someone deleted leave nothing behind", () => {
        const blocks = freshBlocks("team", "circles");
        const edited = blocks.map((block) =>
            block.type === "team" ? withField(block, "items", []) : block,
        );
        expect(live(edited)).toBe("[]");
    });

    it("words its warnings as one plain line per block", () => {
        const block = blockOf(freshBlocks("services", "list"), "services");
        const items = rowsOf(block, "items");
        const edited = withField(block, "items", [
            { ...items[0], name: "Haircut" },
            items[1],
            items[2],
        ]);
        const messages = publishWarnings(page([edited])).map((one) => one.message);
        expect(new Set(messages).size).toBe(messages.length);
        expect(messages.join()).toContain("Services and prices");
        expect(messages.join()).not.toContain('"30 minutes"');
    });

    describe("sample words beside a person's own link", () => {
        const SPOTIFY = "https://open.spotify.com/album/1";
        const warnings = (blocks: Block[]) =>
            publishWarnings(page(blocks))
                .map((one) => one.message)
                .join();

        it.each([
            ["links", "buttons", "button", "text", "My website"],
            ["links", "cards", "link-card", "title", "My website"],
            ["links", "icons", "link-card", "title", "My website"],
            ["spotlight", "large", "link-card", "title", "Something worth seeing"],
            ["bookings", "card", "booking", "title", "Book a time with me"],
            ["media", "music", "music", "title", "My latest release"],
        ])("%s, %s names it from the link", (key, style, type, field, sample) => {
            const block = blockOf(freshBlocks(key, style), type);
            const blocks = [withField(block, "url", "https://shop.example.com/a")];
            const text = live(blocks);
            expect(text).not.toContain(sample);
            expect(text).toContain(`"${field}":"shop.example.com"`);
            expect(warnings(blocks)).toContain("won't show");
        });

        it("names a video from its link and leaves other sample videos out", () => {
            const block = blockOf(freshBlocks("media", "card"), "video");
            const items = rowsOf(block, "items");
            const edited = withField(block, "items", [
                { ...items[0], url: "https://youtu.be/abc" },
                items[1],
            ]);
            const text = live([edited]);
            expect(text).toContain('"title":"YouTube"');
            expect(text).not.toContain("Watch this first");
            expect(text).not.toContain("Behind the scenes");
            expect(warnings([edited])).toContain("sample");
        });

        it("uses the service's name, and keeps plain button wording", () => {
            const block = blockOf(freshBlocks("media", "music"), "music");
            expect(live([withField(block, "url", SPOTIFY)])).toContain('"title":"Spotify"');
            const booking = blockOf(freshBlocks("bookings", "card"), "booking");
            const text = live([withField(booking, "url", "https://calendly.com/a")]);
            expect(text).toContain('"title":"Calendly"');
            expect(text).toContain("Pick a time");
            expect(text).not.toContain("less than a minute");
        });

        it("offers a real name for a pasted link, never what the link does", () => {
            const title = (raw: string) => {
                const reading = readLink(raw);
                return reading.state === "ok" ? reading.title : null;
            };
            expect(title("myshop.example.com")).toBe("myshop.example.com");
            expect(title("https://www.example.com/a")).toBe("example.com");
            expect(title("instagram.com/june")).toBe("Instagram");
            expect(title("june.etsy.com")).toBe("june.etsy.com");
        });

        it("keeps words the person wrote", () => {
            const block = blockOf(freshBlocks("links", "buttons"), "button");
            const text = live([
                withField(withField(block, "url", SPOTIFY), "text", "Hear the album"),
            ]);
            expect(text).toContain("Hear the album");
        });
    });

    describe("every field of every section, changed one at a time", () => {
        const skip = new Set(["id", "type", "variant", "section", "source", "at", "url"]);
        const wordy = (value: unknown): value is string =>
            typeof value === "string" && value.includes(" ");
        for (const definition of sectionDefinitions.filter(sectionAvailable)) {
            for (const style of definition.styles.filter(styleAvailable)) {
                it(`${definition.key}, ${style.id}`, () => {
                    const blocks = freshBlocks(definition.key, style.id);
                    const edits: { edited: Block[]; others: string[] }[] = [];
                    for (const block of blocks) {
                        if (block.type === "heading" || block.type === "tabs") continue;
                        const swap = (made: Block) =>
                            blocks.map((one) => (one.id === block.id ? made : one));
                        for (const [key, value] of Object.entries(block as Row)) {
                            if (skip.has(key)) continue;
                            if (typeof value === "string") {
                                edits.push({
                                    edited: swap(withField(block, key, OWN)),
                                    others: [],
                                });
                            }
                            if (!Array.isArray(value)) continue;
                            const rows = value as Row[];
                            const [sample] = rows;
                            if (typeof sample !== "object") continue;
                            for (const field of Object.keys(sample)) {
                                if (skip.has(field) || typeof sample[field] !== "string") continue;
                                const [first, ...rest] = rows;
                                edits.push({
                                    edited: swap(
                                        withField(block, key, [
                                            { ...first, [field]: OWN },
                                            ...rest,
                                        ]),
                                    ),
                                    others: rest.flatMap((row) => Object.values(row).filter(wordy)),
                                });
                            }
                        }
                    }
                    for (const { edited, others } of edits) {
                        const whole = page(edited);
                        const out = JSON.stringify(liveContent(whole).page.blocks);
                        const asked = publishWarnings(whole).some((one) =>
                            one.message.includes("until it has"),
                        );
                        if (!asked) expect(out).toContain(OWN);
                        for (const words of others) expect(out).not.toContain(words);
                    }
                });
            }
        }
    });
});
