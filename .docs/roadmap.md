# Roadmap

This is where things stand on 2026-10-31. The builder is in the real app, and the next job is the checklist in [qa.md](qa.md), followed by design rework.

## Built

- **Marketing site** in `apps/marketing`, with a gallery of 50 example pages drawn by the real renderer.
- **Accounts** through Neon Auth: email and password with verification and reset codes, and Google.
- **Editor** in `apps/editor`: all available blocks, 50 looks, the inspector, tabs, preview, phone layout, photo uploads and server saving.
- **Publishing:** checks before going live, public pages and click counts.
- **Several pages:** up to 5, each with its own address, look, publishing and numbers, with a switcher on Home and in the builder. See [multi-page-implementation.md](multi-page-implementation.md).

[builder-port.md](builder-port.md) records how this was built.

## Order of work from here

### 1. QA and design rework

Walk through [qa.md](qa.md) and rework what needs it. We should also watch a few people try it without help, because that decides the editor's shape.

### 2. Onboarding

What a new person sees first, starter pages and a real name instead of the first part of their email.

### 3. Email and collecting

Your own email provider, then sign-ups and forms with storage in `contacts`, and file delivery.

### 4. Deploy

Render, production Neon settings, your own Google client, R2, and real legal and support pages. See [deploy.md](deploy.md).

### 5. Art

Turn the paintings into recipes that redraw in a chosen palette and are rasterised at publish, with share images made from the same art.

### 6. Private release

Invite a small group, with real pages replacing the fictional ones as people agree to it. Replace the demo photos and check any that stay.

### 7. After the private release

Connected accounts, teams, custom domains and paid plans, following [features.md](features.md).

## Blocks

[builder-port.md](builder-port.md) has the final list. [block-system.md](block-system.md) has the integrations and later phases.

## Decisions

Made on 2026-10-31, and open to change:

- **Design direction:** the example pages in the gallery are the standard.
- **Payments:** Tondo won't take payments in the first release. Product blocks link out, which keeps the first release free of checkout, tax and payout work. Payments follow connected accounts.

Still open:

- **Domain and name:** the domain is `tondo.page`. No trademark search has been run. This should happen before more work goes into the name, because it's cheap now and costly later.
- **Plans and prices:** the owner chose the simplified plans on 2026-11-01: Free with no live page, Starter at $4 and Pro at $10. [plans-implementation.md](plans-implementation.md) has what's built. Nothing can be bought yet: it needs the owner's Stripe setup and new Terms and Privacy. The marketing site already states paid plans and teams as available, so it can't go live until they are.
- **Hosting:** compare providers for custom domains and edge caching before step 4.
