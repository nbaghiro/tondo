// Serves the editor experiment and the design pages, which aren't apps yet. Run with pnpm scratchpad.

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { PORTS } from "./ports";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ALLOWED = [join(ROOT, ".scratchpad") + sep, join(ROOT, ".docs") + sep];
const TYPES: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".jpg": "image/jpeg",
};

createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
    const file = resolve(ROOT, `.${path}`);
    const type = TYPES[extname(file)];
    if (
        !type ||
        !ALLOWED.some((dir) => file.startsWith(dir)) ||
        !existsSync(file) ||
        !statSync(file).isFile()
    ) {
        res.writeHead(404).end("Not found");
        return;
    }
    res.writeHead(200, { "Content-Type": type });
    createReadStream(file).pipe(res);
}).listen(PORTS.scratchpad, "127.0.0.1", () => {
    process.stdout.write(`Scratchpad on http://127.0.0.1:${PORTS.scratchpad}\n`);
});
