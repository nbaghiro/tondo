import { routes } from "@tondo/contract";
import type { ErrorResponse, HealthResponse, PageResponse } from "@tondo/contract";
import { handleSchema, normaliseHandle } from "@tondo/page";
import type { Page } from "@tondo/page";
import { renderDocument } from "@tondo/render";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { mountAuth } from "./auth";
import type { AuthConfig } from "./auth";

export interface AppDeps {
    findPage: (handle: string) => Promise<Page | null>;
    photos?: MiddlewareHandler;
    /** Serves the built marketing site and editor, in production. */
    mountSite?: ((app: Hono) => void) | undefined;
    auth: AuthConfig;
}

// Public pages hold other people's content and need no scripts, so the browser is told to run none.
const PAGE_HEADERS = {
    "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' https: data:",
    "X-Content-Type-Options": "nosniff",
};

export function createApp({ findPage, photos, mountSite, auth }: AppDeps) {
    const app = new Hono();
    const notFound: ErrorResponse = { error: "We couldn't find that page." };

    if (photos) app.get("/photos/*", photos);
    app.get(routes.health, (c) => c.json<HealthResponse>({ status: "ok" }));

    mountAuth(app, auth);

    app.get(routes.page(":handle").replace("%3A", ":"), async (c) => {
        const handle = normaliseHandle(c.req.param("handle") ?? "");
        const page = handleSchema.safeParse(handle).success ? await findPage(handle) : null;
        return page ? c.json<PageResponse>({ page }) : c.json(notFound, 404);
    });

    mountSite?.(app);

    app.get("/:handle", async (c) => {
        const handle = normaliseHandle(c.req.param("handle"));
        const page = handleSchema.safeParse(handle).success ? await findPage(handle) : null;
        if (!page) return c.text(notFound.error, 404);
        return c.html(
            renderDocument(page, {
                title: page.header.name,
                assetBase: "/photos/",
                editable: false,
            }),
            200,
            PAGE_HEADERS,
        );
    });

    return app;
}
