import type { PageSummary } from "@tondo/contract";
import {
    canAddPage,
    isReservedHandle,
    isValidHandle,
    lookNames,
    normaliseHandle,
    PLANS,
} from "@tondo/page";
import type { LookName, PaidPlan, Period } from "@tondo/page";
import { looks } from "@tondo/render";
import { createSignal, For, onCleanup, onMount, Show, untrack } from "solid-js";
import { appPath, onPage } from "../lib/account";
import type { Account } from "../lib/account";
import { checkAddress, createPage, startCheckout } from "../lib/api";
import { PlanChoice } from "./PlanChoice";

const CHECK_MS = 300;
const INVALID = "Use 1 to 30 lowercase letters, numbers or hyphens.";

const suggestAddress = (name: string) =>
    name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 30)
        .replace(/-+$/, "");

function NewPageForm(props: {
    pages: readonly PageSummary[];
    from: PageSummary | null;
    onClose: () => void;
}) {
    const [name, setName] = createSignal(untrack(() => props.from?.name ?? ""));
    const [handle, setHandle] = createSignal("");
    const [typed, setTyped] = createSignal(false);
    const [note, setNote] = createSignal<{ ok: boolean; text: string } | null>(null);
    const [problem, setProblem] = createSignal("");
    const [busy, setBusy] = createSignal(false);
    const [start, setStart] = createSignal<"look" | "copy">(
        untrack(() => (props.from ? "copy" : "look")),
    );
    const [look, setLook] = createSignal<LookName>("madder");
    const [source, setSource] = createSignal(untrack(() => props.from?.id ?? props.pages[0]?.id));
    let timer: ReturnType<typeof setTimeout> | undefined;
    onCleanup(() => {
        clearTimeout(timer);
    });
    const check = (raw: string) => {
        clearTimeout(timer);
        setNote(null);
        const value = normaliseHandle(raw);
        if (!value) return;
        if (!isValidHandle(value)) {
            setNote({ ok: false, text: INVALID });
            return;
        }
        if (isReservedHandle(value)) {
            setNote({ ok: false, text: "That address is taken. Try another one." });
            return;
        }
        timer = setTimeout(() => {
            checkAddress(value)
                .then((answer) => {
                    if (answer && normaliseHandle(handle()) === value) {
                        setNote({ ok: answer.available, text: answer.message });
                    }
                })
                .catch(() => undefined);
        }, CHECK_MS);
    };
    const submit = async (e: Event) => {
        e.preventDefault();
        setBusy(true);
        setProblem("");
        const made = await createPage({
            name: name().trim(),
            handle: normaliseHandle(handle()),
            ...(start() === "copy" ? { from: source() ?? "" } : { look: look() }),
        });
        setBusy(false);
        if ("error" in made) setProblem(made.error);
        else location.assign(appPath(onPage("/edit", made.id)));
    };
    return (
        <form
            onSubmit={(e) => {
                submit(e).catch(() => {
                    setBusy(false);
                });
            }}
        >
            <h2>New page</h2>
            <p>It gets its own address, look and numbers. Nothing public connects your pages.</p>
            <label class="f">
                Name
                <input
                    name="page-name"
                    maxLength={80}
                    required
                    autocomplete="off"
                    value={name()}
                    onInput={(e) => {
                        setName(e.currentTarget.value);
                        if (!typed()) {
                            const next = suggestAddress(e.currentTarget.value);
                            setHandle(next);
                            check(next);
                        }
                    }}
                />
            </label>
            <label class="f">
                Address
                <span class="pre">
                    tondo.page/
                    <input
                        name="page-address"
                        required
                        autocomplete="off"
                        autocapitalize="off"
                        spellcheck={false}
                        value={handle()}
                        onInput={(e) => {
                            setTyped(true);
                            setHandle(e.currentTarget.value);
                            check(e.currentTarget.value);
                        }}
                    />
                </span>
            </label>
            <Show when={note()}>
                {(shown) => (
                    <p
                        class={shown().ok ? "good-note" : "bad-note"}
                        data-address-note
                        role={shown().ok ? "status" : "alert"}
                    >
                        {shown().text}
                    </p>
                )}
            </Show>
            <fieldset class="page-start">
                <legend>Start from</legend>
                <label>
                    <input
                        type="radio"
                        name="page-start"
                        checked={start() === "look"}
                        onChange={() => setStart("look")}
                    />
                    A look
                </label>
                <label>
                    <input
                        type="radio"
                        name="page-start"
                        data-start-copy
                        checked={start() === "copy"}
                        onChange={() => setStart("copy")}
                    />
                    A copy of one of my pages
                </label>
            </fieldset>
            <Show
                when={start() === "copy"}
                fallback={
                    <label class="f">
                        Look
                        <select
                            name="page-look"
                            value={look()}
                            onChange={(e) => setLook(e.currentTarget.value as LookName)}
                        >
                            <For each={lookNames}>
                                {(item) => <option value={item}>{looks[item].label}</option>}
                            </For>
                        </select>
                    </label>
                }
            >
                <label class="f">
                    Page to copy
                    <select
                        name="page-source"
                        value={source()}
                        onChange={(e) => setSource(e.currentTarget.value)}
                    >
                        <For each={props.pages}>
                            {(page) => (
                                <option value={page.id}>
                                    {page.name || page.handle}, tondo.page/{page.handle}
                                </option>
                            )}
                        </For>
                    </select>
                </label>
            </Show>
            <Show when={problem()}>
                <p class="bad-note" role="alert">
                    {problem()}
                </p>
            </Show>
            <div class="acts">
                <button
                    class="b p"
                    type="submit"
                    data-create-page
                    disabled={busy() || !name().trim() || note()?.ok === false}
                >
                    {busy() ? "Adding" : "Add page"}
                </button>
                <button
                    class="b"
                    type="button"
                    onClick={() => {
                        props.onClose();
                    }}
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

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

/** Adds a page, or says why another one can't be added on this plan. */
export function NewPageModal(props: {
    account: Account;
    from: PageSummary | null;
    onClose: () => void;
}) {
    const [dialog, setDialog] = createSignal<HTMLDialogElement>();
    onMount(() => {
        dialog()?.showModal();
    });
    const close = () => {
        dialog()?.close();
    };
    const canAdd = () => canAddPage(props.account.limits, props.account.pages.length);
    return (
        <dialog
            class="page-modal"
            aria-label="New page"
            ref={setDialog}
            onClose={() => {
                props.onClose();
            }}
        >
            <Show
                when={canAdd()}
                fallback={
                    <Show
                        when={props.account.billing && props.account.limits.live === 0}
                        fallback={<AllUsed count={props.account.limits.pages} onClose={close} />}
                    >
                        <NeedsPlan onClose={close} />
                    </Show>
                }
            >
                <NewPageForm pages={props.account.pages} from={props.from} onClose={close} />
            </Show>
        </dialog>
    );
}
