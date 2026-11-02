import { starterPage } from "@tondo/page";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app";
import { folderFor } from "./photos";
import { createFakePages, createFakeStore } from "./fake-store";
import { createMemoryStorage } from "./storage";

const neon = {
    baseUrl: "https://ep-test.neonauth.example.com/neondb/auth",
    cookieSecret: "a-test-secret-that-is-long-enough-to-use",
};
const stamp = "2026-01-01T00:00:00.000Z";
const session = (id: string) => ({
    session: {
        id,
        token: id,
        userId: id,
        expiresAt: "2099-01-01T00:00:00.000Z",
        createdAt: stamp,
        updatedAt: stamp,
    },
    user: {
        id,
        email: `${id}@example.com`,
        name: id,
        emailVerified: true,
        createdAt: stamp,
        updatedAt: stamp,
    },
});

function setup() {
    vi.stubGlobal("fetch", (_url: string, init?: RequestInit) => {
        const cookie = new Headers(init?.headers).get("cookie") ?? "";
        const id = /session_token=(\w+)/.exec(cookie)?.[1];
        return Promise.resolve(Response.json(id && id !== "nobody" ? session(id) : null));
    });
    const pages = createFakePages();
    pages.addUser("june", "june", starterPage("June"));
    const storage = createMemoryStorage();
    const app = createApp({
        pages: pages.store,
        storage,
        auth: { store: createFakeStore(), siteUrl: "http://site", editorUrl: "http://e", neon },
    });
    const upload = (bytes: Uint8Array | string, who = "june", origin?: string, page?: string) => {
        const form = new FormData();
        form.append("photo", new File([bytes], "photo.bin"));
        return app.request(`http://localhost/api/v1/me/photos${page ? `?page=${page}` : ""}`, {
            method: "POST",
            headers: {
                cookie: `__Secure-neon-auth.session_token=${who}`,
                host: "localhost",
                ...(origin ? { origin } : {}),
            },
            body: form,
        });
    };
    return { app, upload, storage, pages };
}

const png = () =>
    sharp({ create: { width: 3000, height: 1000, channels: 3, background: "#a42a55" } })
        .png()
        .toBuffer();

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("photo uploads", () => {
    it("converts and shrinks a photo, and serves it safely", async () => {
        const { upload, app } = setup();
        const res = await upload(await png());
        expect(res.status).toBe(201);
        const { file } = (await res.json()) as { file: string };
        expect(file).toMatch(/^uploads\/[a-f0-9]{16}\/[a-f0-9]{32}\.webp$/);

        const served = await app.request(`/photos/${file}`);
        expect(served.status).toBe(200);
        expect(served.headers.get("content-type")).toBe("image/webp");
        expect(served.headers.get("x-content-type-options")).toBe("nosniff");
        const meta = await sharp(Buffer.from(await served.arrayBuffer())).metadata();
        expect(meta.format).toBe("webp");
        expect(meta.width).toBe(1600);
    });

    it("refuses SVG, scripts and files pretending to be images", async () => {
        const { upload } = setup();
        const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
        expect((await upload(svg)).status).toBe(415);
        expect((await upload("<html><script>alert(1)</script>")).status).toBe(415);
        expect((await upload(new Uint8Array([0xff, 0xd8, 0xff, 0, 1, 2]))).status).toBe(415);
    });

    it("needs a session, and keeps each person's list to themselves", async () => {
        const { upload, app } = setup();
        expect((await upload(await png(), "nobody")).status).toBe(401);
        await upload(await png(), "june");
        const list = (who: string) =>
            app.request("/api/v1/me/photos", {
                headers: { cookie: `__Secure-neon-auth.session_token=${who}` },
            });
        const mine = (await (await list("june")).json()) as { files: string[] };
        const theirs = (await (await list("rae")).json()) as { files: string[] };
        expect(mine.files).toHaveLength(1);
        expect(theirs.files).toEqual([]);
    });

    it("refuses uploads from another site, oversized files, and made-up addresses", async () => {
        const { upload, app } = setup();
        expect((await upload(await png(), "june", "https://evil.example.com")).status).toBe(403);
        expect((await upload(new Uint8Array(12 * 1024 * 1024 + 10))).status).toBe(413);
        expect((await app.request("/photos/uploads/nope/nope.webp")).status).toBe(404);
        expect(
            (await app.request("/photos/uploads/0123456789abcdef/..%2f..%2fsecret.webp")).status,
        ).toBe(404);
    });
});

describe("plans and photos", () => {
    const remove = (app: ReturnType<typeof createApp>, file: string, who = "june") =>
        app.request(`http://localhost/api/v1/me/photos/${encodeURIComponent(file)}`, {
            method: "DELETE",
            headers: {
                "content-type": "application/json",
                cookie: `__Secure-neon-auth.session_token=${who}`,
            },
            body: "{}",
        });
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("stops a 26th photo on Free, with a code the editor can read", async () => {
        vi.stubEnv("PLANS_ON", "true");
        const { upload, storage } = setup();
        for (let i = 0; i < 25; i++) {
            await storage.put(
                `${folderFor("june")}${String(i).padStart(32, "0")}.webp`,
                new Uint8Array(1),
                "image/webp",
            );
        }
        const res = await upload(await png());
        expect(res.status).toBe(413);
        expect(await res.json()).toMatchObject({
            code: "plan_limit",
            error: expect.stringContaining("25 photos") as string,
        });
    });

    it("removes only a person's own photo that's not in use", async () => {
        const { app, upload, pages, storage } = setup();
        const { file } = (await (await upload(await png())).json()) as { file: string };
        await remove(app, file, "maya");
        expect(await storage.get(file)).not.toBeNull();
        pages.setDraft("june", {
            ...starterPage("June"),
            header: { ...starterPage("June").header, photo: { file } },
        });
        expect((await remove(app, file)).status).toBe(409);
        pages.setDraft("june", starterPage("June"));
        expect((await remove(app, file)).status).toBe(204);
        expect((await remove(app, "../../etc")).status).toBe(404);
    });
});

describe("photos by page", () => {
    const list = async (app: ReturnType<typeof createApp>) => {
        const res = await app.request("http://localhost/api/v1/me/photos", {
            headers: { cookie: "__Secure-neon-auth.session_token=june" },
        });
        return ((await res.json()) as { files: string[] }).files;
    };
    const fileFrom = async (res: Response) => ((await res.json()) as { file: string }).file;

    it("keeps each page in its own folder, and lists and limits them together", async () => {
        const { app, upload, pages } = setup();
        const second = await pages.store.createPage("june", "band", starterPage("Band"));
        const own = await fileFrom(await upload(await png()));
        const band = await fileFrom(await upload(await png(), "june", undefined, second ?? ""));
        expect(band.split("/")[1]).not.toBe(own.split("/")[1]);
        expect(await list(app)).toHaveLength(2);
    });

    it("won't store a photo on someone else's page", async () => {
        const { upload, pages } = setup();
        pages.addUser("rae", "rae", starterPage("Rae"));
        expect((await upload(await png(), "june", undefined, "rae")).status).toBe(404);
    });

    it("refuses to remove a photo used on another of the person's pages", async () => {
        const { app, upload, pages } = setup();
        const second = (await pages.store.createPage("june", "band", starterPage("Band"))) ?? "";
        const file = await fileFrom(await upload(await png(), "june", undefined, second));
        pages.setDraft("june", {
            ...starterPage("June"),
            header: { ...starterPage("June").header, photo: { file } },
        });
        const res = await app.request(
            `http://localhost/api/v1/me/photos/${encodeURIComponent(file)}`,
            {
                method: "DELETE",
                headers: {
                    "content-type": "application/json",
                    cookie: "__Secure-neon-auth.session_token=june",
                },
                body: "{}",
            },
        );
        expect(res.status).toBe(409);
    });

    it("clears a deleted page's folder, keeping what another page still uses", async () => {
        const { app, upload, pages, storage } = setup();
        const second = (await pages.store.createPage("june", "band", starterPage("Band"))) ?? "";
        const kept = await fileFrom(await upload(await png(), "june", undefined, second));
        const other = await sharp({
            create: { width: 40, height: 40, channels: 3, background: "#123456" },
        })
            .png()
            .toBuffer();
        const dropped = await fileFrom(await upload(other, "june", undefined, second));
        pages.setDraft("june", {
            ...starterPage("June"),
            header: { ...starterPage("June").header, photo: { file: kept } },
        });
        const res = await app.request(`http://localhost/api/v1/me/pages/${second}`, {
            method: "DELETE",
            headers: {
                "content-type": "application/json",
                cookie: "__Secure-neon-auth.session_token=june",
            },
            body: "{}",
        });
        expect(res.status).toBe(204);
        expect(await storage.get(kept)).toBeNull();
        expect(await storage.get(dropped)).toBeNull();
        const moved = (await pages.store.findDraft("june", "june"))?.page.header.photo;
        const file = moved && "file" in moved ? moved.file : "";
        expect(file.startsWith(folderFor("june"))).toBe(true);
        expect(await storage.get(file)).not.toBeNull();
        expect(await list(app)).toEqual([file]);
    });
});
