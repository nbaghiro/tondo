# Tondo

Tondo gives a person or team one address, such as `tondo.page/maya`, for a page of links with a designed look. Read `.docs/README.md` first. This is a TypeScript-only pnpm and Turbo monorepo.

## Commands

| Command                           | What it does                                                   |
| --------------------------------- | -------------------------------------------------------------- |
| `pnpm services:up`                | Starts Postgres and object storage in Docker                   |
| `pnpm db:migrate`, `pnpm db:seed` | Applies migrations and adds the example page                   |
| `pnpm dev`                        | Runs the editor, server and marketing site                     |
| `pnpm check`                      | Runs every check. The pre-commit hook and CI run the same ones |

## Rules

- `.docs/features.md` lists everything Tondo should eventually support. Check its "Decisions to protect" before designing data or architecture.
- `boundaries.json` says what each workspace may import. Changing it is a design decision, so explain why in the commit.
- `packages/page`, `render`, `contract` and `brand` have neither DOM nor Node types, because they run in the server and the browser.
- Public pages send no JavaScript today. The proposal in `.docs/block-system.md` allows a small script only when a block on that page needs it.
- Don't use suppression comments or `any`. If a lint rule is wrong for this repo, change it in `eslint.config.js`.
- Every host port is listed in `scripts/ports.ts`, inside 8100 to 8109. Run `pnpm ports:audit` before adding one.
- Don't use the `void` operator on promises. Await them or add `.catch` where they start.
- Product copy follows `.docs/design-language.md`: sentence case and no em dashes.
