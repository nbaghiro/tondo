# Tondo

One address, such as `tondo.page/maya`, for a page of links with a designed look. Product and design documents are in `.docs`, starting with `.docs/README.md`.

```sh
pnpm install
pnpm services:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The editor runs on `http://127.0.0.1:8100`, the server on `8101` and the marketing site on `8103`. `pnpm check` runs every check.
