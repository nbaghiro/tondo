import type { PublishIssue } from "@tondo/page";
import { createSignal, For, Show } from "solid-js";
import { appPath } from "../lib/account";

export type PublishView =
    | { state: "issues"; issues: PublishIssue[] }
    | { state: "warnings"; warnings: PublishIssue[] }
    | {
          state: "live";
          url: string;
          handle: string;
          stats: { views: number; clicks: number } | null;
      }
    | { state: "failed"; message: string };

function IssueList(props: { issues: PublishIssue[]; onOpen: (issue: PublishIssue) => void }) {
    return (
        <ul class="pub-issues">
            <For each={props.issues}>
                {(issue) => (
                    <li>
                        <button
                            type="button"
                            onClick={() => {
                                props.onOpen(issue);
                            }}
                        >
                            {issue.message}
                        </button>
                    </li>
                )}
            </For>
        </ul>
    );
}

export function PublishPanel(props: {
    view: PublishView;
    onOpen: (issue: PublishIssue) => void;
    onPublishAnyway: () => void;
    /** Only offered when there's a live copy to go back to. */
    onDiscard?: (() => void) | undefined;
}) {
    const [copied, setCopied] = createSignal(false);
    const [confirming, setConfirming] = createSignal(false);
    return (
        <div class="pub" aria-label="Publish">
            <Show when={props.view.state === "issues" && props.view}>
                {(view) => (
                    <>
                        <p>Fix these and your page can go live. Tap one to go to it.</p>
                        <IssueList issues={view().issues} onOpen={props.onOpen} />
                    </>
                )}
            </Show>
            <Show when={props.view.state === "warnings" && props.view}>
                {(view) => (
                    <>
                        <Show
                            when={view().warnings.length}
                            fallback={<p>Everything's ready to go live.</p>}
                        >
                            <p>
                                Your page can go live now. These won't stop it, and you can come
                                back to them.
                            </p>
                        </Show>
                        <IssueList issues={view().warnings} onOpen={props.onOpen} />
                        <button
                            type="button"
                            class="go"
                            onClick={() => {
                                props.onPublishAnyway();
                            }}
                        >
                            {view().warnings.length ? "Publish without these" : "Publish"}
                        </button>
                    </>
                )}
            </Show>
            <Show when={props.view.state === "live" && props.view}>
                {(view) => (
                    <>
                        <p class="pub-address">
                            <a href={view().url} target="_blank" rel="noreferrer">
                                tondo.page/<b>{view().handle}</b>
                            </a>
                        </p>
                        <div class="pub-actions">
                            <button
                                type="button"
                                class="go"
                                onClick={() => {
                                    navigator.clipboard
                                        .writeText(`https://tondo.page/${view().handle}`)
                                        .then(() => setCopied(true))
                                        .catch(() => undefined);
                                }}
                            >
                                {copied() ? "Copied" : "Copy link"}
                            </button>
                            <a class="pub-open" href={view().url} target="_blank" rel="noreferrer">
                                Open your page
                            </a>
                            <a class="pub-open" href={appPath("/")}>
                                Back to Home
                            </a>
                        </div>
                        <Show when={view().stats}>
                            {(stats) => (
                                <p class="pub-stats">
                                    In the last 30 days: {stats().views} views and {stats().clicks}{" "}
                                    link clicks.
                                </p>
                            )}
                        </Show>
                    </>
                )}
            </Show>
            <Show when={props.view.state === "failed" && props.view}>
                {(view) => <p>{view().message}</p>}
            </Show>
            <Show when={props.view.state !== "live" && props.onDiscard}>
                {(discard) => (
                    <Show
                        when={confirming()}
                        fallback={
                            <button
                                type="button"
                                class="pub-open discard"
                                onClick={() => setConfirming(true)}
                            >
                                Discard changes, back to live
                            </button>
                        }
                    >
                        <p>
                            Your changes will be replaced by what's live now. Undo brings them back.
                        </p>
                        <div class="pub-actions">
                            <button
                                type="button"
                                class="go discard-yes"
                                onClick={() => {
                                    setConfirming(false);
                                    discard()();
                                }}
                            >
                                Yes, discard my changes
                            </button>
                            <button
                                type="button"
                                class="pub-open"
                                onClick={() => setConfirming(false)}
                            >
                                Keep my changes
                            </button>
                        </div>
                    </Show>
                )}
            </Show>
        </div>
    );
}

export const publishTitle = (view: PublishView): string =>
    view.state === "live"
        ? "Your page is live"
        : view.state === "failed"
          ? "That didn't publish"
          : view.state === "warnings"
            ? "Ready to publish"
            : "A few things first";
