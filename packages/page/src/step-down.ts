import type { Block } from "./blocks";
import type { FREE_LOOKS } from "./limits";
import { isFreeLook, PAID_BLOCKS, PLANS } from "./limits";
import { countedSections, isScheduled, liveBlocks, scheduleIsLive } from "./paid-uses";
import type { lookNames, LookName, Page, PageStyle } from "./schema";
import { sectionsOf } from "./sections";

type FreeLook = (typeof FREE_LOOKS)[number];
type PaidLook = Exclude<(typeof lookNames)[number], FreeLook>;

// The nearest free look for each paid one. A new look won't compile until it's listed here.
export const FREE_LOOK_FOR: Readonly<Record<PaidLook, FreeLook>> = {
    atelier: "sumi",
    vellum: "sumi",
    plaster: "sumi",
    ink: "sumi",
    noir: "dusk",
    nix: "dusk",
    brine: "lagoon",
    smile: "lagoon",
    surf: "lagoon",
    press: "indigo",
    keys: "indigo",
    second: "indigo",
    counsel: "office",
    estate: "office",
    ledger: "office",
    postal: "office",
    calm: "lilac",
    lume: "lilac",
    wax: "lilac",
    bloom: "lilac",
    bake: "sap",
    roast: "sap",
    shelf: "sap",
    crumb: "sap",
    biscuit: "sap",
    harvest: "fern",
    trail: "fern",
    comet: "signal",
    cutout: "signal",
    riso: "signal",
    pixel: "signal",
    conf: "signal",
    rivet: "volt",
    rave: "volt",
    scrap: "madder",
    glass: "tide",
    rovers: "tide",
    stacks: "tide",
};

export const freeLookFor = (look: LookName): FreeLook =>
    isFreeLook(look) ? (look as FreeLook) : FREE_LOOK_FOR[look as PaidLook];

function designDown(page: Page): Page {
    const look = freeLookFor(page.look);
    const moved = look !== page.look;
    const { paint, seed, style, ...rest } = page;
    const kept: PageStyle = { ...style };
    delete kept.font;
    delete kept.bgPhoto;
    if (kept.bg === "photo") delete kept.bg;
    const mode = kept.colour?.mode;
    if (moved || mode === "brand" || mode === "photo") delete kept.colour;
    return {
        ...rest,
        look,
        ...(moved || !paint ? {} : { paint }),
        ...(moved || seed === undefined ? {} : { seed }),
        ...(Object.keys(kept).length ? { style: kept } : {}),
    };
}

function contentDown(page: Page, live: Page | null): Page {
    const known = liveBlocks(live);
    const allowedBlock = (block: Block) => {
        const paid = (PAID_BLOCKS as readonly string[]).includes(block.type);
        if (paid && !known.has(block.id)) return false;
        return !isScheduled(block) || scheduleIsLive(block, known);
    };
    const inside = (block: Block): Block =>
        block.type === "tabs"
            ? {
                  ...block,
                  tabs: block.tabs.map((tab) => ({
                      ...tab,
                      blocks: tab.blocks.filter(allowedBlock),
                  })),
              }
            : block;
    const trimmed = { ...page, blocks: page.blocks.filter(allowedBlock).map(inside) };
    // Past the limit, the newest arrivals stay in the draft. Sections already live stay live.
    const counted = countedSections(trimmed);
    const allowed = Math.max(PLANS.free.sections ?? 0, live ? countedSections(live).length : 0);
    if (counted.length <= allowed) return trimmed;
    const over = new Set(
        counted
            .filter((section) => !section.all.some((block) => known.has(block.id)))
            .slice(-(counted.length - allowed))
            .map((section) => section.id),
    );
    return {
        ...trimmed,
        blocks: sectionsOf(trimmed.blocks).flatMap((section) =>
            over.has(section.id) ? [] : section.all,
        ),
    };
}

/**
 * A copy with free choices, leaving the page given as it was. A downgrade keeps the content. Publishing
 * with free choices also leaves off what's paid, and keeps a design the plan still allows.
 */
export function stepDown(
    page: Page,
    options: { keepContent: boolean; live?: Page | null; keepDesign?: boolean },
): Page {
    const designed = options.keepDesign ? page : designDown(page);
    return options.keepContent ? designed : contentDown(designed, options.live ?? null);
}
