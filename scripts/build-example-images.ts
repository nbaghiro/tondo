// Redraws the screenshots the marketing site shows of its example pages. Run this with the dev
// servers up after changing a look or an example page: pnpm examples:images
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const site = process.env["SITE"] ?? "http://localhost:8103";
const data = "apps/marketing/src/data";
const shots = "apps/marketing/public/shots";
const strip = "apps/marketing/public/auth-strip";

interface Example {
    id: string;
    handle: string;
}
const examples = JSON.parse(readFileSync(join(data, "examples.json"), "utf8")) as Example[];
const hidden: Example[] = [
    { id: "june", handle: "juneaster" },
    { id: "rae", handle: "raebell" },
];

rmSync(strip, { recursive: true, force: true });
mkdirSync(shots, { recursive: true });
mkdirSync(strip, { recursive: true });

const browser = await chromium.launch(process.env["CI"] ? {} : { channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
for (const { id, handle } of [...examples, ...hidden]) {
    await page.goto(`${site}/${handle}`);
    await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
            [...document.images].map((image) => {
                image.loading = "eager";
                return image.decode().catch(() => undefined);
            }),
        );
    });
    const png = await page.screenshot({ type: "png" });
    await sharp(png)
        .jpeg({ quality: 78 })
        .toFile(join(shots, `${id}.jpg`));
    await sharp(png)
        .resize({ width: 360 })
        .jpeg({ quality: 68 })
        .toFile(join(strip, `${id}.jpg`));
}
await browser.close();
process.stdout.write(`Drew ${String(examples.length + hidden.length)} pages.\n`);
