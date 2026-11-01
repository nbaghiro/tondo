import { handleSchema, normaliseHandle, pageSchema } from "@tondo/page";
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
    draft: "/api/v1/me/page",
    publish: "/api/v1/me/page/publish",
    live: "/api/v1/me/page/live",
    publishCheck: "/api/v1/me/page/check",
    unpublish: "/api/v1/me/page/unpublish",
    stats: "/api/v1/me/stats",
    photos: "/api/v1/me/photos",
} as const;

export const healthResponse = z.strictObject({ status: z.literal("ok") });
export const errorResponse = z.strictObject({ error: z.string() });

const handle = z.string().transform(normaliseHandle).pipe(handleSchema);

/** The address, and optionally the page the start flow built. */
export const claimRequest = z.strictObject({ handle, page: pageSchema.optional() });
export const handleResponse = z.strictObject({ available: z.boolean(), message: z.string() });
export const meResponse = z.strictObject({
    email: z.string(),
    name: z.string(),
    handle: z.string().nullable(),
});

export const liveResponse = z.strictObject({ page: pageSchema });
export const draftResponse = z.strictObject({
    page: pageSchema,
    updatedAt: z.string(),
    published: z.boolean(),
    changed: z.boolean(),
    /** Taken down for breaking the rules. It can't go live, and the person is told why. */
    suspended: z.boolean(),
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
export const publishRequest = z.strictObject({ updatedAt: stamp });
export const changeHandleRequest = z.strictObject({ handle });
export const deleteAccountRequest = z.strictObject({ handle });
export const issuesResponse = z.strictObject({
    error: z.string(),
    issues: z.array(
        z.strictObject({
            target: z.string(),
            item: z.string().optional(),
            message: z.string(),
            url: z.string().optional(),
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
});
export const publishCheckResponse = z.strictObject({ issues: issuesResponse.shape.issues });
export type PublishCheckResponse = z.infer<typeof publishCheckResponse>;
export const photosResponse = z.strictObject({ files: z.array(z.string()) });

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
