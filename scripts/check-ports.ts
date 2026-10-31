// Fails if a config file uses a host port outside the list in ports.ts, publishes a Docker port beyond
// loopback, or lets Vite move to another port when its own is taken.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PORT_RANGE, PORTS } from "./ports";
import { filesUnder } from "./source-files";

const CONFIG = /^(package\.json|.*\.config\.[cm]?[jt]s|\.env\.example|.*\.ya?ml)$/;
const CODE = /\.(ts|tsx|mjs|astro)$/;
const SELF = /scripts\/|\.test\.tsx?$/;

export function findPortProblems(file: string, text: string, known: ReadonlySet<number>): string[] {
    const errors: string[] = [];
    for (const match of text.matchAll(
        /(?:127\.0\.0\.1|localhost|0\.0\.0\.0|--port[ =]|\bport:\s*|PORT=|\?\? )(?::)?(\d{4,5})\b/g,
    )) {
        const port = Number(match[1]);
        if (!known.has(port)) errors.push(`${file}: port ${port} isn't listed in scripts/ports.ts`);
    }
    if (file.includes("docker-compose")) {
        for (const match of text.matchAll(/^\s*-\s*"?([\d.]*:)?(\d+):(\d+)"?\s*$/gm)) {
            if (match[1] !== "127.0.0.1:") {
                errors.push(`${file}: ${match[0].trim()} must be published on 127.0.0.1 only`);
            }
            if (!known.has(Number(match[2]))) {
                errors.push(`${file}: port ${match[2]} isn't listed in scripts/ports.ts`);
            }
        }
    }
    if (file.includes("vite.config") && /\bport:/.test(text) && !/strictPort:\s*true/.test(text)) {
        errors.push(`${file}: set strictPort so Vite can't drift onto a sibling's port`);
    }
    return errors;
}

export function checkPorts(root: string): string[] {
    const known = new Set<number>(Object.values(PORTS));
    const errors: string[] = [];
    if (known.size !== Object.keys(PORTS).length)
        errors.push("scripts/ports.ts: a port is listed twice");
    for (const port of known) {
        if (port < PORT_RANGE.first || port > PORT_RANGE.last) {
            errors.push(`scripts/ports.ts: ${port} is outside Tondo's block`);
        }
    }
    const rootFiles = ["docker-compose.yml", ".env.example", ".github/workflows/ci.yml"]
        .map((file) => join(root, file))
        .filter((file) => existsSync(file));
    const workspaceFiles = ["apps", "packages"].flatMap((dir) => [
        ...filesUnder(join(root, dir), CONFIG),
        ...filesUnder(join(root, dir), CODE),
    ]);
    for (const file of [...rootFiles, ...new Set(workspaceFiles)]) {
        const name = relative(root, file);
        if (SELF.test(name)) continue;
        errors.push(...findPortProblems(name, readFileSync(file, "utf8"), known));
    }
    return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const errors = checkPorts(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
    if (errors.length) {
        process.stderr.write(`Port check failed:\n${errors.map((e) => `  ${e}`).join("\n")}\n`);
        process.exit(1);
    }
    process.stdout.write(`Ports stay inside ${PORT_RANGE.first} to ${PORT_RANGE.last}.\n`);
}
