import { routes } from "@tondo/contract";
import type { DraftResponse, StatsResponse } from "@tondo/contract";
import { publishIssues, publishWarnings, setupChecklist } from "@tondo/page";
import type { ChecklistItem } from "@tondo/page";
import { renderDocument } from "@tondo/render";
import { createResource, createSignal, For, Show } from "solid-js";
import { appPath, pageUrl } from "../lib/account";
import type { Account } from "../lib/account";
import { loadStats, publish } from "../lib/api";
import { Card, createToast, EmptyLine, NavIcon, PageHeader } from "./Parts";

async function loadHome(): Promise<{ draft: DraftResponse; stats: StatsResponse | null }> {
    const res = await fetch(routes.draft);
    if (!res.ok) throw new Error("The page couldn't be loaded.");
    return { draft: (await res.json()) as DraftResponse, stats: await loadStats(30) };
}

function checklistLink(item: ChecklistItem): string {
    const asked = new URLSearchParams();
    if (item.panel) asked.set("panel", item.panel);
    if (item.section) asked.set("section", item.section);
    if (item.item) asked.set("item", item.item);
    const query = asked.toString();
    return appPath(`/edit${query ? `?${query}` : ""}`);
}

function Checklist(props: { items: ChecklistItem[] }) {
    const left = () => props.items.filter((item) => !item.done);
    const next = () => left()[0]?.id;
    return (
        <Show
            when={left().length}
            fallback={
                <Card title="Your page is all set">
                    <EmptyLine>
                        Everything's in place. Share your link and see how it does.
                    </EmptyLine>
                </Card>
            }
        >
            <Card
                title="Finish your page"
                note={`${String(props.items.length - left().length)} of ${String(props.items.length)} done`}
            >
                <ul class="check">
                    <For each={props.items}>
                        {(item) => (
                            <li classList={{ done: item.done, next: next() === item.id }}>
                                <a href={checklistLink(item)} data-check={item.id}>
                                    <span class="tick">
                                        <Show when={item.done}>
                                            <NavIcon name="check" />
                                        </Show>
                                    </span>
                                    <span>
                                        <b>{item.label}</b>
                                        <small>{item.hint}</small>
                                    </span>
                                    <span class="go">
                                        <NavIcon name="go" />
                                    </span>
                                </a>
                            </li>
                        )}
                    </For>
                </ul>
            </Card>
        </Show>
    );
}

function Numbers(props: { stats: StatsResponse | null }) {
    return (
        <Card
            title="Last 30 days"
            extra={
                <a class="lnk" href={appPath("/analytics")}>
                    See more
                </a>
            }
        >
            <Show
                when={props.stats && props.stats.views + props.stats.clicks > 0}
                fallback={
                    <EmptyLine>
                        No visits yet. Your numbers will show up here once people open your link.
                    </EmptyLine>
                }
            >
                <div class="tiles">
                    <div class="tile">
                        <span>Views</span>
                        <b class="num" data-views>
                            {props.stats?.views}
                        </b>
                    </div>
                    <div class="tile">
                        <span>Link clicks</span>
                        <b class="num">{props.stats?.clicks}</b>
                    </div>
                </div>
            </Show>
        </Card>
    );
}

export function HomePage(props: { account: Account }) {
    const [data, { refetch }] = createResource(loadHome);
    const [busy, setBusy] = createSignal(false);
    const toast = createToast();
    const address = () => `tondo.page/${props.account.handle}`;
    const fullLink = () => `https://${address()}`;

    const copy = () => {
        navigator.clipboard
            .writeText(fullLink())
            .then(() => {
                toast.say("Link copied");
            })
            .catch(() => {
                toast.say("Your link is " + fullLink());
            });
    };
    const share = () => {
        if ("share" in navigator) {
            navigator.share({ url: fullLink() }).catch(() => undefined);
        } else {
            copy();
        }
    };
    const goLive = async (updatedAt: string) => {
        const page = data()?.draft.page;
        // Anything worth a second look is shown in the builder, where it can be fixed.
        if (page && (publishIssues(page).length || publishWarnings(page).length)) {
            location.assign(appPath("/edit?panel=publish"));
            return;
        }
        setBusy(true);
        const result = await publish(updatedAt);
        setBusy(false);
        if (result.state === "published") {
            toast.say("Your page is live");
            await refetch();
        } else if (result.state === "issues") {
            location.assign(appPath("/edit?panel=publish"));
        } else {
            toast.say(result.message);
        }
    };
    const preview = (draft: DraftResponse) =>
        renderDocument(draft.page, {
            title: "Preview",
            assetBase: "/photos/",
            editable: false,
            live: true,
        }).replace("<head>", '<head><base target="_blank">');

    return (
        <>
            <Show
                when={data()}
                fallback={
                    <Show
                        when={Boolean(data.error)}
                        fallback={<p class="emptyline">Loading your page</p>}
                    >
                        <p class="emptyline">
                            We couldn't load your page. Check your connection and reload.
                        </p>
                    </Show>
                }
            >
                {(loaded) => {
                    const draft = () => loaded().draft;
                    const status = () =>
                        !draft().published
                            ? { tone: "", label: "Not live yet", line: "Only you can see it." }
                            : draft().changed
                              ? {
                                    tone: "warn",
                                    label: "Live, with unpublished changes",
                                    line: "Visitors see the last version you published.",
                                }
                              : {
                                    tone: "ok",
                                    label: "Live",
                                    line: "Anyone with your link can see it.",
                                };
                    return (
                        <>
                            <PageHeader
                                title={`Hello, ${draft().page.header.name}`}
                                lead={status().line}
                            >
                                <Show when={draft().published && draft().changed}>
                                    <button
                                        class="b pub"
                                        disabled={busy()}
                                        onClick={() => {
                                            goLive(draft().updatedAt).catch(() => {
                                                setBusy(false);
                                            });
                                        }}
                                    >
                                        {busy() ? "Publishing" : "Publish"}
                                    </button>
                                </Show>
                                <a class="b p home-edit" href={appPath("/edit")}>
                                    Edit page
                                </a>
                            </PageHeader>
                            <div class="home">
                                <div class="stack">
                                    <Card>
                                        <div class="status">
                                            <span class={`tag ${status().tone}`}>
                                                <i />
                                                {status().label}
                                            </span>
                                            <a
                                                class="addr"
                                                href={pageUrl(props.account.handle)}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {address()}
                                            </a>
                                            <span class="sp" />
                                            <button
                                                class="ib"
                                                aria-label="Copy link"
                                                onClick={copy}
                                            >
                                                <NavIcon name="copy" />
                                            </button>
                                            <a
                                                class="ib"
                                                aria-label="Open your page"
                                                href={pageUrl(props.account.handle)}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <NavIcon name="open" />
                                            </a>
                                            <button class="b sm" onClick={share}>
                                                Share
                                            </button>
                                        </div>
                                    </Card>
                                    <Checklist
                                        items={setupChecklist(draft().page, {
                                            published: draft().published,
                                        })}
                                    />
                                    <Show when={draft().published}>
                                        <Numbers stats={loaded().stats} />
                                    </Show>
                                </div>
                                <aside class="pv">
                                    <Card title="Your page">
                                        <div class="pv-in">
                                            <div class="dev">
                                                <iframe
                                                    title="Your page"
                                                    sandbox="allow-popups"
                                                    srcdoc={preview(draft())}
                                                />
                                            </div>
                                        </div>
                                    </Card>
                                </aside>
                            </div>
                        </>
                    );
                }}
            </Show>
            <toast.View />
        </>
    );
}
