import { readFileSync } from "node:fs";
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import astro from "eslint-plugin-astro";
import solid from "eslint-plugin-solid/configs/typescript";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

// What each workspace may import, for feedback in the editor. scripts/check-boundaries.ts is the
// authority and covers more: relative paths, npm packages, Node builtins and tsconfig settings.
const boundaries = JSON.parse(readFileSync(new URL("./boundaries.json", import.meta.url), "utf8"));
const nameOf = (dir) => `@tondo/${dir.split("/")[1]}`;
const everyone = Object.keys(boundaries).map(nameOf);
const reach = Object.entries(boundaries).map(([dir, rule]) => ({
    files: [`${dir}/**/*.{ts,tsx,astro}`],
    rules: {
        "no-restricted-imports": [
            "error",
            {
                patterns: [
                    {
                        group: everyone
                            .filter((name) => !rule.internal.includes(name))
                            .flatMap((name) => [name, `${name}/*`]),
                        message: "This workspace may not import that package. See boundaries.json.",
                    },
                ],
            },
        ],
    },
}));

export default defineConfig(
    {
        ignores: [
            "**/node_modules/**",
            "**/dist/**",
            "**/.astro/**",
            ".scratchpad/**",
            ".docs/**",
            "packages/db/migrations/**",
        ],
    },
    js.configs.recommended,
    {
        files: ["**/*.{ts,tsx}"],
        extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
        languageOptions: {
            parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
        },
        rules: {
            "no-console": "error",
            "no-void": "error",
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/consistent-type-imports": "error",
            "@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: false }],
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
            "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
            "@typescript-eslint/switch-exhaustiveness-check": "error",
        },
    },
    { files: ["apps/editor/**/*.tsx"], ...solid },
    ...astro.configs.recommended,
    {
        files: ["**/*.{js,mjs}"],
        languageOptions: { globals: { URL: "readonly" } },
    },
    ...reach,
    prettier,
);
