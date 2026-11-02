import { createHash } from "node:crypto";
import { routes } from "@tondo/contract";
import type { PageStore } from "@tondo/db";
import { photosIn } from "@tondo/page";
import type { Limits, Page } from "@tondo/page";
import type { ErrorResponse, PhotosResponse } from "@tondo/contract";
import type { Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import sharp from "sharp";
import type { CurrentPerson } from "./auth";
import { limitsOf, photoLimitMessage } from "./limits";
import type { LimitsOfPerson } from "./limits";
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
let converting = 0;

const hostOf = (origin: string) => {
    try {
        return new URL(origin).host;
    } catch {
        return null;
    }
};

const sha = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
/** Each page has its own folder, so image addresses don't connect one person's pages. A person's
 * own folder holds what's uploaded before their first page exists. */
export const folderFor = (id: string) => `uploads/${sha(id).slice(0, 16)}/`;

type PhotoPages = Pick<PageStore, "listPages">;

export async function foldersOf(pages: PhotoPages, userId: string): Promise<string[]> {
    const own = await pages.listPages(userId);
    return [...new Set([userId, ...own.map((page) => page.id)])].map(folderFor);
}

/** Everything one person has stored, across their folders. It's what the photo limit counts. */
export async function listPhotos(
    storage: Storage,
    pages: PhotoPages,
    userId: string,
): Promise<string[]> {
    const folders = await foldersOf(pages, userId);
    return (await Promise.all(folders.map((folder) => storage.list(folder)))).flat();
}

/** Whose photos are in play when someone works on a page. Null if they can't reach it. */
export interface PhotoScope {
    /** The id of the folder a new photo goes in. */
    folder: string;
    folders: string[];
    limits: Limits;
    documents: () => Promise<Page[]>;
    /** Moves the pages in this scope to another folder's paths, after the files are copied. */
    move: (from: string, to: string) => Promise<void>;
    /** The folder for photos still in use when a page goes. */
    fallback: string;
}

type ScopePages = Pick<
    PageStore,
    | "findDraft"
    | "listPages"
    | "documentsOf"
    | "movePhotos"
    | "teamPageIds"
    | "documentsOfTeam"
    | "moveTeamPhotos"
>;

const personScope = async (
    pages: ScopePages,
    userId: string,
    folder: string,
    limitsOfPerson: LimitsOfPerson,
): Promise<PhotoScope> => ({
    folder,
    folders: await foldersOf(pages, userId),
    limits: await limitsOfPerson(userId),
    documents: () => pages.documentsOf(userId),
    move: (from, to) => pages.movePhotos(userId, from, to),
    fallback: userId,
});

// A team's own pages have the owner's allowance, and a joined page has its person's, whoever's editing.
export async function photoScope(
    pages: ScopePages,
    userId: string,
    pageId: string | undefined,
    limitsOfPerson: LimitsOfPerson,
): Promise<PhotoScope | null> {
    if (!pageId) return personScope(pages, userId, userId, limitsOfPerson);
    const draft = await pages.findDraft(userId, pageId);
    if (!draft) return null;
    if (draft.userId) return personScope(pages, draft.userId, pageId, limitsOfPerson);
    const { team } = draft;
    if (!team) return null;
    const ids = await pages.teamPageIds(team.id);
    return {
        folder: pageId,
        folders: ids.map(folderFor),
        limits: limitsOf(draft.standing.account),
        documents: () => pages.documentsOfTeam(team.id),
        move: (from, to) => pages.moveTeamPhotos(team.id, from, to),
        fallback: team.lookPageId,
    };
}

export const listInScope = async (storage: Storage, scope: PhotoScope): Promise<string[]> =>
    (await Promise.all(scope.folders.map((folder) => storage.list(folder)))).flat();

/**
 * Empties a page's folder before the page goes. Photos other pages still use move to the fallback
 * folder, because nothing could find that folder again once its page has gone.
 */
export async function clearPageFolder(
    storage: Storage,
    scope: Pick<PhotoScope, "documents" | "move" | "fallback">,
    pageId: string,
): Promise<void> {
    const from = folderFor(pageId);
    const to = folderFor(scope.fallback);
    const files = await storage.list(from);
    if (!files.length) return;
    const inUse = new Set(photosIn(await scope.documents()).map((photo) => photo.file));
    await Promise.all(
        files
            .filter((file) => inUse.has(file))
            .map(async (file) => {
                const bytes = await storage.get(file);
                if (bytes) await storage.put(file.replace(from, to), bytes, "image/webp");
            }),
    );
    await scope.move(from, to);
    await Promise.all(files.map((file) => storage.remove(file)));
}

const isUpload = (file: string) => UPLOAD_KEY.test(file);

/** A document with its own copies of the photos it uses, in this page's folder. */
export async function copyPhotosInto(storage: Storage, page: Page, pageId: string): Promise<Page> {
    const to = folderFor(pageId);
    let text = JSON.stringify(page);
    const files = new Set(
        photosIn(page)
            .map((photo) => photo.file)
            .filter(isUpload),
    );
    for (const file of files) {
        const bytes = await storage.get(file);
        if (!bytes) continue;
        const copy = `${to}${file.slice(file.lastIndexOf("/") + 1)}`;
        await storage.put(copy, bytes, "image/webp");
        text = text.replaceAll(file, copy);
    }
    return JSON.parse(text) as Page;
}

/** Brings a page's photos from other folders into its own, once it has a person of its own. */
export async function ownPhotos(
    storage: Storage,
    pages: Pick<PageStore, "documentsOfPage" | "replaceInPage">,
    pageId: string,
): Promise<void> {
    const to = folderFor(pageId);
    const documents = await pages.documentsOfPage(pageId);
    const files = new Set(
        photosIn(documents)
            .map((photo) => photo.file)
            .filter((file) => isUpload(file) && !file.startsWith(to)),
    );
    for (const file of files) {
        const bytes = await storage.get(file);
        if (!bytes) continue;
        const copy = `${to}${file.slice(file.lastIndexOf("/") + 1)}`;
        await storage.put(copy, bytes, "image/webp");
        await pages.replaceInPage(pageId, file, copy);
    }
}

export const isBusy = () => converting >= MAX_CONVERTING;

/**
 * Converts and keeps one image, from an upload or a picked result. Null if it can't be read.
 * Converting drops anything else in the file, such as location data or hidden content.
 */
export async function storePhoto(
    storage: Storage,
    owner: string,
    input: Uint8Array,
): Promise<string | null> {
    if (!isAllowedImage(input)) return null;
    // Converting takes a lot of memory, so only a few run at once.
    converting += 1;
    const output = await sharp(input, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS })
        .rotate()
        .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer()
        .catch(() => null)
        .finally(() => {
            converting -= 1;
        });
    if (!output) return null;
    const file = `${folderFor(owner)}${sha(output).slice(0, 32)}.webp`;
    await storage.put(file, output, "image/webp");
    return file;
}

export function mountPhotos(
    app: Hono,
    storage: Storage | null,
    currentPerson: CurrentPerson,
    {
        scale,
        pages,
        limitsOfPerson,
    }: { scale: Scale; pages: PageStore; limitsOfPerson: LimitsOfPerson },
): void {
    const fail = (
        c: Context,
        status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 429 | 503,
        error: string,
        code?: string,
    ) => c.json<ErrorResponse>({ error, ...(code ? { code } : {}) }, status);
    const NOT_SET_UP = "Photo uploads aren't set up here yet.";
    const allowUpload = createLimiter(scale(30), 60_000);

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
        const scope = await photoScope(pages, person.id, c.req.query("page"), limitsOfPerson);
        if (!scope) return fail(c, 404, "We couldn't find that page.");
        const files = storage ? await listInScope(storage, scope) : [];
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

            const scope = await photoScope(pages, person.id, c.req.query("page"), limitsOfPerson);
            if (!scope) return fail(c, 404, "We couldn't find that page.");
            const { limits } = scope;
            const existing = await listInScope(storage, scope);
            if (existing.length >= limits.photos) {
                return fail(c, 413, photoLimitMessage(limits), "plan_limit");
            }

            if (isBusy()) {
                return fail(c, 503, "We're busy with other photos. Try again in a moment.");
            }
            const file = await storePhoto(storage, scope.folder, input);
            if (!file) return fail(c, 415, refused);
            return c.json({ file }, 201);
        },
    );

    app.delete(routes.photo(":file").replace("%3A", ":"), async (c) => {
        if (!c.req.header("content-type")?.startsWith("application/json")) {
            return fail(c, 415, "Send this as JSON.");
        }
        const origin = c.req.header("origin");
        if (origin && hostOf(origin) !== c.req.header("host")) {
            return fail(c, 403, "This request came from another site.");
        }
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        if (!storage) return fail(c, 503, NOT_SET_UP);
        if (!allowUpload(person.id)) {
            return fail(c, 429, "That's a lot of photos at once. Wait a little and try again.");
        }
        const key = c.req.param("file") ?? "";
        const scope = await photoScope(pages, person.id, c.req.query("page"), limitsOfPerson);
        if (!UPLOAD_KEY.test(key) || !scope?.folders.some((folder) => key.startsWith(folder))) {
            return fail(c, 404, "We couldn't find that photo.");
        }
        const documents = await scope.documents();
        if (photosIn(documents).some((photo) => photo.file === key)) {
            return fail(c, 409, "This photo is on your page. Take it off first.");
        }
        await storage.remove(key);
        return c.body(null, 204);
    });
}
