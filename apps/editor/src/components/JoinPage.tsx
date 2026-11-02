import type { InviteResponse } from "@tondo/contract";
import { withTeamLook } from "@tondo/page";
import type { Page } from "@tondo/page";
import { renderDocument } from "@tondo/render";
import { createEffect, createResource, createSignal, For, Show, untrack } from "solid-js";
import { appPath } from "../lib/account";
import type { LoadedAccount } from "../lib/account";
import { loadDraft } from "../lib/api";
import { longDate } from "../lib/plan-copy";
import { joinTeam, loadInvite, takeOverTeam } from "../lib/team-api";
import { Phone } from "./Phone";

const MADE = "made";

function Ended() {
    return (
        <div class="join-card" data-invite-ended>
            <h1>This invitation has ended</h1>
            <p>Ask the team's owner for a new link. Any page you have stays as it is.</p>
            <a class="b" href={appPath("/")}>
                Go to Home
            </a>
        </div>
    );
}

function TakeOver(props: { token: string; invite: InviteResponse }) {
    const [problem, setProblem] = createSignal("");
    const accept = async () => {
        const failed = await takeOverTeam(props.token);
        if (failed) setProblem(failed);
        else location.assign(appPath("/team"));
    };
    return (
        <div class="join-card" data-takeover>
            <h1>Take over {props.invite.name}</h1>
            <p>
                You'd own the team, and manage its people, look and plan. Your plan is what keeps
                the team's pages online, so you'll need Pro. The current owner stays on the team if
                they have a page on it.
            </p>
            <Show when={problem()}>
                <p class="bad-note" role="alert">
                    {problem()}
                </p>
            </Show>
            <div class="acts">
                <button
                    class="b p"
                    data-takeover-yes
                    onClick={() => {
                        accept().catch(() => undefined);
                    }}
                >
                    Take over {props.invite.name}
                </button>
                <a class="b" href={appPath("/")}>
                    Not now
                </a>
            </div>
        </div>
    );
}

function Join(props: { token: string; invite: InviteResponse; account: LoadedAccount }) {
    const own = () => props.account.pages.filter((page) => page.side === "own");
    const onTeam = () => props.account.team;
    const [chosen, setChosen] = createSignal(
        untrack(() => (props.invite.made ? MADE : (own()[0]?.id ?? ""))),
    );
    const [problem, setProblem] = createSignal("");
    const [busy, setBusy] = createSignal(false);
    const [doc, setDoc] = createSignal<Page | null>(null);
    createEffect(() => {
        const id = chosen();
        if (!id || id === MADE) {
            setDoc(null);
            return;
        }
        loadDraft(id)
            .then((draft) => setDoc(draft.page))
            .catch(() => setDoc(null));
    });
    const accept = async () => {
        setProblem("");
        setBusy(true);
        const failed = await joinTeam(props.token, chosen());
        setBusy(false);
        if (failed) setProblem(failed);
        else location.assign(appPath("/team"));
    };
    const preview = () => {
        const page = doc();
        return page
            ? renderDocument(withTeamLook(page, props.invite.look), {
                  title: "Preview",
                  assetBase: "/photos/",
                  editable: false,
                  live: true,
              })
            : null;
    };
    const blocked = () => !props.invite.covered || props.invite.full;
    return (
        <div class="join">
            <div class="join-card" data-join>
                <h1>Join {props.invite.name}</h1>
                <p>
                    {props.invite.name} is at tondo.page/{props.invite.handle}. This invitation
                    works until {longDate(props.invite.until)}.
                </p>
                <Show
                    when={!onTeam()}
                    fallback={
                        <>
                            <p class="notice" role="status" data-on-team>
                                You're already on {onTeam()?.name}. Leave it first to join this one.
                            </p>
                            <a class="b" href={appPath("/team")}>
                                Go to your team
                            </a>
                        </>
                    }
                >
                    <Show when={!props.invite.covered}>
                        <p class="notice" role="status">
                            This team's plan doesn't cover new people right now. Ask the owner.
                        </p>
                    </Show>
                    <Show when={props.invite.covered && props.invite.full}>
                        <p class="notice" role="status" data-team-full>
                            This team is using all its pages. Ask the owner to add more.
                        </p>
                    </Show>
                    <Show
                        when={props.invite.made !== null || own().length > 0}
                        fallback={
                            <>
                                <p>Start by making your page. You'll come back here to join.</p>
                                <a
                                    class="b p"
                                    data-make-first
                                    href={appPath(`/start?invite=${props.token}`)}
                                >
                                    Make your page
                                </a>
                            </>
                        }
                    >
                        <fieldset class="join-pages">
                            <legend>Which page joins</legend>
                            <Show when={props.invite.made}>
                                {(made) => (
                                    <label>
                                        <input
                                            type="radio"
                                            name="join-page"
                                            value={MADE}
                                            checked={chosen() === MADE}
                                            onChange={() => setChosen(MADE)}
                                        />
                                        <span>
                                            <b>{made().name || made().handle}, made for you</b>
                                            <small>tondo.page/{made().handle}</small>
                                        </span>
                                    </label>
                                )}
                            </Show>
                            <For each={own()}>
                                {(page) => (
                                    <label>
                                        <input
                                            type="radio"
                                            name="join-page"
                                            value={page.id}
                                            checked={chosen() === page.id}
                                            onChange={() => setChosen(page.id)}
                                        />
                                        <span>
                                            <b>{page.name || page.handle}</b>
                                            <small>tondo.page/{page.handle}</small>
                                        </span>
                                    </label>
                                )}
                            </For>
                        </fieldset>
                        <p class="note">
                            This page will use {props.invite.name}'s look straight away. Your words,
                            photos and links stay yours, and your own look comes back if you leave.
                            The team's owner and editors can edit this page and see its views and
                            clicks. Your other pages stay separate.
                        </p>
                        <Show when={problem()}>
                            <p class="bad-note" role="alert">
                                {problem()}
                            </p>
                        </Show>
                        <div class="acts">
                            <button
                                class="b p"
                                data-join-yes
                                disabled={busy() || !chosen() || blocked()}
                                onClick={() => {
                                    accept().catch(() => {
                                        setBusy(false);
                                    });
                                }}
                            >
                                {busy() ? "Joining" : `Join ${props.invite.name}`}
                            </button>
                            <a class="b" href={appPath("/")}>
                                Not now
                            </a>
                        </div>
                    </Show>
                </Show>
            </div>
            <Show when={preview()}>
                {(html) => (
                    <div class="join-phone">
                        <Phone>
                            <iframe title="Your page in the team's look" srcdoc={html()} />
                        </Phone>
                    </div>
                )}
            </Show>
        </div>
    );
}

/** Where an invitation link lands. It's outside the dashboard, as someone may have no pages yet. */
export function JoinPage(props: { account: LoadedAccount }) {
    const token = new URLSearchParams(location.search).get("invite") ?? "";
    const [invite] = createResource(() => loadInvite(token));
    return (
        <main class="join-wrap">
            <Show
                when={!invite.loading}
                fallback={<p class="emptyline">Loading your invitation</p>}
            >
                <Show when={invite()} fallback={<Ended />}>
                    {(open) =>
                        open().kind === "takeover" ? (
                            <TakeOver token={token} invite={open()} />
                        ) : (
                            <Join token={token} invite={open()} account={props.account} />
                        )
                    }
                </Show>
            </Show>
        </main>
    );
}
