import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SKIP = new Set(["node_modules", "dist", ".astro", ".turbo", "migrations", "public"]);

export function* filesUnder(dir: string, match: RegExp): Generator<string> {
    for (const entry of readdirSync(dir)) {
        if (SKIP.has(entry)) continue;
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) yield* filesUnder(path, match);
        else if (match.test(entry)) yield path;
    }
}
