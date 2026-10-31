import { handleSchema, normaliseHandle, pageSchema } from "@tondo/page";
import { z } from "zod";

export const routes = {
    health: "/health",
    page: (handle: string) => `/api/v1/pages/${encodeURIComponent(handle)}`,
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
} as const;

export const healthResponse = z.strictObject({ status: z.literal("ok") });
export const pageResponse = z.strictObject({ page: pageSchema });
export const errorResponse = z.strictObject({ error: z.string() });

const handle = z.string().transform(normaliseHandle).pipe(handleSchema);

export const claimRequest = z.strictObject({ handle });
export const meResponse = z.strictObject({
    email: z.string(),
    name: z.string(),
    handle: z.string().nullable(),
});

export type ClaimRequest = z.infer<typeof claimRequest>;
export type MeResponse = z.infer<typeof meResponse>;
export type HealthResponse = z.infer<typeof healthResponse>;
export type PageResponse = z.infer<typeof pageResponse>;
export type ErrorResponse = z.infer<typeof errorResponse>;

/** What Neon Auth sends when it refuses something. */
export interface AuthError {
    code?: string;
    message?: string;
}
