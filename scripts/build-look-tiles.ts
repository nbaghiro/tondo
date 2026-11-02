// Redraws the picture on each tile in the look picker: the look's art with no words on it, from the
// real renderer. The tile draws its own sample over this, and a name would sit underneath that. Run this with the dev servers up after changing a look: pnpm looks:images
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { starterPage } from "@tondo/page";
import type { LookName } from "@tondo/page";
import { looks, renderDocument } from "@tondo/render";
import sharp from "sharp";

const out = "packages/brand/photos/looks";
const site = process.env["SITE"] ?? "http://localhost:8101";

const base = starterPage("Your name");
const browser = await chromium.launch(process.env["CI"] ? {} : { channel: "chrome" });
const tab = await browser.newPage({ viewport: { width: 360, height: 456 } });
// The look's art is drawn from the site's fonts and photos, so the tile needs a real address.
await tab.route(`${site}/tile`, (route) => route.fulfill({ contentType: "text/html", body: "" }));
await tab.goto(`${site}/tile`);
for (const name of Object.keys(looks) as LookName[]) {
    const html = renderDocument(
        { ...base, look: name, header: { ...base.header, layout: "look" } },
        { title: name, assetBase: `${site}/photos/`, editable: false, live: true },
    );
    await tab.setContent(html, { waitUntil: "load" });
    await tab.addStyleTag({ content: "h1, p, a, ul { visibility: hidden !important; }" });
    const png = await tab.screenshot({ type: "png" });
    await sharp(png)
        .jpeg({ quality: 80 })
        .toFile(join(out, `${name}.jpg`));
}
await browser.close();
