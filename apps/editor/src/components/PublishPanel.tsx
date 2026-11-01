import type { PublishIssue } from "@tondo/page";
import { For, Show } from "solid-js";
import { Icon } from "./Icon";

export type PublishView =
    | { state: "issues"; issues: PublishIssue[] }
    | { state: "live"; url: string; stats: { views: number; clicks: number } | null }
    | { state: "failed"; message: string };

export function PublishPanel(props: {
    view: PublishView;
    onClose: () => void;
    onOpen: (target: string) => void;
}) {
    return (
        <div class="pub" role="dialog" aria-label="Publish">
            <button
                class="icon-b pub-close"
                aria-label="Close"
                onClick={() => {
                    props.onClose();
                }}
            >
                <Icon name="close" />
            </button>
            <Show when={props.view.state === "issues" && props.view}>
                {(view) => (
                    <>
                        <h2>A few things first</h2>
                        <p>Fix these and your page is ready to go live.</p>
                        <ul class="pub-issues">
                            <For each={view().issues}>
                                {(issue) => (
                                    <li>
                                        <button
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
                    </>
                )}
            </Show>
            <Show when={props.view.state === "live" && props.view}>
                {(view) => (
                    <>
                        <h2>Your page is live</h2>
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
                {(view) => (
                    <>
                        <h2>That didn't publish</h2>
                        <p>{view().message}</p>
                    </>
                )}
            </Show>
        </div>
    );
}
