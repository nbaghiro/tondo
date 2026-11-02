import { createResource, createSignal, Show } from "solid-js";
import type { PaidPlan, Period } from "@tondo/page";
import { logOut, SITE_URL } from "../lib/account";
import type { Account } from "../lib/account";
import {
    changePassword,
    deleteAccount,
    loadBilling,
    openPortal,
    startCheckout,
    syncBilling,
} from "../lib/api";
import { longDate, planName } from "../lib/plan-copy";
import { plan, refreshPlan } from "../state/plan";
import { createToast, PageHeader, SettingsSection } from "./Parts";
import { PlanChoice } from "./PlanChoice";

function PlanSection() {
    const [problem, setProblem] = createSignal("");
    const [billing, { refetch }] = createResource(async () => {
        const asked = new URLSearchParams(location.search);
        if (asked.get("billing") || asked.get("paid")) {
            history.replaceState(null, "", location.pathname);
            await syncBilling();
            await refreshPlan();
        }
        return plan()?.billing ? loadBilling() : null;
    });
    const go = async (url: Promise<string | null>) => {
        setProblem("");
        const opened = await url;
        if (opened) location.assign(opened);
        else setProblem("We couldn't open the payment page. Please try again.");
    };
    const onFree = () => plan()?.limits.live === 0;
    const name = () => {
        const current = plan();
        return current ? planName(current) : "";
    };
    const given = () => {
        const until = plan()?.endsAt;
        return until && !onFree() ? until : null;
    };
    const paid = () => billing()?.period;
    const line = () => {
        const until = given();
        if (until) return `You have ${name()} for free until ${longDate(until)}.`;
        if (onFree()) {
            return plan()?.endsAt
                ? "Your plan has ended, so you're on Free and your pages are offline. Their content is kept, and you can still edit them. Choose a plan and they come back online."
                : "You're on Free. You can build and preview a page, and a plan puts it online.";
        }
        const current = billing();
        if (!current?.period || !current.until) return `You're on ${name()}.`;
        const date = longDate(current.until);
        return current.cancelling
            ? `You're on ${name()} until ${date}, and it won't renew. After that your pages go offline, and their content stays.`
            : `You're on ${name()}, paid each ${current.period}. It renews on ${date}.`;
    };
    const choose = (chosen: PaidPlan, period: Period) => {
        go(startCheckout({ plan: chosen, period, from: "account" })).catch(() => undefined);
    };
    return (
        <Show when={plan()?.billing}>
            <SettingsSection title="Plan" lead="What you're on, and how it's billed.">
                <p data-plan-summary>{line()}</p>
                <Show when={billing()?.failing}>
                    <p class="bad-note" role="alert" data-payment-failing>
                        Your last payment didn't go through. Your plan and pages stay as they are
                        while we retry. If the retries run out, your plan ends and your pages go
                        offline. Update your card in Manage billing.
                    </p>
                </Show>
                <Show when={problem()}>
                    <p class="bad-note" role="alert">
                        {problem()}
                    </p>
                </Show>
                <Show when={onFree()}>
                    <PlanChoice offer="any" onChoose={choose} />
                </Show>
                <Show when={plan()?.plan === "starter" && !onFree() && !given() && paid()}>
                    <PlanChoice offer="pro" onChoose={choose} />
                </Show>
                <Show when={paid()}>
                    <div class="acts">
                        <button
                            class="b"
                            data-manage-billing
                            onClick={() => {
                                go(openPortal())
                                    .then(refetch)
                                    .catch(() => undefined);
                            }}
                        >
                            Manage billing
                        </button>
                    </div>
                </Show>
            </SettingsSection>
        </Show>
    );
}

export function AccountPage(props: { account: Account }) {
    const [now, setNow] = createSignal("");
    const [next, setNext] = createSignal("");
    const [problem, setProblem] = createSignal("");
    const [confirm, setConfirm] = createSignal("");
    const [deleteProblem, setDeleteProblem] = createSignal("");
    const [deleting, setDeleting] = createSignal(false);
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
        setDeleting(true);
        setDeleteProblem("");
        const result = await deleteAccount(props.account.email).finally(() => {
            setDeleting(false);
        });
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
            <PlanSection />
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
                lead={
                    plan()?.billing && plan()?.limits.live
                        ? "This removes your page, your photos and your numbers, and can't be undone. This also cancels your plan straight away, with no further charges."
                        : "This removes your page, your photos and your numbers. It can't be undone."
                }
            >
                <form
                    onSubmit={(e) => {
                        remove(e).catch(() => undefined);
                    }}
                >
                    <label class="f">
                        Type your email to confirm
                        <input
                            name="confirm"
                            autocomplete="off"
                            autocapitalize="off"
                            placeholder={props.account.email}
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
                        disabled={
                            deleting() ||
                            confirm().trim().toLowerCase() !== props.account.email.toLowerCase()
                        }
                    >
                        {deleting() ? "Deleting" : "Delete my account"}
                    </button>
                </form>
            </SettingsSection>
            <toast.View />
        </Show>
    );
}
