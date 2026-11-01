import { createHash } from "node:crypto";
import { routes } from "@tondo/contract";
import type { ErrorResponse, PhotosResponse } from "@tondo/contract";
import type { Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import sharp from "sharp";
import type { CurrentPerson } from "./auth";
import { limitsFor } from "./limits";
import { createLimiter } from "./traffic";
import type { Scale } from "./traffic";
import type { Storage } from "./storage";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_INPUT_PIXELS = 50_000_000;
const MAX_SIDE = 1600;
const UPLOAD_KEY = /^uploads\/[a-f0-9]{16}\/[a-f0-9]{32}\.webp$/;

// Only these, told apart by their first bytes. SVG is out because it can carry scripts.
function isAllowedImage(bytes: Uint8Array): boolean {
    const starts = (...values: number[]) => values.every((value, i) => bytes[i] === value);
    const jpeg = starts(0xff, 0xd8, 0xff);
    const png = starts(0x89, 0x50, 0x4e, 0x47);
    const riff = starts(0x52, 0x49, 0x46, 0x46);
    const webp = riff && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
    return jpeg || png || webp;
}

const MAX_CONVERTING = 3;

const hostOf = (origin: string) => {
    try {
        return new URL(origin).host;
    } catch {
        return null;
    }
};

const sha = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
export const folderFor = (userId: string) => `uploads/${sha(userId).slice(0, 16)}/`;

export function mountPhotos(
    app: Hono,
    storage: Storage | null,
    currentPerson: CurrentPerson,
    scale: Scale,
): void {
    const fail = (c: Context, status: 400 | 401 | 403 | 413 | 415 | 429 | 503, error: string) =>
        c.json<ErrorResponse>({ error }, status);
    const NOT_SET_UP = "Photo uploads aren't set up here yet.";
    const allowUpload = createLimiter(scale(30), 60_000);
    let converting = 0;

    // Everything stored here went through the conversion below, so it's always this one type.
    app.get("/photos/uploads/:folder/:file", async (c) => {
        const key = `uploads/${c.req.param("folder")}/${c.req.param("file")}`;
        if (!storage || !UPLOAD_KEY.test(key)) return c.notFound();
        const bytes = await storage.get(key);
        if (!bytes) return c.notFound();
        return c.body(new Uint8Array(bytes), 200, {
            "Content-Type": "image/webp",
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; sandbox",
        });
    });

    app.get(routes.photos, async (c) => {
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        const files = storage ? await storage.list(folderFor(person.id)) : [];
        return c.json<PhotosResponse>({ files });
    });

    app.post(
        routes.photos,
        bodyLimit({
            maxSize: MAX_UPLOAD_BYTES,
            onError: (c) => fail(c, 413, "That photo is too large. The limit is 12 MB."),
        }),
        async (c) => {
            // Uploads are forms, which other sites can send, so this checks where it came from.
            const origin = c.req.header("origin");
            if (origin && hostOf(origin) !== c.req.header("host")) {
                return fail(c, 403, "This upload came from another site.");
            }
            const person = await currentPerson(c);
            if (!person) return fail(c, 401, "You're not logged in.");
            if (!storage) return fail(c, 503, NOT_SET_UP);
            if (!allowUpload(person.id)) {
                return fail(c, 429, "That's a lot of photos at once. Wait a little and try again.");
            }

            const form = await c.req.parseBody().catch(() => null);
            const photo = form?.["photo"];
            if (!(photo instanceof File)) return fail(c, 400, "Choose a photo to upload.");
            const input = new Uint8Array(await photo.arrayBuffer());
            const refused = "Use a JPEG, PNG or WebP photo.";
            if (!isAllowedImage(input)) return fail(c, 415, refused);

            const folder = folderFor(person.id);
            const existing = await storage.list(folder);
            if (existing.length >= limitsFor(person.id).photos) {
                return fail(c, 413, "You've reached the limit for photos.");
            }

            // Converting takes a lot of memory, so only a few run at once.
            if (converting >= MAX_CONVERTING) {
                return fail(c, 503, "We're busy with other photos. Try again in a moment.");
            }
            converting += 1;
            // Converting drops anything else in the file, such as location data or hidden content.
            const output = await sharp(input, {
                failOn: "error",
                limitInputPixels: MAX_INPUT_PIXELS,
            })
                .rotate()
                .resize({
                    width: MAX_SIDE,
                    height: MAX_SIDE,
                    fit: "inside",
                    withoutEnlargement: true,
                })
                .webp({ quality: 82 })
                .toBuffer()
                .catch(() => null)
                .finally(() => {
                    converting -= 1;
                });
            if (!output) return fail(c, 415, refused);

            const file = `${folder}${sha(output).slice(0, 32)}.webp`;
            await storage.put(file, output, "image/webp");
            return c.json({ file }, 201);
        },
    );
}
