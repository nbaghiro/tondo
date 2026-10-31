// Lint and type rules only mean something if they can't be switched off in place. If one really has
// to be, change the rule in eslint.config.js, where the decision is visible.

import { readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { filesUnder } from "./source-files";

const SELF = /scripts\/check-suppressions(\.test)?\.ts$/;
const SOURCE = /\.(ts|tsx|mts|js|mjs|astro)$/;
const BANNED: [RegExp, string][] = [
    [/eslint-disable/, "an eslint-disable comment"],
    [/@ts-(ignore|expect-error|nocheck)/, "a TypeScript suppression comment"],
    [/\bas\s+any\b/, "a cast to any"],
    [/\bas\s+unknown\s+as\b/, "a double cast"],
];

export function findSuppressions(file: string, text: string): string[] {
    return BANNED.flatMap(([pattern, what]) =>
        pattern.test(text) ? [`${file}: has ${what}`] : [],
    );
}

export function checkSuppressions(root: string): string[] {
    return ["apps", "packages", "scripts"].flatMap((dir) =>
        [...filesUnder(join(root, dir), SOURCE)]
            .filter((file) => !SELF.test(file))
            .flatMap((file) => findSuppressions(relative(root, file), readFileSync(file, "utf8"))),
    );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const errors = checkSuppressions(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
    if (errors.length) {
        process.stderr.write(
            `Suppression check failed:\n${errors.map((e) => `  ${e}`).join("\n")}\n`,
        );
        process.exit(1);
    }
    process.stdout.write("No suppressions.\n");
}
