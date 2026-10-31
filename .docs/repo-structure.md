# Repo structure

Tondo is a TypeScript-only pnpm and Turbo monorepo with three apps and five packages. Shared packages are imported straight from TypeScript source, so they have no build step.

```
tondo/
├── .docs/                 Product, architecture and design documents
├── .githooks/pre-commit   Runs pnpm check
├── .github/workflows/     CI
├── .scratchpad/           Throwaway experiments, ignored by git
├── apps/
│   ├── editor/            SolidJS and Vite, with the page on a same-origin iframe canvas
│   ├── marketing/         Astro, static output
│   └── server/            Hono: API, public pages, the Neon Auth proxy, and the built apps in production
├── packages/
│   ├── page/              Page schema, handle rules, link safety, and one file per block in src/blocks
│   ├── render/            Page to HTML and CSS, art, and one file per look in src/looks
│   ├── contract/          API routes and response schemas
│   ├── db/                Drizzle schema, migrations, queries and seed data
│   └── brand/             Tondo's own colours and CSS tokens, and the demo photos
├── scripts/               Boundary, suppression and port checks, with tests
├── boundaries.json        What each workspace may import
├── docker-compose.yml     Postgres and object storage
└── render.yaml            Production service on Render, see .docs/deploy.md
```

We chose this over a single package, as in Galleo and Lumischool, because `render` has to stay free of editor and server code to keep public pages small. Each package declaring its own dependencies makes that easier to enforce. We chose it over a finer split because looks and art change along with `render` today. Art is the likeliest package to split out, once it needs server-side image rendering.

## Naming

Each folder uses one naming style, and `pnpm check:naming` enforces it. `components/` and `layouts/` hold PascalCase UI files. Everything else is lowercase with hyphens, and CSS lives only in `styles/`. `README.md` and `AGENTS.md` at the root are the only exceptions.

## Blocks and looks

Each block is one file that calls `defineBlock`, holding its schema, starting content, fields, CSS and HTML. Each look is one file that calls `defineLook`. To add either, copy a file and add it to the `index.ts` beside it.

## Allowed imports

`boundaries.json` is the source of truth.

| Workspace | Other workspaces | npm packages at runtime | Node builtins |
|---|---|---|---|
| `page` | none | `zod` | no |
| `brand` | none | none | no |
| `render` | `page` | none | no |
| `contract` | `page` | `zod` | no |
| `db` | `page` | `drizzle-orm`, `postgres` | yes |
| `apps/server` | `page`, `render`, `contract`, `db` | `hono`, `@hono/node-server` | yes |
| `apps/editor` | `page`, `render`, `contract`, `brand` | `solid-js` | no |
| `apps/marketing` | `page`, `render`, `brand` | `astro` | no |

## What enforces the rules

| Check | What it stops |
|---|---|
| `pnpm check:boundaries` | Disallowed imports of any kind, relative paths out of a workspace, imports past a package's exports, undeclared packages, Node builtins in browser-safe code, cycles, and any `tsconfig.json` that weakens the base or adds paths |
| TypeScript | `page`, `render`, `contract` and `brand` have no DOM or Node types, so using `document` or `process` is a compile error. The base config adds strict options beyond `strict`, such as `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` |
| ESLint | `strictTypeChecked` and `stylisticTypeChecked` on all TypeScript, plus Solid and Astro rules. Warnings fail the run. It also flags disallowed workspace imports in the editor |
| `pnpm check:suppressions` | `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, casts to `any` and double casts |
| `pnpm check:ports` | Ports not in `scripts/ports.ts`, Docker ports open beyond loopback, and Vite without `strictPort` |
| `pnpm check:naming` | File and folder names that break the naming rules, and CSS outside `styles/` |
| `scripts/guards.test.ts` | A guard that has stopped reporting. Each guard is shown violations and has to catch them |

The pre-commit hook and CI both run all of these. CI also builds every app, validates the compose file, and runs migrations and a page request against a real Postgres. TypeScript stays on 6.0 because `typescript-eslint` doesn't support 7 yet.

## Local ports

Tondo uses 8100 to 8107 and keeps up to 8109 in reserve, so it can run alongside sibling projects. `pnpm ports:audit` compares these with sibling configs and what's listening. FlowMaestro uses 8119 and beautifulai 8192, both outside this range.

| Port | Service |
|---|---|
| 8100 | Editor |
| 8101 | Server |
| 8102 | Postgres (Docker) |
| 8103 | Marketing |
| 8104 | Drizzle Studio |
| 8105 | Object storage S3 API (Docker) |
| 8106 | Object storage console (Docker) |
| 8107 | Scratchpad server for the editor experiment and design pages (`pnpm scratchpad`) |

## Getting started

```sh
pnpm install
pnpm services:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Then open the editor at `http://127.0.0.1:8100`, the example page at `http://127.0.0.1:8101/maya` and the marketing site at `http://127.0.0.1:8103`.

## Browser tests

`tests/` holds Playwright tests, run with `pnpm e2e`. They build the apps and run them through the real server on port 8109, with a local stand-in for Neon Auth on 8108 and their own `tondo_test` database. They aren't part of `pnpm check`, so CI runs them as a separate job.
