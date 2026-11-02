# Custom domains

A page on Pro can show at a domain its owner has bought, such as `mayaokafor.com`. This doc compares the two ways to host that, says which I chose and why, and describes what's built. Provider facts were read on 2026-11-01 from the sources listed at the end. No real Render or Cloudflare account was used, so anything about how they behave comes from their docs and not from a test.

## Recommendation

I chose Render custom domains. Tondo already runs on Render, so this adds no new service in front of the app, and it lets a customer use a bare domain with an ordinary `A` record at any registrar. Cloudflare for SaaS is cheaper per domain, but outside Enterprise it can't serve an `A` record at the root, and putting it in front of Render needs a Worker in the path.

The choice can be reversed before launch, because the provider sits behind `apps/server/src/hosting.ts`. After launch it's harder: customers have Render's address in their DNS, and each of them would have to change it.

## Comparison

| | Render custom domains | Cloudflare for SaaS |
|---|---|---|
| **Certificates** | Issued and renewed automatically once a domain verifies. The API shows no certificate status | Issued and renewed automatically. Each hostname gets two certificates, and both the hostname and its certificate have a status in the API |
| **Limits** | No count in the docs. Render staff said on the forum that there's no limit per service, in older posts | 50,000 hostnames on Free, Pro and Business. More on Enterprise |
| **Cost** | Included per workspace: Hobby 2, Pro 15, Scale 25. Then $0.25 per domain a month | 100 included, then $0.10 per hostname a month |
| **At the registrar** | Root: `A` to `216.24.57.1`, plus a `CNAME` for `www`. Subdomain: `CNAME` to the service's `onrender.com` name | `CNAME` to our target. An `A` record isn't supported unless apex proxying is bought |
| **Root and www** | Adding one adds the other, and one redirects to the other | Root needs apex proxying, a paid Enterprise add-on, or a registrar with `ALIAS` or CNAME flattening. Each name is its own hostname |
| **Failure modes** | Other `AAAA` records can interfere. `CAA` records must allow `letsencrypt.org` and `pki.goog`. A 502 can show briefly after verifying. A domain can only be on one Render service, which I read from the API's 409 and haven't confirmed | Hostnames go `Moved` when DNS stops pointing at us and are deleted after 7 days. `CAA` can block issuing. Customers already on another CDN can fail validation |
| **In front of our app** | Nothing new | The origin is Render, which itself runs on Cloudflare. Sending the customer's `Host` gets a 404 from a provider that doesn't know the domain, and overriding `Host` with an Origin Rule is Enterprise only |
| **Moving away later** | Every customer changes DNS, because the address is Render's | Easier, because customers point at a name we control |

**The problem with Cloudflare in front of Render.** Cloudflare sends the customer's hostname as `Host`, and its docs say a cloud provider may answer 404 or 400 if it doesn't recognise that name. The fix they give is overriding `Host` with an Origin Rule, and the Origin Rules table shows that as Enterprise only. A Worker as the fallback origin is the other route: it could fetch from Render and pass the hostname in a header, which the app would have to trust using a shared secret. That means moving `tondo.page` to Cloudflare DNS, running a Worker on every visit, and adding one more thing that can go down. A Render forum post also reports Error 1000 with this setup and says Cloudflare told them one SaaS zone can't sit in front of another. I only read a search summary of that thread, so I'm treating it as a warning and not as a fact.

**Why the root matters.** Many people will buy `theirname.com` and want exactly that. Plenty of registrars don't allow a `CNAME` at the root, so on Cloudflare below Enterprise those people would be told to use `www` or change DNS provider. That's a poor first experience for the people Tondo is for.

**What would change my mind.** Enough domains that $0.25 against $0.10 matters: at 1,000 domains that's roughly $150 a month. A real limit from Render that the docs don't state. Or moving the app off Render. At that point Cloudflare is worth another look, and new customers could use it while old ones stay.

## How it works

**The one table.** `domains` has `page_id` as its key, so one domain per page, with `host` and `verified_at`. A unique index on `host` applies only where `verified_at` is set. There's no provider id, status or token column: the provider is asked by name, and the code is worked out when needed.

**Connecting.**

1. Someone types a domain in Page settings. `www.` and `https://` are dropped, and `tldts` rejects anything that isn't a registrable name, such as `co.uk` or an IP address. Tondo's own addresses, `render.com`, `onrender.com` and `BLOCKED_HOSTS` are refused.
2. They see the records to add: the address records from `hosting.ts`, and a `TXT` record at `_tondo` holding a code that's a hash of the page id and the domain.
3. Check now reads the `TXT` record. If it matches, the domain is added to Render and verified there. `verified_at` is set only when Render says it's verified.

A check runs when someone presses the button and when they open settings. There's no background job, so a domain doesn't connect until its owner comes back.

**Why a TXT record.** Everyone on Render points at the same `216.24.57.1`, so pointing at it proves nothing about who owns a domain. Without a proof, someone could add a domain that an old customer left pointing at Render and put their own page on it. The code is tied to one page, so a record left behind doesn't help anyone else.

**Who holds a domain.** Asking holds nothing, so nobody can block a domain by asking for it first. The first page to prove it holds it. If a domain changes hands, a new owner's code replaces the old one in DNS. Their check then finds the old holder's code gone, and takes the domain over, and the old page goes back to waiting. A domain whose holder's code is still there is refused as already connected.

**Serving.** A middleware in `custom-hosts.ts` runs before everything else and reads only the `Host` header. Names in the list of Tondo's own addresses get the whole site. Any other name can only get:

- `/`, the page holding that domain
- `/l/<its handle>/<target>`, its tracked links
- `/photos/*`, which are public at `tondo.page` too
- `/robots.txt` and `/sitemap.xml`, written for that domain
- `/health`, which says nothing about anyone

Everything else, including `/app`, `/api`, `/login`, the marketing site, other handles and any `POST`, gets the same "no page here" answer. `www.` on a held domain redirects to the bare name. Forwarded headers are never read. The list is `PUBLIC_ORIGIN`, `SITE_URL`, `EDITOR_URL`, `RENDER_EXTERNAL_HOSTNAME` and `APP_HOSTS`.

**The tondo.page address.** It keeps showing the page, and its canonical link and share tags name the domain. I chose this over a redirect because a redirect would depend on the customer's DNS staying correct: if they let the domain lapse, every old link and printed QR code would break, and we don't re-check DNS after connecting. Search engines are told which address counts, and nothing breaks. If someone wants a redirect later, it's one line in `drawPage`, along with a check that the domain still works.

**The rest of a live page.**

- Canonical and `og:url` are the domain, and `og:image` uses it too.
- Visits and clicks count against the same page, so statistics carry on.
- The sitemap at `tondo.page` leaves out pages at their own domain, and each domain has its own sitemap with one address.
- The report link goes to `tondo.page`, because the report page isn't on the customer's domain.

**When the plan ends or the page goes offline.** The row stays and the domain shows the same "no page here" as any other offline page. On Starter, a page stays live at `tondo.page` and its domain stops, and its canonical goes back to `tondo.page`. Going back to Pro brings the domain back with no setup. A domain left at Render during this time keeps costing $0.25 a month if we're over the included number. A suspended person's pages stop at their domains too. A team's plan covers its own pages and joined pages.

**Removing.** The row decides what's served, so the domain stops showing once the row is gone. Removing it from Render is tried first, and a failure is logged and doesn't stop anything. A page that's only waiting doesn't remove a domain another page holds.

**Off by default.** Without `RENDER_API_KEY`, `RENDER_SERVICE_ID` and `RENDER_EXTERNAL_HOSTNAME`, the routes don't exist, settings shows nothing about domains, and every `Host` reaches the whole site as it did before.

## What the owner has to set up

1. In Render, make an API key under Account Settings, and set it as `RENDER_API_KEY` on the service. Render sets `RENDER_SERVICE_ID` and `RENDER_EXTERNAL_HOSTNAME` itself.
2. Add `tondo.page` as a custom domain on the service, as `deploy.md` says, and check its workspace plan: 2 domains are included on Hobby, 15 on Pro and 25 on Scale.
3. Set `PUBLIC_ORIGIN=https://tondo.page`, or leave it unset in production, where that's the default. If `www.tondo.page` or another name should reach the whole site, add it to `APP_HOSTS`.
4. Run one real domain through it, using the checks below, before selling Pro with this on.

## What isn't verified against Render

The Render client was written from the API reference and only ever spoke to `tests/render-stand-in.ts`, which I wrote from the same reference. These need checking with a real account:

- Whether `POST /custom-domains` answers 409 for a domain on another account, and whether the first check after adding says `verified`, since verifying may take a moment.
- Whether a domain added with its `www` pair counts as one domain or two for billing, and whether deleting one removes both.
- Whether Render sends `Host` unchanged, and what `Host` its health check uses. `/health` answers for any name, so that one shouldn't matter.
- How long a certificate takes after verifying. The API doesn't report it, so "Connected" can show briefly before HTTPS works.
- Render's API rate limits, which the docs don't state, and any real limit on domains per service.
- That `216.24.57.1` stays right. It's in `hosting.ts` as Render's docs give it.
- Reading `TXT` records through 1.1.1.1 and 8.8.8.8 from Render's network. Only the stand-in has answered these so far.

## Known gaps

- Home's address card and the share button still use `tondo.page/<handle>`, which keeps working.
- "Connected" isn't re-checked after connecting, so a person who breaks their DNS still sees it.
- Deleting a team doesn't remove its domains from Render, and neither does a page that passed the `TXT` check and was removed before Render verified it. The domain isn't served, because there's no row, but it can cost $0.25 a month until removed in Render's dashboard.
- Changing a page's address can leave its domain showing "no page here" for up to 15 seconds, while a cached answer expires.
- Photos at a customer's domain aren't limited to that page's own. They're public at `tondo.page` anyway.

## What the Terms need

The Terms should say, in the owner's words and with legal review:

- Domains are bought and paid for separately, and the customer is responsible for owning the domain and for its DNS.
- A domain comes with Pro. When the plan ends, the page stops showing there, and the customer's DNS stays as they left it until they change it.
- Tondo issues a certificate for the domain through its hosting provider, and visitors' requests to it are handled by Tondo and that provider. The Privacy page should name Render for this.
- Rules on abuse apply to a page at its own domain too, and a suspended page stops showing there.
- A domain can be released from a page if its records stop naming that page and someone else proves they own it.

## Sources

- Render: [custom domains](https://render.com/docs/custom-domains), [other DNS providers](https://render.com/docs/configure-other-dns), [Cloudflare DNS](https://render.com/docs/configure-cloudflare-dns), [default environment variables](https://render.com/docs/environment-variables), API reference for [create](https://api-docs.render.com/reference/create-custom-domain), [retrieve](https://api-docs.render.com/reference/retrieve-custom-domain), [verify](https://api-docs.render.com/reference/refresh-custom-domain) and [delete](https://api-docs.render.com/reference/delete-custom-domain).
- Cloudflare: [overview](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/), [plans](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/), [getting started](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/getting-started/), [custom origins](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/custom-origin/), [Worker as origin](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/worker-as-origin/), [apex proxying](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/apex-proxying/), [validation status](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/domain-support/hostname-validation/validation-status/), [HTTP validation](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/security/certificate-management/issue-and-validate/validate-certificates/http/), [Origin Rules](https://developers.cloudflare.com/rules/origin-rules/).
- Forum posts, weaker than the docs: [limit on custom domains](https://community.render.com/t/is-there-any-limit-on-the-number-of-custom-domains-a-web-service-can-have/485) and [Error 1000 with Cloudflare for SaaS](https://community.render.com/t/error-1000-cloudflare-for-saas-custom-hostnames-with-render-com-origin/7239), the second read only through a search summary.
