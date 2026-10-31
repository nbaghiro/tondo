// Run by hand when adding a port: looks for Tondo's ports in sibling repos' configs and on this machine.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PORTS } from "./ports";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG =
    /^(docker-compose.*\.ya?ml|package\.json|vite\.config\.\w+|astro\.config\.\w+|Makefile|\.env\.example)$/;
const SKIP = new Set(["node_modules", ".git", "dist", "public", "build", ".venv"]);

function* configs(dir: string, depth: number): Generator<string> {
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        const stats = statSync(path, { throwIfNoEntry: false });
        if (!stats) continue;
        if (stats.isDirectory()) {
            if (depth > 0 && !SKIP.has(entry)) yield* configs(path, depth - 1);
        } else if (CONFIG.test(entry)) yield path;
    }
}

const ports = Object.values(PORTS);
const pattern = new RegExp(`\\b(${ports.join("|")})\\b`);
const parent = dirname(ROOT);
let problems = 0;

for (const sibling of readdirSync(parent)) {
    const dir = join(parent, sibling);
    if (dir === ROOT || !statSync(dir).isDirectory()) continue;
    for (const file of configs(dir, 3)) {
        const hit = pattern.exec(readFileSync(file, "utf8"));
        if (hit) {
            problems += 1;
            process.stdout.write(`${sibling}/${basename(file)} mentions ${hit[1]}\n`);
        }
    }
}

const listening = execFileSync("sh", ["-c", "lsof -nP -iTCP -sTCP:LISTEN || true"], {
    encoding: "utf8",
});
for (const [service, port] of Object.entries(PORTS)) {
    const line = listening.split("\n").find((l) => l.includes(`:${port} `));
    process.stdout.write(
        `${port} ${service}: ${line ? `in use by ${line.split(/\s+/)[0]}` : "free"}\n`,
    );
}
process.stdout.write(
    problems
        ? `${problems} sibling config(s) to check.\n`
        : "No sibling config uses these ports.\n",
);
