# Deploying Tondo

Tondo runs as one web service on Render, with Postgres and sign-in on Neon. This follows Galleo's setup in `galleo/.docs/hosting.md`. Nothing has been deployed yet, and real Neon sign-in hasn't been tried. It's only been tested against a stand-in for Neon's API.

## How it fits together

One Hono server serves the marketing site, the editor at `/app`, public pages, and `/api`, all on `tondo.page` with no subdomains. DNS only needs that one domain pointed at Render. Neon's docs say separate frontend and backend deployments aren't supported, because its cookies can't be shared safely across domains. So the server proxies `/api/auth/*` to Neon, and the cookies stay on our domain.

| Variable | Where it comes from | Needed |
|---|---|---|
| `DATABASE_URL` | Neon console, direct connection string | Yes |
| `NEON_AUTH_BASE_URL` | Neon console, Auth URL of the branch | For sign-in |
| `NEON_AUTH_COOKIE_SECRET` | Render generates it. Locally: `openssl rand -base64 32`. At least 32 characters | For sign-in |
| `NODE_ENV`, `HOST` | Set in `render.yaml` | Yes |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION` | Cloudflare R2: create a bucket and an API token, and use `https://<account-id>.r2.cloudflarestorage.com` with region `auto`. Without them, uploads say they aren't set up | For uploads |
| `SITE_URL`, `EDITOR_URL` | Leave unset in production, where they default to the same origin | No |
| `PUBLIC_ORIGIN` | The address used in share tags, such as `https://tondo.page`. Falls back to the request's own | No |
| `BLOCKED_HOSTS` | Comma-separated hosts that can't be linked from a published page. This is the phishing hook, and there's no threat feed behind it yet | No |
| `TRUSTED_PROXY_HOPS` | How many of our proxies add to `X-Forwarded-For`. 0 uses the connection's address. `render.yaml` sets 1 for Render, which hasn't been checked against a real deploy. Add 1 if Cloudflare goes in front. Too low lets people forge addresses, and too high counts everyone as one | In production |
| `RENDER_API_KEY` | Render, Account Settings. Turns customer domains on, with `RENDER_SERVICE_ID` and `RENDER_EXTERNAL_HOSTNAME`, which Render sets itself. See [custom-domains.md](custom-domains.md) | For custom domains |
| `APP_HOSTS` | Comma-separated names that reach the whole site, beyond `PUBLIC_ORIGIN`, `SITE_URL`, `EDITOR_URL` and the Render name. With domains on, any other name reaches only the page holding that domain | No |
| `RATE_LIMIT_SCALE` | Multiplies every rate limit. Only the tests change it | No |
| `COUNT_FLUSH_MS` | How often waiting view and click counts are written. Defaults to 5 seconds | No |

## Set up Neon

1. Create a project at [console.neon.tech](https://console.neon.tech) in an **AWS** region, because Neon Auth isn't on Azure. Pick one near Render's region: `us-west-2` for Render's Oregon.
2. Don't turn on IP Allow or Private Networking, because Neon Auth doesn't support them.
3. Copy the **direct** connection string. This is `DATABASE_URL`.
4. Under the branch's **Settings → Auth**, turn on Auth and copy the Auth URL. This is `NEON_AUTH_BASE_URL`.
5. Add your production address to **trusted domains**, such as `https://tondo.page`, and the Render address while testing.
6. Set the application name to Tondo.
7. Before launch, turn off **Allow Localhost** on the production branch.

Each Neon branch has its own auth users and Auth URL. Use a separate `dev` branch for local work.

## Set up Google

Google works on a new project with Neon's shared credentials, which is fine for trying it, but the consent screen shows Neon's name. Before launch:

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an OAuth client of type **Web application**.
2. Add this authorised redirect URI, once per Neon branch: `{NEON_AUTH_BASE_URL}/callback/google`.
3. Set the consent screen's name, support email and authorised domains, then publish it. While it's in Testing, only listed test users can sign in.
4. In Neon, go to **Settings → Auth → OAuth providers**, choose Add OAuth provider, and paste the client id and secret.

## Set up email

Neon's shared sender is rate-limited and can't send verification links. Before launch, add your own email provider in Neon and turn on email verification, which is off by default. The reset and verification screens aren't built yet.

## Set up Render

1. In Render, choose **New → Blueprint** and connect the repo, which needs to be pushed to GitHub first. It reads `render.yaml`.
2. Enter `DATABASE_URL` and `NEON_AUTH_BASE_URL` when asked.
3. After the first deploy, check `/health`, `/`, `/login` and `/app`.

The build runs migrations last, so a failed one leaves the old deploy running.

`.page` is on the browser HSTS preload list, so `tondo.page` is HTTPS only. Add it as a custom domain in Render, which provides the certificate, before testing there.

## Current setup

The `tondo` Neon project is in AWS `us-east-2`, with Auth on for both the `production` and `dev` branches, so Render should use its Ohio region. Local `.env` points at `dev`. Production still has Neon's shared Google keys and email sender, and no trusted domains.

## Database

`packages/db/migrations` has one baseline migration with the final tables, in [data-model.md](data-model.md). It has been run on local Docker, and not on Neon, where the Render build will run it on first deploy.

## Local development

```bash
cp .env.example .env
```

Set `NEON_AUTH_BASE_URL` to the `dev` branch's Auth URL, and `NEON_AUTH_COOKIE_SECRET` to a generated value, then restart `pnpm dev`. App data stays in Docker, while people live in Neon. Open the apps at `localhost`, not `127.0.0.1`. Neon's cookies are marked Secure, which Chrome accepts on localhost and Safari doesn't, so use Chrome for sign-in locally.

## What to know about Neon Auth

- **Status:** Neon's roadmap says it's generally available and still in active development. The server toolkit we use is labelled beta and can break in minor versions, so `@neon/auth` is pinned to an exact version.
- **Cost:** included in every plan, up to 60,000 monthly active users on Free and 1 million on Launch and Scale, as of 2026-10-31.
- **Limits:** no multi-factor sign-in yet, and no custom plugins or server hooks.
- **Leaving:** Neon documents no route away from it. People are stored in `neon_auth` tables we can query, on Better Auth's table design, so moving to self-hosted Better Auth looks possible, but that's untested.

## Trying it on a phone

`pnpm --filter @tondo/editor dev --host` and the same for marketing expose the dev servers on your network, which is only sensible on a network you trust. A phone needs the same address for each app, and Neon's cookies are marked Secure, so sign-in on a phone is most reliable once deployed on HTTPS.

## Limits of running one process

Rate limits, the upload cap, the 15 second page cache and waiting counts all live in the server's memory. That's fine on one instance. With more than one:

- Each instance counts its own limits, so the real limit is the number shown times the number of instances.
- Publishing on one instance leaves the old page cached on the others for up to 15 seconds.
- Counts waiting at a crash are lost. A normal deploy sends SIGTERM, which writes them first.

Rate limits read the client address from the left of `X-Forwarded-For`. This hasn't been checked behind Render or Cloudflare. Sign-in also limits per email, so a forged header doesn't get past that one.

## Plans and Stripe

`PLANS_ON` is `false` in `render.yaml`, so everyone behaves as Pro and nothing mentions plans. With it `true`, the server won't start unless `STRIPE_KEY` and `STRIPE_WEBHOOK_SECRET` are set and the `pro_month` and `pro_year` Prices in Stripe match the site, so a bad setup leaves the old deploy live. `STRIPE_TAX=true` is only for once a tax registration shows as collecting. The webhook address is `/api/stripe/webhook`. The full list of steps is in [plans-implementation.md](plans-implementation.md), and `pnpm --filter @tondo/db comp --all --months 12` has to run before switching plans on.

## Before launch

- Custom domains are off until `RENDER_API_KEY` is set. Pro is sold with them, so set that and try one real domain before switching plans on. The steps are in [custom-domains.md](custom-domains.md).
- Create `report@tondo.page`. The report page sends mail there.
- Deleting an account asks Neon to delete the user, and that hasn't been tried against real Neon. If Neon refuses, the person is told their sign-in is still stored.
- To hide someone for abuse: `pnpm --filter @tondo/db suspend <handle>`. This takes down all of that person's pages, whichever of their addresses you name.
- `/sitemap.xml` lists every page visitors can see, cached for an hour per server, and `robots.txt` points to it at `tondo.page`. Change that line if the site moves to another address.
