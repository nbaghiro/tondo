// A guard that has stopped reporting looks exactly like a clean repo, so each is shown a violation.

import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkBoundaries } from "./check-boundaries";
import type { Rule } from "./check-boundaries";
import { checkNaming } from "./check-naming";
import { checkPorts, findPortProblems } from "./check-ports";
import { checkSuppressions, findSuppressions } from "./check-suppressions";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("this repo", () => {
    it("passes every guard", () => {
        expect(checkBoundaries(REPO)).toEqual([]);
        expect(checkSuppressions(REPO)).toEqual([]);
        expect(checkPorts(REPO)).toEqual([]);
        expect(checkNaming(REPO)).toEqual([]);
    });
});

describe("boundaries", () => {
    let root: string;
    const TSCONFIG = JSON.stringify({ extends: "../../tsconfig.base.json" });

    function workspace(dir: string, manifest: object) {
        mkdirSync(join(root, dir, "src"), { recursive: true });
        writeFileSync(join(root, dir, "package.json"), JSON.stringify(manifest));
        writeFileSync(join(root, dir, "tsconfig.json"), TSCONFIG);
    }
    const source = (path: string, text: string) => {
        writeFileSync(join(root, path), text);
    };
    const rules = (value: Record<string, Rule>) => {
        source("boundaries.json", JSON.stringify(value));
    };

    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), "tondo-boundaries-"));
        workspace("packages/low", {
            name: "@tondo/low",
            exports: { ".": "./src/index.ts" },
            dependencies: { zod: "catalog:" },
        });
        workspace("packages/high", {
            name: "@tondo/high",
            exports: { ".": "./src/index.ts" },
            dependencies: { "@tondo/low": "workspace:*" },
        });
        workspace("apps/site", {
            name: "@tondo/site",
            dependencies: { "@tondo/high": "workspace:*" },
        });
        source("packages/low/src/index.ts", 'import { z } from "zod";\nexport const a = z;\n');
        source("packages/high/src/index.ts", 'export * from "@tondo/low";\n');
        source("apps/site/src/index.ts", 'import "@tondo/high";\n');
        rules({
            "packages/low": { internal: [], external: ["zod"], node: false },
            "packages/high": { internal: ["@tondo/low"], external: [], node: false },
            "apps/site": { internal: ["@tondo/high"], external: [], node: false },
        });
    });
    afterEach(() => {
        rmSync(root, { recursive: true, force: true });
    });

    it("passes a clean fixture", () => {
        expect(checkBoundaries(root)).toEqual([]);
    });

    it("catches a package reaching up the graph", () => {
        source("packages/low/src/index.ts", 'import "@tondo/high";\n');
        expect(checkBoundaries(root).join()).toContain("may not import @tondo/high");
    });

    it("catches a relative path out of a workspace", () => {
        source("packages/low/src/index.ts", 'import "../../high/src/index";\n');
        expect(checkBoundaries(root).join()).toContain("leaves packages/low");
    });

    it("catches a dynamic import", () => {
        source("packages/low/src/index.ts", 'export const a = () => import("@tondo/high");\n');
        expect(checkBoundaries(root).join()).toContain("may not import @tondo/high");
    });

    it("catches a type-only import", () => {
        source(
            "packages/low/src/index.ts",
            'import type { X } from "@tondo/high";\nexport type Y = X;\n',
        );
        expect(checkBoundaries(root).join()).toContain("may not import @tondo/high");
    });

    it("catches a deep import past a package's exports", () => {
        source("packages/high/src/index.ts", 'export * from "@tondo/low/src/index";\n');
        expect(checkBoundaries(root).join()).toContain("not something @tondo/low exports");
    });

    it("catches an undeclared package that only resolves through the root", () => {
        source("packages/low/src/index.ts", 'import "typescript";\n');
        expect(checkBoundaries(root).join()).toContain("typescript is not a dependency");
    });

    it("catches Node builtins in browser-safe code, with or without the prefix", () => {
        source("packages/low/src/index.ts", 'import "node:fs";\nimport "path";\n');
        const errors = checkBoundaries(root);
        expect(errors.filter((e) => e.includes("may not use Node builtins"))).toHaveLength(2);
    });

    it("ignores imports in comments", () => {
        source("packages/low/src/index.ts", '// import "@tondo/high";\nexport const a = 1;\n');
        expect(checkBoundaries(root)).toEqual([]);
    });

    it("catches a workspace nobody decided about", () => {
        workspace("packages/new", { name: "@tondo/new" });
        expect(checkBoundaries(root).join()).toContain("not listed in boundaries.json");
    });

    it("catches a package.json dependency the rules don't allow", () => {
        workspace("packages/low", {
            name: "@tondo/low",
            dependencies: { "@tondo/high": "workspace:*", react: "1" },
        });
        const errors = checkBoundaries(root).join();
        expect(errors).toContain("may not depend on @tondo/high");
        expect(errors).toContain("react is not allowed");
    });

    it("catches an internal dependency that isn't workspace:*", () => {
        workspace("packages/high", {
            name: "@tondo/high",
            dependencies: { "@tondo/low": "1.0.0" },
        });
        expect(checkBoundaries(root).join()).toContain("must use workspace:*");
    });

    it("catches a cycle in the rules", () => {
        rules({
            "packages/low": { internal: ["@tondo/high"], external: ["zod"], node: false },
            "packages/high": { internal: ["@tondo/low"], external: [], node: false },
            "apps/site": { internal: ["@tondo/high"], external: [], node: false },
        });
        expect(checkBoundaries(root).join()).toContain("dependency cycle");
    });

    it("catches a package depending on an app", () => {
        rules({
            "packages/low": { internal: ["@tondo/site"], external: ["zod"], node: false },
            "packages/high": { internal: ["@tondo/low"], external: [], node: false },
            "apps/site": { internal: ["@tondo/high"], external: [], node: false },
        });
        expect(checkBoundaries(root).join()).toContain("may not depend on app @tondo/site");
    });

    it.each([
        [{ extends: "../../other.json" }, "must extend"],
        [
            { extends: "../../tsconfig.base.json", compilerOptions: { strict: false } },
            "compilerOptions.strict",
        ],
        [
            { extends: "../../tsconfig.base.json", compilerOptions: { paths: {} } },
            "compilerOptions.paths",
        ],
    ])("catches a weakened tsconfig: %j", (config, message) => {
        source("packages/low/tsconfig.json", JSON.stringify(config));
        expect(checkBoundaries(root).join()).toContain(message);
    });

    it("sees imports in Astro frontmatter", () => {
        mkdirSync(join(root, "apps/site/src/pages"));
        source("apps/site/src/pages/a.astro", '---\nimport "@tondo/low";\n---\n<p>hi</p>\n');
        expect(checkBoundaries(root).join()).toContain("may not import @tondo/low");
    });
});

describe("the rendering packages", () => {
    it("can't use the DOM or Node, because their tsconfigs leave both out", () => {
        for (const name of ["page", "render", "contract", "brand"]) {
            const config = JSON.parse(
                readFileSync(join(REPO, "packages", name, "tsconfig.json"), "utf8"),
            ) as {
                compilerOptions?: object;
            };
            expect(config.compilerOptions).toBeUndefined();
        }
    });
});

describe("suppressions", () => {
    const eslintOff = ["eslint", "disable"].join("-");
    const tsOff = ["@ts", "ignore"].join("-");
    it.each([
        `// ${eslintOff}`,
        `// ${tsOff}`,
        ["x as", "any"].join(" "),
        ["x as", "unknown as Y"].join(" "),
    ])("finds %s", (text) => {
        expect(findSuppressions("a.ts", text)).toHaveLength(1);
    });
    it("leaves ordinary code alone", () => {
        expect(findSuppressions("a.ts", "const anything = x as string;")).toEqual([]);
    });
});

describe("ports", () => {
    const known = new Set([8100, 8102]);
    it("finds a port that isn't listed", () => {
        expect(findPortProblems("a.config.ts", "server: { port: 5173 }", known).join()).toContain(
            "5173",
        );
        expect(findPortProblems("a.ts", 'fetch("http://localhost:8300")', known).join()).toContain(
            "8300",
        );
    });
    it("finds a Docker port open beyond loopback", () => {
        const problems = findPortProblems("docker-compose.yml", '      - "8102:5432"\n', known);
        expect(problems.join()).toContain("127.0.0.1 only");
    });
    it("finds an unlisted Docker port", () => {
        const problems = findPortProblems(
            "docker-compose.yml",
            '      - "127.0.0.1:8300:5432"\n',
            known,
        );
        expect(problems.join()).toContain("8300");
    });
    it("requires strictPort in Vite", () => {
        expect(findPortProblems("vite.config.ts", "port: 8100", known).join()).toContain(
            "strictPort",
        );
        expect(findPortProblems("vite.config.ts", "port: 8100, strictPort: true", known)).toEqual(
            [],
        );
    });
    it("accepts listed ports", () => {
        expect(
            findPortProblems("docker-compose.yml", '      - "127.0.0.1:8102:5432"\n', known),
        ).toEqual([]);
    });
});

describe("the compose file", () => {
    it("is read by the port guard", () => {
        const dir = mkdtempSync(join(tmpdir(), "tondo-ports-"));
        cpSync(join(REPO, "docker-compose.yml"), join(dir, "docker-compose.yml"));
        mkdirSync(join(dir, "apps"));
        mkdirSync(join(dir, "packages"));
        expect(checkPorts(dir)).toEqual([]);
        writeFileSync(join(dir, "docker-compose.yml"), '    ports:\n      - "8300:5432"\n');
        expect(checkPorts(dir).length).toBe(2);
        rmSync(dir, { recursive: true, force: true });
    });
});

describe("naming", () => {
    let root: string;
    const file = (path: string) => {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), "");
    };

    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), "tondo-naming-"));
        file("README.md");
        file("apps/a/src/main.tsx");
        file("apps/a/src/components/Canvas.tsx");
        file("apps/a/src/lib/link-rules.test.ts");
        file("apps/a/src/styles/canvas.css");
    });
    afterEach(() => {
        rmSync(root, { recursive: true, force: true });
    });

    it("passes a clean fixture", () => {
        expect(checkNaming(root)).toEqual([]);
    });

    it.each([
        ["apps/a/src/App.tsx", "lowercase"],
        ["apps/a/src/lib/LinkRules.ts", "lowercase"],
        ["apps/a/src/lib/link_rules.ts", "lowercase"],
        ["apps/a/src/components/sidebar.tsx", "PascalCase"],
        ["apps/a/src/components/helpers.ts", "PascalCase"],
        ["apps/a/src/components/Canvas.css", "PascalCase"],
        ["apps/a/src/app.css", "styles/"],
        ["apps/a/README.md", "lowercase"],
        ["apps/a/src/Bad/file.ts", "folder names"],
    ])("catches %s", (path, message) => {
        file(path);
        expect(checkNaming(root).join()).toContain(message);
    });
});
