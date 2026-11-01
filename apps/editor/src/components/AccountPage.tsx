import { createSignal, Show } from "solid-js";
import { logOut, SITE_URL } from "../lib/account";
import type { Account } from "../lib/account";
import { changePassword, deleteAccount } from "../lib/api";
import { createToast, PageHeader, SettingsSection } from "./Parts";

export function AccountPage(props: { account: Account }) {
    const [now, setNow] = createSignal("");
    const [next, setNext] = createSignal("");
    const [problem, setProblem] = createSignal("");
    const [confirm, setConfirm] = createSignal("");
    const [deleteProblem, setDeleteProblem] = createSignal("");
    const [deleted, setDeleted] = createSignal<"all" | "signin-left" | null>(null);
    const toast = createToast();

    const savePassword = async (e: Event) => {
        e.preventDefault();
        if (next().length < 8) {
            setProblem("Use at least 8 characters for your new password.");
            return;
        }
        const failed = await changePassword(now(), next());
        setProblem(failed ?? "");
        if (!failed) {
            setNow("");
            setNext("");
            toast.say("Password changed");
        }
    };
    const remove = async (e: Event) => {
        e.preventDefault();
        const result = await deleteAccount(props.account.handle);
        if (typeof result === "string") {
            setDeleteProblem(result);
            return;
        }
        setDeleted(result.signInRemoved ? "all" : "signin-left");
    };

    return (
        <Show
            when={!deleted()}
            fallback={
                <div class="empty">
                    <h2>Your page is gone</h2>
                    <p>
                        {deleted() === "all"
                            ? "Your account, page and photos have been deleted."
                            : "Your page and photos have been deleted. Your sign-in details are still stored, so email support if you'd like those removed too."}
                    </p>
                    <button class="b logout" onClick={logOut}>
                        Leave
                    </button>
                </div>
            }
        >
            <PageHeader title="Account" lead="Your sign-in details." />
            <SettingsSection title="Email" lead="Where your codes and notices go.">
                <label class="f">
                    Email
                    <input readOnly value={props.account.email} />
                </label>
            </SettingsSection>
            <SettingsSection
                title="Password"
                lead="If you sign in with Google, you won't have one here."
            >
                <form
                    onSubmit={(e) => {
                        savePassword(e).catch(() => undefined);
                    }}
                >
                    <label class="f">
                        Current password
                        <input
                            type="password"
                            name="current"
                            autocomplete="current-password"
                            value={now()}
                            onInput={(e) => setNow(e.currentTarget.value)}
                        />
                    </label>
                    <label class="f">
                        New password
                        <input
                            type="password"
                            name="new"
                            autocomplete="new-password"
                            value={next()}
                            onInput={(e) => setNext(e.currentTarget.value)}
                        />
                        <small>At least 8 characters.</small>
                    </label>
                    <Show when={problem()}>
                        <p class="bad-note" role="alert">
                            {problem()}
                        </p>
                    </Show>
                    <div class="acts">
                        <button class="b" type="submit">
                            Change password
                        </button>
                        <a class="lnk" href={`${SITE_URL}/forgot`}>
                            Forgot it?
                        </a>
                    </div>
                </form>
            </SettingsSection>
            <SettingsSection title="Log out" lead="You can log back in any time.">
                <button class="b logout" onClick={logOut}>
                    Log out
                </button>
            </SettingsSection>
            <SettingsSection
                title="Delete account"
                lead="This removes your page, your photos and your numbers. It can't be undone."
            >
                <form
                    onSubmit={(e) => {
                        remove(e).catch(() => undefined);
                    }}
                >
                    <label class="f">
                        Type your address to confirm
                        <input
                            name="confirm"
                            autocomplete="off"
                            autocapitalize="off"
                            placeholder={props.account.handle}
                            value={confirm()}
                            onInput={(e) => setConfirm(e.currentTarget.value)}
                        />
                    </label>
                    <Show when={deleteProblem()}>
                        <p class="bad-note" role="alert">
                            {deleteProblem()}
                        </p>
                    </Show>
                    <button
                        class="b bad delete-account"
                        type="submit"
                        disabled={confirm().trim() !== props.account.handle}
                    >
                        Delete my account
                    </button>
                </form>
            </SettingsSection>
            <toast.View />
        </Show>
    );
}
