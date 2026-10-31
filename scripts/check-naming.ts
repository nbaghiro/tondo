// Keeps one naming style per folder: PascalCase UI files in components/ and layouts/, and lowercase
// with hyphens everywhere else. CSS only lives in styles/.

import { readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PASCAL_FOLDERS = new Set(["components", "layouts"]);
const PASCAL = /^[A-Z][A-Za-z0-9]*(\.test)?\.(tsx|astro)$/;
const LOWER = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+)*$/;
// Astro names a route with a parameter this way.
const ROUTE_PARAM = /^\[[a-z]+\]\.astro$/;
const SKIP = new Set(["node_modules", "dist", "migrations"]);
const ROOT_EXCEPTIONS = new Set(["README.md", "AGENTS.md"]);

function check(root: string, dir: string, errors: string[]): void {
    for (const entry of readdirSync(dir)) {
        if (entry.startsWith(".") || SKIP.has(entry)) continue;
        const path = join(dir, entry);
        const name = relative(root, path);
        if (statSync(path).isDirectory()) {
            if (!LOWER.test(entry)) errors.push(`${name}: folder names are lowercase with hyphens`);
            check(root, path, errors);
            continue;
        }
        if (dir === root && ROOT_EXCEPTIONS.has(entry)) continue;
        if (PASCAL_FOLDERS.has(basename(dir))) {
            if (!PASCAL.test(entry))
                errors.push(`${name}: files here are PascalCase UI components`);
        } else if (!LOWER.test(entry) && !(basename(dir) === "pages" && ROUTE_PARAM.test(entry))) {
            errors.push(`${name}: files here are lowercase with hyphens`);
        }
        if (entry.endsWith(".css") && !name.split(sep).includes("styles")) {
            errors.push(`${name}: CSS belongs in a styles/ folder`);
        }
    }
}

export function checkNaming(root: string): string[] {
    const errors: string[] = [];
    check(root, root, errors);
    return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const errors = checkNaming(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
    if (errors.length) {
        process.stderr.write(`Naming check failed:\n${errors.map((e) => `  ${e}`).join("\n")}\n`);
        process.exit(1);
    }
    process.stdout.write("Names are consistent.\n");
}
