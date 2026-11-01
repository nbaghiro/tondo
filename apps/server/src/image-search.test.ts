import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import type { GetOne } from "./fetch-page";
import { createPhotoSearch, downloadPhoto, searchOpenverse, searchPexels } from "./image-search";

const signal = new AbortController().signal;
const json = (body: object) => Promise.resolve(new Response(JSON.stringify(body)));
const tiny = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#789" } })
    .png()
    .toBuffer();
const images: GetOne = () =>
    Promise.resolve({
        status: 200,
        type: "image/png",
        location: null,
        bytes: new Uint8Array(tiny),
    });
const pexels = {
    photos: [
        {
            url: "https://www.pexels.com/photo/1",
            alt: "A wave",
            photographer: "Sam",
            photographer_url: "https://www.pexels.com/@sam",
            src: {
                large: "https://images.pexels.com/1-l.jpg",
                small: "https://images.pexels.com/1-s.jpg",
            },
        },
    ],
};
const openverse = {
    results: [
        {
            url: "https://example.org/w.jpg",
            thumbnail: "https://api.openverse.org/t.jpg",
            title: "Wave",
            creator: "Lee",
            license: "cc0",
        },
    ],
};

describe("stock photos", () => {
    it("sends the Pexels key as a header and credits the photographer", async () => {
        const fetchImpl = vi.fn<typeof fetch>(() => json(pexels));
        const [photo] = await searchPexels("key", "surf", signal, fetchImpl);
        expect(new Headers(fetchImpl.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("key");
        expect(JSON.stringify(fetchImpl.mock.calls[0]?.[0])).not.toContain("key");
        expect(photo).toMatchObject({ credit: "Sam", provider: "Pexels" });
    });

    it("asks Openverse for public domain marks only", async () => {
        const fetchImpl = vi.fn<typeof fetch>(() => json(openverse));
        const [photo] = await searchOpenverse("surf", signal, fetchImpl);
        expect(JSON.stringify(fetchImpl.mock.calls[0]?.[0])).toContain("license=cc0%2Cpdm");
        expect(photo).toMatchObject({ licence: "CC0", provider: "Openverse" });
    });

    it("hides Pexels with no key, and falls back to Openverse when it finds nothing", async () => {
        const noKey = vi.fn<typeof fetch>(() => json(openverse));
        const found = await createPhotoSearch(undefined, images, noKey)("surf", signal);
        expect(JSON.stringify(noKey.mock.calls[0]?.[0])).toContain("openverse");
        expect(found[0]?.thumb).toMatch(/^data:image\/webp;base64,/);

        const empty = vi.fn<typeof fetch>((url) =>
            JSON.stringify(url).includes("pexels") ? json({ photos: [] }) : json(openverse),
        );
        const fallback = await createPhotoSearch("key", images, empty)("surf", signal);
        expect(fallback[0]?.provider).toBe("Openverse");
    });

    it("downloads a pick through the same address checks", async () => {
        await expect(downloadPhoto("http://169.254.169.254/x", signal, images)).rejects.toThrow();
        expect(await downloadPhoto("https://example.org/w.jpg", signal, images)).not.toBeNull();
    });
});
