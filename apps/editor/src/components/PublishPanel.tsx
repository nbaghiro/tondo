import type { PublishIssue } from "@tondo/page";
import { For, Show } from "solid-js";

export type PublishView =
    | { state: "issues"; issues: PublishIssue[] }
    | { state: "warnings"; warnings: PublishIssue[] }
    | { state: "live"; url: string; stats: { views: number; clicks: number } | null }
    | { state: "failed"; message: string };

function IssueList(props: { issues: PublishIssue[]; onOpen: (target: string) => void }) {
    return (
        <ul class="pub-issues">
            <For each={props.issues}>
                {(issue) => (
                    <li>
                        <button
                            type="button"
                            onClick={() => {
                                props.onOpen(issue.target);
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
    onOpen: (target: string) => void;
    onPublishAnyway: () => void;
}) {
    return (
        <div class="pub" aria-label="Publish">
            <Show when={props.view.state === "issues" && props.view}>
                {(view) => (
                    <>
                        <p>Fix these and your page is ready to go live.</p>
                        <IssueList issues={view().issues} onOpen={props.onOpen} />
                    </>
                )}
            </Show>
            <Show when={props.view.state === "warnings" && props.view}>
                {(view) => (
                    <>
                        <p>
                            Some sections still show a painting where your photo could go. You can
                            publish now and come back.
                        </p>
                        <IssueList issues={view().warnings} onOpen={props.onOpen} />
                        <button
                            type="button"
                            class="go"
                            onClick={() => {
                                props.onPublishAnyway();
                            }}
                        >
                            Publish anyway
                        </button>
                    </>
                )}
            </Show>
            <Show when={props.view.state === "live" && props.view}>
                {(view) => (
                    <>
                        <p>
                            <a class="pub-link" href={view().url} target="_blank" rel="noreferrer">
                                Open your page
                            </a>
                        </p>
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
        </div>
    );
}

export const publishTitle = (view: PublishView): string =>
    view.state === "live"
        ? "Your page is live"
        : view.state === "failed"
          ? "That didn't publish"
          : view.state === "warnings"
            ? "Nearly there"
            : "A few things first";
