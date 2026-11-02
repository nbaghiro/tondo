import { isOnline } from "@tondo/page";
import type { PublishedPage } from "@tondo/db";
import { limitsOf } from "./limits";

/** The sitemap's text: every page visitors can see now. Addresses are limited to safe characters. */
export function sitemapXml(origin: string, published: readonly PublishedPage[]): string {
    const urls = published
        .filter((page) => isOnline(limitsOf(page), page.rank))
        .map((page) => `<url><loc>${origin}/${page.handle}</loc></url>`)
        .join("");
    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}
