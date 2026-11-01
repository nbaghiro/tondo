import { createHash } from "node:crypto";
import sharp from "sharp";
import type { Reach } from "./assistant-loop";
import type { Content, Model, ModelReply, Part } from "./assistant-model";

// Plays the model for tests, chosen by what the person types. It lives in the server process because
// every port is taken, and nothing in here can reach the network.

const USAGE = { input: 100, cached: 0, output: 10 };

const say = (text: string): ModelReply => ({
    parts: [{ text }],
    finish: "STOP",
    blocked: false,
    usage: USAGE,
});
const call = (name: string, args: object, text = ""): ModelReply => ({
    parts: [...(text ? [{ text }] : []), { functionCall: { name, args: { ...args } } }],
    finish: "STOP",
    blocked: false,
    usage: USAGE,
});

const textOf = (content: Content | undefined) =>
    (content?.parts ?? []).map((part: Part) => part.text ?? "").join("");

const answered = (contents: readonly Content[]) =>
    (contents.at(-1)?.parts ?? []).flatMap((part): Record<string, unknown>[] =>
        part.functionResponse ? [part.functionResponse.response] : [],
    );

/** The first section id in the page text with this key, such as `s2` for `shop`. */
function sectionId(page: string, key: string): string | undefined {
    return new RegExp(`^(s\\d+) ${key} `, "m").exec(page)?.[1];
}

export const standIn: Model = {
    id: "stand-in",
    generate: async ({ contents, signal }) => {
        const asked = [...contents].reverse().find((entry) => textOf(entry).includes("<message>"));
        const text = textOf(asked);
        const message = /<message>([\s\S]*)<\/message>/.exec(text)?.[1] ?? "";
        const page = /<page>([\s\S]*)<\/page>/.exec(text)?.[1] ?? "";
        const results = answered(contents);
        const first = !results.length;

        if (/slow/i.test(message)) {
            await new Promise((resolve, reject) => {
                const timer = setTimeout(resolve, 30_000);
                signal.addEventListener("abort", () => {
                    clearTimeout(timer);
                    reject(new DOMException("Stopped", "AbortError"));
                });
            });
        }
        if (/fall over/i.test(message)) throw new Error("The stand-in fell over");

        if (!first) {
            const refused = results.find((entry) => entry["ok"] === false);
            if (refused) return say("I can't add that, because you didn't tell me it. What is it?");
            if (/remove/i.test(message)) return say("I've asked you to confirm first.");
            return say("Done. Tell me if you'd like anything else changed.");
        }
        if (/softer/i.test(message)) return call("set_style", { shape: "soft" });
        if (/move .*up/i.test(message)) {
            const id = sectionId(page, "links");
            return id
                ? call("move_section", { section: id, after: "top" })
                : say("There's no links section.");
        }
        if (/remove everything/i.test(message)) {
            const list = [...page.matchAll(/^(s\d+) /gm)].map((match) => match[1]);
            return call("remove_section", { sections: list });
        }
        if (/opening hours/i.test(message)) {
            return call("add_section", {
                key: "find",
                style: "place",
                rows: [{ days: "Tuesday to Friday", time: "7 to 4" }],
            });
        }
        if (/review/i.test(message)) {
            return call("add_section", {
                key: "proof",
                rows: [{ text: "The best bowls in town", by: "Sam Lee" }],
            });
        }
        if (/publish/i.test(message)) return call("request_publish", {});
        if (/which/i.test(message)) {
            return call("offer_choices", { question: "Which one?", options: ["Corners", "Fill"] });
        }
        if (/dog walker|build/i.test(message)) {
            return call("build_page", {
                name: "Halifax Dog Walking",
                tagline: "A dog walker in Halifax",
                look: "biscuit",
                sections: [{ key: "about", fields: { text: "I'm a dog walker in Halifax." } }],
            });
        }
        if (/photo of/i.test(message)) {
            return call("find_photos", { query: "surf lesson", for: "header" });
        }
        if (/logo/i.test(message)) {
            return call("make_image", { prompt: "a wave", kind: "logo", for: "header" });
        }
        if (/my site is/i.test(message)) {
            const url = /https?:\/\/\S+/.exec(message)?.[0] ?? "";
            return call("read_website", { url });
        }
        return say("You could add your social icons, or a short line about you.");
    },
};

const dot = async (colour: string) =>
    sharp({ create: { width: 64, height: 64, channels: 3, background: colour } })
        .png()
        .toBuffer();

/** Canned answers for anything a turn reaches outside the page. */
export const standInReach: Reach = {
    imageCredits: 3,
    readWebsite: () =>
        Promise.resolve({
            ok: true,
            usage: { input: 10, cached: 0, output: 5 },
            facts: "name: Low Tide Surf\ntagline: Learn to surf in Tofino",
        }),
    findPhotos: async () => {
        const thumb = (await dot("#7aa")).toString("base64");
        const webp = await sharp(Buffer.from(thumb, "base64")).webp().toBuffer();
        return [
            {
                url: "https://photos.example/one.png",
                thumb: `data:image/webp;base64,${webp.toString("base64")}`,
                alt: "A surf lesson",
                credit: "A photographer",
                creditUrl: "https://photos.example/a",
                provider: "Openverse",
                providerUrl: "https://openverse.org",
                licence: "CC0",
            },
        ];
    },
};

export const standInImage = async (prompt: string): Promise<Uint8Array> => {
    const hue = createHash("sha1").update(prompt).digest("hex").slice(0, 6);
    return new Uint8Array(await dot(`#${hue}`));
};

export const standInDownload = async (): Promise<Uint8Array> =>
    new Uint8Array(await dot("#88aa77"));
