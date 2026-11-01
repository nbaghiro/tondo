import { allBlocks } from "./blocks";
import { isPlaceholder } from "./define-block";
import { HEADER } from "./operations";
import { hasPlaceholder } from "./publish";
import { liveContent } from "./sample-content";
import type { Page } from "./schema";

export interface ChecklistItem {
    id: "about" | "photo" | "socials" | "content" | "publish";
    label: string;
    hint: string;
    done: boolean;
    /** Where the builder should open to finish this. */
    section?: string | undefined;
    item?: string | undefined;
    panel?: "publish" | undefined;
}

/** What's left to make a page feel finished, worked out from the page itself. */
export function setupChecklist(page: Page, status: { published: boolean }): ChecklistItem[] {
    const { header } = page;
    const hasOwnPhoto = Boolean(header.photo && !isPlaceholder(header.photo));
    const left = liveContent(page).leftOut[0];
    const painted = allBlocks(page.blocks).find(
        (block) => !block.hidden && block.type !== "tabs" && hasPlaceholder(block),
    );
    return [
        {
            id: "about",
            label: "Say who you are",
            hint: "A short line under your name",
            done: Boolean(
                header.name.trim() && [header.tagline, header.bio].some((line) => line?.trim()),
            ),
            section: HEADER,
            item: "tagline",
        },
        {
            id: "photo",
            label: "Add a photo or logo",
            hint: "It goes at the top of your page",
            done: hasOwnPhoto,
            section: HEADER,
            item: "photo",
        },
        {
            id: "socials",
            label: "Add your social icons",
            hint: "So people can find you elsewhere",
            done: header.links.some((link) => Boolean(link.value)),
            section: HEADER,
            item: "links",
        },
        {
            id: "content",
            label: "Replace the sample content",
            hint: "Sample words stay off your live page until you change them",
            done: !left && !painted,
            section: left?.target ?? painted?.id,
            item: left?.item,
        },
        {
            id: "publish",
            label: "Publish your page",
            hint: "Then your address works for everyone",
            done: status.published,
            panel: "publish",
        },
    ];
}
