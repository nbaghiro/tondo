import { PLANS } from "@tondo/page";
import type { PaidPlan, Period } from "@tondo/page";
import { createSignal, onMount, Show } from "solid-js";
import type { Account } from "../lib/account";
import { startCheckout } from "../lib/api";
import { PlanChoice } from "./PlanChoice";

function NeedsPlan(props: { onClose: () => void }) {
    const [problem, setProblem] = createSignal("");
    const choose = async (plan: PaidPlan, period: Period) => {
        setProblem("");
        const url = await startCheckout({ plan, period, from: "account" });
        if (url) location.assign(url);
        else setProblem("We couldn't open the payment page. Please try again.");
    };
    return (
        <div data-page-limit="plan">
            <h2>Choose a plan to add a page</h2>
            <p>
                Your page is saved, and it's free to keep building. Starter and Pro let you build{" "}
                {PLANS.starter.pages} pages, and a plan puts them online.
            </p>
            <Show when={problem()}>
                <p class="bad-note" role="alert">
                    {problem()}
                </p>
            </Show>
            <PlanChoice
                offer="any"
                onChoose={(plan, period) => {
                    choose(plan, period).catch(() => undefined);
                }}
            />
            <p class="good-note">
                You'll confirm and pay on Stripe's page. You can go back from there without paying.
            </p>
            <div class="acts">
                <button
                    class="b"
                    type="button"
                    data-keep-editing
                    onClick={() => {
                        props.onClose();
                    }}
                >
                    Not now
                </button>
            </div>
        </div>
    );
}

function AllUsed(props: { count: number; onClose: () => void }) {
    return (
        <div data-page-limit="all">
            <h2>You're using all your pages</h2>
            <p>You're using all {props.count} pages. Delete one to add another.</p>
            <div class="acts">
                <button
                    class="b"
                    type="button"
                    onClick={() => {
                        props.onClose();
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    );
}

/** Says why another page can't be added on this plan. */
export function PageLimitPrompt(props: { account: Account; onClose: () => void }) {
    const [dialog, setDialog] = createSignal<HTMLDialogElement>();
    onMount(() => {
        dialog()?.showModal();
    });
    const close = () => {
        dialog()?.close();
    };
    return (
        <dialog
            class="page-limit"
            aria-label="New page"
            ref={setDialog}
            onClose={() => {
                props.onClose();
            }}
        >
            <Show
                when={props.account.billing && props.account.limits.live === 0}
                fallback={<AllUsed count={props.account.limits.pages} onClose={close} />}
            >
                <NeedsPlan onClose={close} />
            </Show>
        </dialog>
    );
}
