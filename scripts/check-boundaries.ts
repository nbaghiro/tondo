// Fails when a workspace reaches somewhere it may not. boundaries.json says what each workspace may
// import, and this checks:
//   1. The rules themselves: every workspace is listed, nothing imports an app, and there are no cycles.
//   2. package.json: workspace dependencies use workspace:*, and runtime dependencies are all allowed.
//   3. tsconfig.json: it extends the strict base, and sets nothing that could weaken it or add paths.
//   4. Every import in every source file: other workspaces, npm packages, Node builtins, relative paths.
// pnpm's strict node_modules stops most undeclared packages resolving, but a root devDependency and a
// relative path both still resolve, so those need checking here.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { filesUnder } from "./source-files";

export interface Rule {
    internal: string[];
    external: string[];
    node: boolean;
}

interface Manifest {
    name?: string;
    exports?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
}

const SCOPE = "@tondo/";
const SOURCE = /\.(ts|tsx|mts|js|mjs|astro|css)$/;
// Config files and tests only run while developing, so they may use any declared tool and Node.
const TOOLING = /(\.config\.[cm]?[jt]s|\.test\.tsx?)$/;
const TSCONFIG_OPTIONS = new Set(["lib", "types", "jsx", "jsxImportSource"]);
const BUILTINS = new Set(builtinModules);

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

function workspaceDirs(root: string): string[] {
    return ["apps", "packages"].flatMap((group) => {
        const base = join(root, group);
        if (!existsSync(base)) return [];
        return readdirSync(base)
            .filter((entry) => statSync(join(base, entry)).isDirectory())
            .map((entry) => `${group}/${entry}`);
    });
}

function importsIn(file: string): string[] {
    let text = readFileSync(file, "utf8");
    if (file.endsWith(".css")) {
        return [...text.matchAll(/@import\s+(?:url\()?["']([^"']+)["']/g)].flatMap(
            (m) => m[1] ?? [],
        );
    }
    if (file.endsWith(".astro")) {
        const front = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "";
        const scripts = [...text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
        text = [front, ...scripts].join("\n");
    }
    return ts.preProcessFile(text, true, true).importedFiles.map((f) => f.fileName);
}

function packageNameOf(spec: string): string {
    const parts = spec.split("/");
    return (spec.startsWith("@") ? parts.slice(0, 2) : parts.slice(0, 1)).join("/");
}

function exportsSubpath(manifest: Manifest, subpath: string): boolean {
    const keys = Object.keys(manifest.exports ?? {});
    return keys.some((key) =>
        key.endsWith("*") ? subpath.startsWith(key.slice(0, -1)) : key === subpath,
    );
}

function findCycle(rules: Record<string, Rule>): string[] | null {
    const byName = new Map(Object.entries(rules).map(([d, r]) => [`${SCOPE}${basename(d)}`, r]));
    const visit = (name: string, trail: string[]): string[] | null => {
        if (trail.includes(name)) return [...trail, name];
        for (const next of byName.get(name)?.internal ?? []) {
            const cycle = visit(next, [...trail, name]);
            if (cycle) return cycle;
        }
        return null;
    };
    for (const name of byName.keys()) {
        const cycle = visit(name, []);
        if (cycle) return cycle;
    }
    return null;
}

const basename = (dir: string) => dir.split("/").at(-1) ?? dir;

function checkTsconfig(root: string, dir: string, errors: string[]): void {
    const path = join(root, dir, "tsconfig.json");
    if (!existsSync(path)) {
        errors.push(`${dir}: has no tsconfig.json, so nothing type checks it`);
        return;
    }
    const config = readJson(path) as { extends?: string | string[]; compilerOptions?: object };
    if (![config.extends].flat().includes("../../tsconfig.base.json")) {
        errors.push(`${dir}/tsconfig.json: must extend ../../tsconfig.base.json`);
    }
    for (const option of Object.keys(config.compilerOptions ?? {})) {
        if (!TSCONFIG_OPTIONS.has(option)) {
            errors.push(`${dir}/tsconfig.json: may not set compilerOptions.${option}`);
        }
    }
}

export function checkBoundaries(root: string): string[] {
    const errors: string[] = [];
    const rules = readJson(join(root, "boundaries.json")) as Record<string, Rule>;
    const dirs = workspaceDirs(root).filter((dir) => existsSync(join(root, dir, "package.json")));
    const manifests = new Map(
        dirs.map((dir) => [dir, readJson(join(root, dir, "package.json")) as Manifest]),
    );
    const byName = new Map([...manifests].map(([dir, m]) => [m.name ?? dir, m]));
    const apps = new Set(
        dirs.filter((dir) => dir.startsWith("apps/")).map((d) => `${SCOPE}${basename(d)}`),
    );

    for (const dir of Object.keys(rules)) {
        if (!dirs.includes(dir)) errors.push(`boundaries.json: ${dir} is not a workspace`);
    }
    const cycle = findCycle(rules);
    if (cycle) errors.push(`boundaries.json: dependency cycle ${cycle.join(" -> ")}`);

    for (const dir of dirs) {
        const manifest = manifests.get(dir) ?? {};
        const rule = rules[dir];
        if (!rule) {
            errors.push(`${dir}: not listed in boundaries.json; decide what it may depend on`);
            continue;
        }
        if (manifest.name !== `${SCOPE}${basename(dir)}`) {
            errors.push(`${dir}/package.json: must be named ${SCOPE}${basename(dir)}`);
        }
        for (const name of rule.internal) {
            if (apps.has(name))
                errors.push(`boundaries.json: ${dir} may not depend on app ${name}`);
        }
        checkTsconfig(root, dir, errors);

        const deps = manifest.dependencies ?? {};
        const dev = manifest.devDependencies ?? {};
        for (const [name, version] of Object.entries({ ...deps, ...dev })) {
            if (!name.startsWith(SCOPE)) continue;
            if (!rule.internal.includes(name)) {
                errors.push(`${dir}/package.json: may not depend on ${name}`);
            }
            if (version !== "workspace:*") {
                errors.push(`${dir}/package.json: ${name} must use workspace:*`);
            }
        }
        for (const name of Object.keys(deps)) {
            if (!name.startsWith(SCOPE) && !rule.external.includes(name)) {
                errors.push(`${dir}/package.json: ${name} is not allowed by boundaries.json`);
            }
        }

        const base = join(root, dir);
        for (const file of filesUnder(base, SOURCE)) {
            const tooling = TOOLING.test(file);
            const isTest = /\.test\.tsx?$/.test(file);
            for (const spec of importsIn(file)) {
                const at = `${relative(root, file)}: "${spec}"`;
                const bare = spec.replace(/^node:/, "");
                if (spec.startsWith(".")) {
                    const target = resolve(dirname(file), spec);
                    if (target !== base && !target.startsWith(base + sep)) {
                        errors.push(`${at} leaves ${dir}; import workspaces by package name`);
                    }
                } else if (spec.startsWith("/") || spec.startsWith("astro:")) {
                    continue;
                } else if (spec.startsWith("node:") || BUILTINS.has(packageNameOf(bare))) {
                    if (!rule.node && !tooling)
                        errors.push(`${at} ${dir} may not use Node builtins`);
                } else if (spec.startsWith(SCOPE)) {
                    const name = packageNameOf(spec);
                    const target = byName.get(name);
                    if (!rule.internal.includes(name)) {
                        errors.push(`${at} ${dir} may not import ${name}`);
                    } else if (!(name in deps) && !(name in dev)) {
                        errors.push(`${at} ${name} is not declared in ${dir}/package.json`);
                    } else if (target && !exportsSubpath(target, `.${spec.slice(name.length)}`)) {
                        errors.push(`${at} is not something ${name} exports`);
                    }
                } else if (/^(apps|packages)\//.test(spec)) {
                    errors.push(`${at} reaches into another workspace by path`);
                } else {
                    const name = packageNameOf(spec);
                    if (isTest && name === "vitest") continue;
                    if (!(name in deps) && !(tooling && name in dev)) {
                        errors.push(`${at} ${name} is not a dependency of ${dir}`);
                    } else if (!tooling && !rule.external.includes(name)) {
                        errors.push(`${at} ${dir} may not use ${name}`);
                    }
                }
            }
        }
    }
    return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const errors = checkBoundaries(root);
    if (errors.length) {
        process.stderr.write(`Boundary check failed:\n${errors.map((e) => `  ${e}`).join("\n")}\n`);
        process.exit(1);
    }
    process.stdout.write("Boundaries hold.\n");
}
