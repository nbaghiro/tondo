import { handleSchema, MOST_PACKS, normaliseHandle, pageSchema } from "@tondo/page";
import { z } from "zod";

export const routes = {
    health: "/health",
    // Neon Auth's endpoints, proxied by the server so its cookies stay on our domain.
    auth: "/api/auth",
    signUp: "/api/auth/sign-up/email",
    signIn: "/api/auth/sign-in/email",
    signInSocial: "/api/auth/sign-in/social",
    signOut: "/api/auth/sign-out",
    verifyEmail: "/api/auth/email-otp/verify-email",
    sendCode: "/api/auth/email-otp/send-verification-otp",
    requestReset: "/api/auth/email-otp/request-password-reset",
    resetPassword: "/api/auth/email-otp/reset-password",
    changePassword: "/api/auth/change-password",
    /** Where Google sends people back to, carrying the address they chose. */
    authReturn: "/api/v1/auth/return",
    me: "/api/v1/me",
    claim: "/api/v1/me/handle",
    handleCheck: (value: string) => `/api/v1/handles/${encodeURIComponent(value)}`,
    pages: "/api/v1/me/pages",
    page: (id: string) => `/api/v1/me/pages/${id}`,
    pageHandle: (id: string) => `/api/v1/me/pages/${id}/handle`,
    publish: (id: string) => `/api/v1/me/pages/${id}/publish`,
    live: (id: string) => `/api/v1/me/pages/${id}/live`,
    publishCheck: (id: string) => `/api/v1/me/pages/${id}/check`,
    unpublish: (id: string) => `/api/v1/me/pages/${id}/unpublish`,
    stats: (id: string) => `/api/v1/me/pages/${id}/stats`,
    photos: "/api/v1/me/photos",
    photo: (file: string) => `/api/v1/me/photos/${encodeURIComponent(file)}`,
    billing: "/api/v1/me/billing",
    billingCheckout: "/api/v1/me/billing/checkout",
    billingPortal: "/api/v1/me/billing/portal",
    billingSync: "/api/v1/me/billing/sync",
    billingPacks: "/api/v1/me/billing/packs",
    stripeWebhook: "/api/stripe/webhook",
    team: "/api/v1/me/team",
    teamInvites: "/api/v1/me/team/invites",
    teamPages: "/api/v1/me/team/pages",
    teamPage: "/api/v1/me/team/page",
    teamLeave: "/api/v1/me/team/leave",
    teamJoin: "/api/v1/me/team/join",
    teamHandover: "/api/v1/me/team/handover",
    teamTakeover: "/api/v1/me/team/takeover",
    teamPerson: (value: string) => `/api/v1/me/team/people/${encodeURIComponent(value)}`,
    invite: (token: string) => `/api/v1/invites/${encodeURIComponent(token)}`,
    assistant: "/api/v1/me/assistant",
    assistantTurn: "/api/v1/me/assistant/turn",
    assistantImage: "/api/v1/me/assistant/image",
    assistantPhoto: "/api/v1/me/assistant/photo",
    assistantDiscard: "/api/v1/me/assistant/discard",
} as const;

export const healthResponse = z.strictObject({ status: z.literal("ok") });
export const errorResponse = z.strictObject({ error: z.string(), code: z.string().optional() });

const handle = z.string().transform(normaliseHandle).pipe(handleSchema);

/** The address, and optionally the page the start flow built. */
export const claimRequest = z.strictObject({ handle, page: pageSchema.optional() });
export const handleResponse = z.strictObject({ available: z.boolean(), message: z.string() });
const limits = z.strictObject({
    pages: z.number(),
    live: z.number(),
    photos: z.number(),
    credits: z.number(),
    creditsOnce: z.boolean(),
    team: z.boolean(),
});
export const pageSummary = z.strictObject({
    id: z.string(),
    handle: z.string(),
    name: z.string(),
    look: z.string(),
    seed: z.number().nullable(),
    /** The page's own header photo, if it has one. */
    photo: z.string().nullable(),
    live: z.boolean(),
    changed: z.boolean(),
    updatedAt: z.string(),
    /** Whose it is, seen from the person asking. */
    side: z.enum(["own", "joined", "team", "teammate"]),
    /** Published, and not shown to visitors because a plan doesn't cover it now. */
    offline: z.boolean(),
});
export const pagesResponse = z.strictObject({ pages: z.array(pageSummary) });
export type PageSummary = z.infer<typeof pageSummary>;
export type PagesResponse = z.infer<typeof pagesResponse>;
export const meResponse = z.strictObject({
    email: z.string(),
    name: z.string(),
    /** Oldest first. Empty means this person still needs the start flow. */
    pages: z.array(pageSummary),
    plan: z.enum(["free", "starter", "pro"]),
    limits,
    /** When a plan ended or will end, as an ISO date. */
    endsAt: z.string().nullable(),
    /** Whether plans are switched on here. While it's false, nothing mentions them. */
    billing: z.boolean(),
    /** The team this person is on or owns. */
    team: z
        .strictObject({ name: z.string(), role: z.enum(["owner", "editor", "member"]) })
        .nullable(),
});

export const checkoutRequest = z.strictObject({
    plan: z.enum(["starter", "pro"]),
    period: z.enum(["month", "year"]),
    /** Where to come back to, inside the app. */
    from: z.enum(["edit", "account"]),
    /** The page being published, so coming back opens that one. */
    page: z.uuid().optional(),
});
export const packsRequest = z.strictObject({ packs: z.number().int().min(1).max(MOST_PACKS) });
export const billingUrlResponse = z.strictObject({ url: z.string() });
export const billingResponse = z.strictObject({
    period: z.enum(["month", "year"]).nullable(),
    /** The end of the period that's paid for, as an ISO date. */
    until: z.string().nullable(),
    cancelling: z.boolean(),
    /** The last payment didn't go through, and Stripe is retrying. */
    failing: z.boolean(),
    /** When a free trial ends, as an ISO date. */
    trialUntil: z.string().nullable(),
    /** Whether the next subscription starts with a trial. */
    trialLeft: z.boolean(),
});
export type BillingUrlResponse = z.infer<typeof billingUrlResponse>;
export type CheckoutRequest = z.infer<typeof checkoutRequest>;
export type BillingResponse = z.infer<typeof billingResponse>;

const teamPerson = z.strictObject({
    pageId: z.string().nullable(),
    handle: z.string().nullable(),
    name: z.string(),
    photo: z.string().nullable(),
    role: z.enum(["owner", "editor", "member"]),
    you: z.boolean(),
    live: z.boolean(),
});
export const teamResponse = z.strictObject({
    id: z.string(),
    name: z.string(),
    handle: z.string(),
    lookPageId: z.string(),
    lookLive: z.boolean(),
    role: z.enum(["owner", "editor", "member"]),
    /** Whether the owner's plan covers the team now. */
    covered: z.boolean(),
    /** How many pages the team can hold, counting its own and everyone's joined page. */
    room: z.number(),
    /** How many it holds now. */
    held: z.number(),
    ownerSuspended: z.boolean(),
    myPageId: z.string().nullable(),
    people: z.array(teamPerson),
    /** The team's own pages, for the owner and editors. */
    pages: z.array(pageSummary),
});
export type TeamResponse = z.infer<typeof teamResponse>;
export type TeamPerson = z.infer<typeof teamPerson>;
export const newTeamRequest = z.strictObject({
    name: z.string().trim().min(1).max(80),
    handle,
    /** One of this person's pages to bring. */
    join: z.string().max(40).optional(),
});
export const deleteTeamRequest = z.strictObject({ handle: z.string().max(40) });
export const makeInviteRequest = z.strictObject({
    /** One of the team's own pages, made for whoever opens the link. */
    page: z.string().max(40).optional(),
});
export const madeInviteResponse = z.strictObject({ url: z.string(), until: z.string() });
export type MadeInviteResponse = z.infer<typeof madeInviteResponse>;
export const newTeamPageRequest = z.strictObject({
    name: z.string().trim().min(1).max(80),
    handle,
    /** A page to copy, which starts the next person's. */
    from: z.string().max(40).optional(),
});
export const setTeamPageRequest = z.strictObject({ page: z.string().max(40).nullable() });
export const changeRoleRequest = z.strictObject({ role: z.enum(["editor", "member"]) });
export const teamPersonRequest = z.strictObject({ handle: z.string().max(40) });
const inviteToken = z.string().max(1024);
export const takeoverRequest = z.strictObject({ invite: inviteToken });
export const joinRequest = z.strictObject({
    invite: inviteToken,
    /** One of this person's pages, or "made" for the page the link names. */
    page: z.string().max(40),
});
export const inviteResponse = z.strictObject({
    kind: z.enum(["join", "takeover"]),
    name: z.string(),
    handle: z.string(),
    until: z.string(),
    look: pageSchema.pick({ look: true, paint: true, style: true }).nullable(),
    made: z.strictObject({ id: z.string(), handle: z.string(), name: z.string() }).nullable(),
    full: z.boolean(),
    covered: z.boolean(),
});
export type InviteResponse = z.infer<typeof inviteResponse>;

export const liveResponse = z.strictObject({ page: pageSchema });
const draftTeam = z.strictObject({
    name: z.string(),
    role: z.enum(["owner", "editor", "member"]),
    lookPageId: z.string(),
    isLookPage: z.boolean(),
    /** Whether the owner's plan covers the team now. */
    covered: z.boolean(),
    /** What to draw this page with. Editor state stays the page's own, so this is never saved. */
    look: pageSchema.pick({ look: true, paint: true, style: true }).nullable(),
    /** Whether this person can change this page's look. */
    locked: z.boolean(),
});
export type DraftTeamResponse = z.infer<typeof draftTeam>;
export const draftResponse = z.strictObject({
    page: pageSchema,
    handle: z.string(),
    updatedAt: z.string(),
    published: z.boolean(),
    changed: z.boolean(),
    /** Taken down for breaking the rules. It can't go live, and the person is told why. */
    suspended: z.boolean(),
    /** Published, and not shown to visitors because the plan doesn't cover it now. */
    offline: z.boolean(),
    side: pageSummary.shape.side,
    team: draftTeam.nullable(),
});
// Always the text the server sent back. Anything else is refused before it reaches the database.
const stamp = z
    .string()
    .max(40)
    .regex(/^\d[\d\-:.+ TZ]*$/);
export const saveRequest = z.strictObject({
    page: pageSchema,
    updatedAt: stamp,
    /** Saves whose answers never arrived. If one of them landed, this retry isn't a conflict. */
    previous: z.array(z.string().max(40)).max(20).optional(),
});
export const publishRequest = z.strictObject({
    updatedAt: stamp,
});
export const changeHandleRequest = z.strictObject({ handle });
export const deleteAccountRequest = z.strictObject({ email: z.string().max(320) });
export const newPageRequest = z.union([
    /** The page the start flow built. */
    z.strictObject({ handle, page: pageSchema }),
    z.strictObject({
        name: z.string().trim().min(1).max(80),
        handle,
        /** One of the person's pages to start from, instead of a blank one. */
        from: z.string().max(40).optional(),
    }),
]);
export type NewPageRequest = z.input<typeof newPageRequest>;
export const newPageResponse = z.strictObject({ id: z.string() });
export type NewPageResponse = z.infer<typeof newPageResponse>;
export const handleChangedResponse = z.strictObject({ handle: z.string() });
export type HandleChangedResponse = z.infer<typeof handleChangedResponse>;
export const issuesResponse = z.strictObject({
    error: z.string(),
    issues: z.array(
        z.strictObject({
            target: z.string(),
            item: z.string().optional(),
            message: z.string(),
            url: z.string().optional(),
            plan: z.enum(["any", "pro"]).optional(),
        }),
    ),
});
export const statsResponse = z.strictObject({
    views: z.number(),
    clicks: z.number(),
    days: z.array(z.strictObject({ day: z.string(), views: z.number(), clicks: z.number() })),
    links: z.array(z.strictObject({ url: z.string(), clicks: z.number() })),
    /** Clicks on links that are no longer on the page, so the list still adds up to the total. */
    earlierClicks: z.number(),
    /** The days this answer covers. */
    range: z.number(),
});
export const publishCheckResponse = z.strictObject({ issues: issuesResponse.shape.issues });
export type PublishCheckResponse = z.infer<typeof publishCheckResponse>;
export const photosResponse = z.strictObject({ files: z.array(z.string()) });

export const assistantStatus = z.strictObject({
    available: z.boolean(),
    creditsLeft: z.number(),
    credits: z.number(),
    /** The first day of next month, as a date. */
    resetsOn: z.string(),
    /** These credits don't come back, so `resetsOn` doesn't apply. */
    once: z.boolean(),
    imageCredits: z.number(),
    /** False if there's no image model on this server, so nothing offers to make one. */
    images: z.boolean(),
});

export const assistantTurn = z.strictObject({
    page: pageSchema,
    message: z.string().trim().min(1).max(4000),
    /** Plain words only. Nothing from a past turn's tools crosses into the next. */
    history: z
        .array(
            z.strictObject({
                role: z.enum(["user", "model"]),
                text: z.string().max(4000),
            }),
        )
        .max(20),
    selected: z.string().max(100).nullable(),
    timeZone: z.string().max(60).optional(),
});

const photoChoice = z.strictObject({
    url: z.url(),
    /** A small data: image, fetched by the server so a visitor's browser doesn't call the provider. */
    thumb: z.string().regex(/^data:image\/webp;base64,/),
    alt: z.string(),
    credit: z.string(),
    creditUrl: z.string(),
    provider: z.string(),
    providerUrl: z.string(),
    licence: z.string(),
});
export type PhotoChoice = z.infer<typeof photoChoice>;

export const assistantOffer = z.discriminatedUnion("type", [
    z.strictObject({
        type: z.literal("choice"),
        question: z.string(),
        options: z.array(z.string()),
    }),
    z.strictObject({ type: z.literal("publish") }),
    z.strictObject({
        type: z.literal("remove"),
        sections: z.array(z.strictObject({ id: z.string(), name: z.string() })),
    }),
    z.strictObject({ type: z.literal("replace"), page: pageSchema }),
    z.strictObject({
        type: z.literal("photos"),
        target: z.string(),
        choices: z.array(photoChoice),
    }),
    z.strictObject({
        type: z.literal("image"),
        prompt: z.string(),
        kind: z.enum(["photo", "logo", "art"]),
        target: z.string(),
        count: z.number(),
        credits: z.number(),
    }),
]);
export type AssistantOffer = z.infer<typeof assistantOffer>;

export const assistantEvent = z.discriminatedUnion("type", [
    z.strictObject({ type: z.literal("status"), text: z.string() }),
    z.strictObject({ type: z.literal("page"), page: pageSchema }),
    z.strictObject({ type: z.literal("offer"), offer: assistantOffer }),
    z.strictObject({
        type: z.literal("done"),
        page: pageSchema,
        reply: z.string(),
        changes: z.array(z.string()),
        creditsLeft: z.number(),
        /** True when a turn limit ended it early, and what's here is only part of the request. */
        partial: z.boolean(),
    }),
    z.strictObject({
        type: z.literal("stopped"),
        reason: z.enum(["refusal", "error"]),
        message: z.string(),
    }),
]);
export type AssistantEvent = z.infer<typeof assistantEvent>;

export const assistantImageRequest = z.strictObject({
    prompt: z.string().trim().min(1).max(400),
    kind: z.enum(["photo", "logo", "art"]),
    count: z.number().int().min(1).max(3),
    /** The name at the top of their page, so a logo may use it. */
    name: z.string().max(80),
});
export const assistantImageResponse = z.strictObject({
    files: z.array(z.string()),
    creditsLeft: z.number(),
});
export const assistantPhotoRequest = z.strictObject({ url: z.url() });
export const assistantPhotoResponse = z.strictObject({ file: z.string() });
export const assistantDiscardRequest = z.strictObject({ files: z.array(z.string()).max(3) });
export type AssistantStatus = z.infer<typeof assistantStatus>;
export type AssistantTurn = z.infer<typeof assistantTurn>;

export const deleteAccountResponse = z.strictObject({
    photosRemoved: z.boolean(),
    pageRemoved: z.boolean(),
    signInRemoved: z.boolean(),
});
/** False means the cookies are gone but Neon didn't confirm the session ended. */
export interface SignOutResponse {
    ended: boolean;
}
export type DeleteAccountResponse = z.infer<typeof deleteAccountResponse>;
export type LiveResponse = z.infer<typeof liveResponse>;
export type DraftResponse = z.infer<typeof draftResponse>;
export type SaveRequest = z.infer<typeof saveRequest>;
export type IssuesResponse = z.infer<typeof issuesResponse>;
export type StatsResponse = z.infer<typeof statsResponse>;
export type PhotosResponse = z.infer<typeof photosResponse>;
export interface SaveResponse {
    updatedAt: string;
}
export type HandleResponse = z.infer<typeof handleResponse>;
export type ClaimRequest = z.infer<typeof claimRequest>;
export type MeResponse = z.infer<typeof meResponse>;
export type HealthResponse = z.infer<typeof healthResponse>;
export type ErrorResponse = z.infer<typeof errorResponse>;

/** What Neon Auth sends when it refuses something. */
export interface AuthError {
    code?: string;
    message?: string;
}
