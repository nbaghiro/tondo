# Tondo design language

This records the design decisions made after comparing Tondo's studies with Liinks and Stan. The direction was approved on 2026-10-31 after review of `marketing/index.html`, and that page is the reference for how it should look. Details can still change once they've been tested on the real product.

## What the competitors do

These notes come from screenshots of `liinks.co` and `stan.store` taken on 2026-10-30.

| | Liinks | Stan | What it means for Tondo |
|---|---|---|---|
| Marketing colour | Pale pink, blue and lilac gradients on white | Saturated violet with a mint button | Stay away from pastel gradients and violet |
| Headline | Very bold sans | Very bold sans | Use a soft serif, which neither of them uses |
| Hero image | Tilted phone pages | A tilted phone with floating badges | Show real pages, but arrange them differently |
| Proof | A row of full customer pages | Creator photos with a phone beside them | Show full pages. Tondo has no customers, so they're labelled as examples |
| Page content | Photos, image cards, music players, ribbons, event cards | Portraits, product cards, prices, checkout buttons | Tondo's blocks need this much range |
| Weak point | Pages share a template feel and their quality varies | Focused on selling and busy with discounts | Good defaults and art can stand out here |

The largest lesson is about content. These pages look real because they use photographs, logos, prices, dates and several sizes of block on one page. My earlier studies used text buttons on art, so they looked like mockups whatever their styling.

## Brand decisions

Tondo's brand comes from the Wash direction with the Madder palette.

**Idea.** A round watercolour painting is the signature, and everything else stays quiet around it.

**Colour**

| Name | Hex | Use |
|---|---|---|
| Paper | `#FDF8F5` | Page background |
| Plum ink | `#3B1222` | Text and primary buttons |
| Madder | `#A42A55` | Accent and links |
| Coral | `#E8876A` | Paint only |
| Sienna | `#F2B56B` | Paint only |
| Blush | `#F8E4DC` | Quiet panels |

Coral and sienna appear in paint and not in text, because they don't have enough contrast on paper.

**Type.** Fraunces at a soft, medium weight sets headlines. Mulish sets everything else. Headlines use sentence case.

**Shape.** Circles are for art and avatars. Buttons are pills. Panels have 28 px corners, and page mockups have 36 px corners. Shadows are soft and tinted plum.

**Motion.** The page has one moment of motion: the pages fan out around the painting when the page loads. It's turned off for people who ask for reduced motion.

**Hero.** A row of real pages fans around a large painting, like figures around a tondo. This uses a real-page proof similar to its competitors' while looking different from a tilted stack.

## Page looks

Tondo's brand and the looks people use are separate. The studies from the earlier rounds become looks, so a page can have a very different personality from the marketing site.

| Look | Character | Sample page |
|---|---|---|
| Madder | Warm serif, rose and sienna | Maya Okafor, ceramicist |
| Noir | Full-bleed photo on black | Theo Lindqvist, photographer |
| Sap | Greens and arched shapes | Aster & Bell, floral studio |
| Dusk | Glass cards on midnight blue | Noor Haddad, musician |
| Indigo | Ink outlines and square corners | Priya Raman, nutrition coach |
| Signal | Bold yellow and black type | Sam Ortiz, podcast host |
| Bakehouse | Checks and chunky soft type | Harbour Bakery |
| Sumi | Black ink and hairlines | Lena Sato, writer |

## Blocks

The sample pages use the following blocks, which are also the working list for the editor.

| Block | Example |
|---|---|
| Header | Round avatar, or a full-bleed photo with the name over it |
| Social row | Instagram, TikTok, YouTube, Spotify, email |
| Button link | A plain pill |
| Thumbnail link | Small image with a title and a description |
| Feature card | Large image with a title and a button |
| Product grid | Two products with prices |
| Carousel | A row of images to swipe through |
| Gallery | A three-image grid |
| Event list | Date tile, title, place and a ticket button |
| Music player | Cover, track list and play button |
| Video | A thumbnail with a play button and a length |
| Booking | Available time slots |
| Form | Newsletter or enquiry |
| Team row | The people on a team, with roles |
| Ribbon | A moving line of text |
| Quote | A short excerpt, or a review from a fictional customer in a sample page |
| Hours and location | Opening hours and a map link |
| Section heading | Groups the blocks below it |

## Rules for real content

- Sample pages are fictional and are labelled as examples on the marketing page.
- Nothing claims real customers, user counts or ratings.
- Demo photos come from Openverse with CC0 or public domain marks, and are listed in `marketing/assets/CREDITS.md`. Check each one again before any public launch, including whether a photo of a person suits its use.
