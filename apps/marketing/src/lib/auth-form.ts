import { routes } from "@tondo/contract";
import type { AuthError, MeResponse } from "@tondo/contract";

const EDITOR_URL =
    (import.meta.env["PUBLIC_EDITOR_URL"] as string | undefined) ??
    (import.meta.env.DEV ? "http://localhost:8100" : "/app");
const URL_ERRORS: Record<string, string> = {
    "not-set-up": "Sign-in isn't set up yet.",
    "google-failed": "Google sign-in didn't complete. Please try again.",
};
const AUTH_ERRORS: Record<string, string> = {
    NOT_SET_UP: "Sign-in isn't set up yet.",
    INVALID_EMAIL_OR_PASSWORD: "That email and password don't match.",
    INVALID_EMAIL: "Enter a valid email address.",
    PASSWORD_TOO_SHORT: "Use at least 8 characters for your password.",
    PASSWORD_TOO_LONG: "Use a shorter password.",
    USER_ALREADY_EXISTS: "An account with this email already exists. Log in instead.",
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
        "An account with this email already exists. Log in instead.",
    EMAIL_NOT_VERIFIED: "Please verify your email address first.",
    INVALID_OTP: "That code isn't right. Check it and try again.",
    OTP_EXPIRED: "That code has expired. Send a new one and try again.",
    TOO_MANY_ATTEMPTS: "Too many tries. Send a new code and try again.",
};
const UNREACHABLE = "We couldn't reach Tondo. Check your connection and try again.";

const form = document.querySelector<HTMLFormElement>("form[data-auth]");
const errorBox = document.querySelector<HTMLElement>("[data-error]");
const kind = form?.getAttribute("data-auth") ?? "";
const params = new URLSearchParams(location.search);
const showError = (message: string) => {
    if (errorBox) errorBox.textContent = message;
};

// Development only: lets `.scratchpad/auth-strip` show the real form in a frame.
const preview = import.meta.env.DEV && params.has("preview");

// The editor runs the start flow for someone with no address yet, and checks the one they asked for.
const goOn = (account: Pick<MeResponse, "handle">, handle?: string) => {
    const asked = !account.handle && handle ? `?handle=${encodeURIComponent(handle)}` : "";
    const next = `${EDITOR_URL}${asked}`;
    if (preview) window.parent.postMessage({ tondoGoTo: next }, "*");
    else location.assign(next);
};

// What the code screens need, kept for this tab only so the email stays out of the address bar.
const PENDING = "tondo-pending";
interface Pending {
    email: string;
    handle?: string | undefined;
}
const savePending = (pending: Pending) => {
    sessionStorage.setItem(PENDING, JSON.stringify(pending));
};
const loadPending = (): Pending | null => {
    const saved = sessionStorage.getItem(PENDING);
    return saved ? (JSON.parse(saved) as Pending) : null;
};
const goTo = (path: string) => {
    if (preview) window.parent.postMessage({ tondoGoTo: new URL(path, location.href).href }, "*");
    else location.assign(path);
};

const pending = loadPending();
if (kind === "verify" || kind === "reset") {
    if (!pending) location.assign(kind === "verify" ? "/signup" : "/forgot");
    for (const node of document.querySelectorAll("[data-email]")) {
        node.textContent = pending?.email ?? "";
    }
}
const notice = (message: string) => {
    const box = document.querySelector("[data-notice]");
    if (box) box.textContent = message;
};
if (kind === "login" && params.get("notice") === "reset") {
    notice("Your password is changed. Log in with the new one.");
}

if (kind === "login" && params.get("notice") === "device-only") {
    notice(
        "You're logged out on this device, but we couldn't confirm the session ended. Log in and out again to be sure.",
    );
}

const urlError = params.get("error");
if (urlError) showError(URL_ERRORS[urlError] ?? URL_ERRORS["google-failed"] ?? "");

// The address chosen on the marketing page carries through sign-up, including through Google.
const wanted = params.get("handle")?.trim().toLowerCase();
if (wanted && form) {
    const field = form.elements.namedItem("handle");
    if (field instanceof HTMLInputElement) field.value = wanted;
    const lead = document.querySelector<HTMLElement>("[data-lead]");
    if (lead && kind === "signup") {
        lead.textContent = "You're claiming ";
        lead.append(
            Object.assign(document.createElement("b"), { textContent: `tondo.page/${wanted}` }),
        );
        lead.append(".");
    }
}

// Someone who's already logged in has no reason to be here.
fetch(routes.me)
    .then(async (res) => {
        if (!res.ok) {
            return;
        }
        if (kind === "reset") return;
        const account = (await res.json()) as MeResponse;
        if (!preview) goOn(account, wanted);
    })
    .catch(() => {
        showError(UNREACHABLE);
    });

const postJson = (path: string, body: object) =>
    fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });

const authMessage = async (res: Response) => {
    const body = (await res.json().catch(() => ({}))) as AuthError;
    return AUTH_ERRORS[body.code ?? ""] ?? body.message ?? "That didn't work. Please try again.";
};

const toHandle = (value: FormDataEntryValue | null) => (typeof value === "string" ? value : "");

// Sign-up happens in Neon Auth. Once the email is verified, the editor takes over.
async function signUp(email: string, password: string, handle: string): Promise<string | null> {
    if (password.length < 8) return "Use at least 8 characters for your password.";
    const name = email.split("@")[0] ?? email;
    const res = await postJson(routes.signUp, { name, email, password });
    if (!res.ok) return authMessage(res);
    const body = (await res.json()) as { user?: { emailVerified?: boolean } };
    if (body.user?.emailVerified === false) {
        savePending({ email, handle: handle || undefined });
        goTo("/verify");
        return null;
    }
    await continueAs(handle);
    return null;
}

async function continueAs(handle: string | undefined): Promise<void> {
    const me = await fetch(routes.me);
    goOn(me.ok ? ((await me.json()) as MeResponse) : { handle: null }, handle);
}

const sendCode = (email: string) =>
    postJson(routes.sendCode, { email, type: "email-verification" });

async function logIn(email: string, password: string): Promise<string | null> {
    const res = await postJson(routes.signIn, { email, password });
    if (res.status === 403) {
        const body = (await res
            .clone()
            .json()
            .catch(() => ({}))) as AuthError;
        if (body.code === "EMAIL_NOT_VERIFIED") {
            await sendCode(email);
            savePending({ email });
            goTo("/verify");
            return null;
        }
    }
    if (!res.ok) return authMessage(res);
    const me = await fetch(routes.me);
    if (!me.ok) return "We couldn't load your account. Please try again.";
    goOn((await me.json()) as MeResponse);
    return null;
}

async function verify(code: string): Promise<string | null> {
    if (!pending) return "Start again from the sign-up page.";
    const res = await postJson(routes.verifyEmail, { email: pending.email, otp: code });
    if (!res.ok) return authMessage(res);
    sessionStorage.removeItem(PENDING);
    const me = await fetch(routes.me);
    if (!me.ok) {
        goTo("/login");
        return null;
    }
    const account = (await me.json()) as MeResponse;
    await continueAs(account.handle ? undefined : pending.handle);
    return null;
}

async function requestReset(email: string): Promise<string | null> {
    const res = await postJson(routes.requestReset, { email });
    if (!res.ok) return authMessage(res);
    savePending({ email });
    goTo("/reset");
    return null;
}

async function resetPassword(code: string, password: string): Promise<string | null> {
    if (!pending) return "Start again from the password reset page.";
    if (password.length < 8) return "Use at least 8 characters for your password.";
    const res = await postJson(routes.resetPassword, { email: pending.email, otp: code, password });
    if (!res.ok) return authMessage(res);
    sessionStorage.removeItem(PENDING);
    goTo("/login?notice=reset");
    return null;
}

const RESEND_WAIT_MS = 30_000;
const resend = document.querySelector<HTMLButtonElement>("[data-resend]");
resend?.addEventListener("click", () => {
    if (!pending) return;
    resend.disabled = true;
    showError("");
    notice("");
    setTimeout(() => {
        resend.disabled = false;
    }, RESEND_WAIT_MS);
    sendCode(pending.email)
        .then(async (res) => {
            if (res.ok) notice("We sent a new code.");
            else showError(await authMessage(res));
        })
        .catch(() => {
            showError(UNREACHABLE);
        });
});

form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    const data = new FormData(form);
    const email = toHandle(data.get("email")).trim();
    const password = toHandle(data.get("password"));
    const handle = toHandle(data.get("handle"));
    const code = toHandle(data.get("code")).trim();
    if (button) button.disabled = true;
    showError("");
    const attempt =
        kind === "signup"
            ? signUp(email, password, handle)
            : kind === "login"
              ? logIn(email, password)
              : kind === "verify"
                ? verify(code)
                : kind === "forgot"
                  ? requestReset(email)
                  : kind === "reset"
                    ? resetPassword(code, password)
                    : Promise.resolve(null);
    attempt
        .then((message) => {
            if (message !== null) {
                showError(message);
                if (button) button.disabled = false;
            }
        })
        .catch(() => {
            showError(UNREACHABLE);
            if (button) button.disabled = false;
        });
});

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-google]")) {
    button.addEventListener("click", () => {
        const back = new URL(routes.authReturn, location.origin);
        if (wanted) back.searchParams.set("handle", wanted);
        showError("");
        postJson(routes.signInSocial, { provider: "google", callbackURL: back.href })
            .then(async (res) => {
                if (!res.ok) {
                    showError(await authMessage(res));
                    return;
                }
                const { url } = (await res.json()) as { url?: string };
                if (url) location.assign(url);
                else showError(URL_ERRORS["google-failed"] ?? "");
            })
            .catch(() => {
                showError(UNREACHABLE);
            });
    });
}
