import { exampleHandles } from "./example-handles";

// Every top-level route has to be here, or a person could claim the address of a Tondo page. The rest
// are words that could be used to pose as Tondo, such as tondo.page/security.
const RESERVED = new Set([
    "about",
    "abuse",
    "account",
    "accounts",
    "admin",
    "api",
    "app",
    "assets",
    "auth-strip",
    "billing",
    "blog",
    "careers",
    "claim",
    "contact",
    "dashboard",
    "developers",
    "docs",
    "download",
    "examples",
    "forgot",
    "gallery",
    "health",
    "help",
    "home",
    "join",
    "l",
    "legal",
    "login",
    "logout",
    "mail",
    "news",
    "official",
    "payments",
    "photos",
    "plans",
    "pricing",
    "privacy",
    "report",
    "reset",
    "root",
    "security",
    "settings",
    "shots",
    "signin",
    "signup",
    "staff",
    "start",
    "status",
    "store",
    "support",
    "system",
    "team",
    "teams",
    "terms",
    "tondo",
    "verify",
    "no-reply",
    "noreply",
    "postmaster",
    "sign-in",
    "sign-up",
    "log-in",
    "hostmaster",
    "mailer-daemon",
    "do-not-reply",
    "verified",
    "team-tondo",
    "webmail",
    "www",
    ...exampleHandles,
]);

const HANDLE = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/;

export function normaliseHandle(raw: string): string {
    return raw.trim().toLowerCase();
}

export function isValidHandle(handle: string): boolean {
    return HANDLE.test(handle);
}

// tondo-help or t0ndo-support could pass for us just as well as the plain name.
const POSES_AS_US = /^(tondo|t0ndo|tond0|t0nd0)(-|$)/;

export function isReservedHandle(handle: string): boolean {
    return RESERVED.has(handle) || POSES_AS_US.test(handle);
}
