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
    /** Where Google sends people back to, carrying the address they chose. */
    authReturn: "/api/v1/auth/return",
    me: "/api/v1/me",
    claim: "/api/v1/me/handle",
    handleCheck: (value: string) => `/api/v1/handles/${encodeURIComponent(value)}`,
    draft: "/api/v1/me/page",
    publish: "/api/v1/me/page/publish",
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

export const draftResponse = z.strictObject({
    page: pageSchema,
    updatedAt: z.string(),
    published: z.boolean(),
    changed: z.boolean(),
});
export const saveRequest = z.strictObject({ page: pageSchema, updatedAt: z.string().max(40) });
export const publishRequest = z.strictObject({ updatedAt: z.string().max(40) });
export const issuesResponse = z.strictObject({
    error: z.string(),
    issues: z.array(
        z.strictObject({
            target: z.string(),
            item: z.string().optional(),
            message: z.string(),
        }),
    ),
});
export const statsResponse = z.strictObject({ views: z.number(), clicks: z.number() });
export const photosResponse = z.strictObject({ files: z.array(z.string()) });

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
