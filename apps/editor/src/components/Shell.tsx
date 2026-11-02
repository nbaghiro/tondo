import { canAddPage } from "@tondo/page";
import { paint } from "@tondo/render";
import { createEffect, createMemo, createSignal, For, onMount, Show, untrack } from "solid-js";
import { groupsInOrder, NAV } from "../app/nav";
import type { NavItem } from "../app/nav";
import { askedPage, follow, navigate, path } from "../app/router";
import { appPath, chosenPage, newPagePath, onPage, ownPageCount, SITE_URL } from "../lib/account";
import type { Account } from "../lib/account";
import type { PageSummary } from "@tondo/contract";
import { AccountPage } from "./AccountPage";
import { AnalyticsPage } from "./AnalyticsPage";
import { loadPages } from "../lib/api";
import { HomePage } from "./HomePage";
import { PageLimitPrompt } from "./PageLimitPrompt";
import { PageSwitcher } from "./PageSwitcher";
import { planName } from "../lib/plan-copy";
import { plan } from "../state/plan";
import { NavIcon } from "./Parts";
import { SettingsPage } from "./SettingsPage";

const LOGO = paint(["#c8385f", "#e8876a", "#a42a55", "#f2b56b"], 9).replace('class="tondo"', "");

function Logo() {
    return (
        <a class="logo" href={SITE_URL || "/"}>
            <span
                ref={(el) => {
                    el.innerHTML = LOGO;
                }}
            />
            Tondo
        </a>
    );
}

function NavLink(props: { item: NavItem; pageId: string; onGo?: () => void }) {
    const to = () => props.item.path ?? "/";
    const inApp = () => onPage(to(), props.pageId);
    return (
        <Show
            when={props.item.path !== undefined}
            fallback={
                <a
                    href={`${SITE_URL}${props.item.external ?? ""}`}
                    target="_blank"
                    rel="noreferrer"
                >
                    <NavIcon name={props.item.icon} />
                    {props.item.label}
                </a>
            }
        >
            <a
                href={appPath(inApp())}
                aria-current={path() === to() ? "page" : undefined}
                onClick={(e) => {
                    follow(e, inApp());
                    props.onGo?.();
                }}
            >
                <NavIcon name={props.item.icon} />
                {props.item.label}
            </a>
        </Show>
    );
}

function PlanLine() {
    return (
        <Show when={plan()?.billing && plan()}>
            {(current) => (
                <p class="plan-line" data-plan-line>
                    {planName(current())} plan
                </p>
            )}
        </Show>
    );
}

function NotFoundPage() {
    return (
        <div class="empty">
            <h2>There's nothing here</h2>
            <p>This address isn't part of Tondo, or it has moved.</p>
            <a
                class="b"
                href={appPath("/")}
                onClick={(e) => {
                    follow(e, "/");
                }}
            >
                Go to Home
            </a>
        </div>
    );
}

export function Shell(props: { account: Account }) {
    const [more, setMore] = createSignal(false);
    // Changing the address has to reach every page at once, so it's held here.
    const [account, setAccount] = createSignal(untrack(() => props.account));
    createEffect(() => {
        const here = NAV.find((item) => item.path === path());
        document.title = `${here?.label ?? "Not found"} | Tondo`;
    });
    const groups = groupsInOrder(NAV);
    const bottom = NAV.filter((item) => item.group === "bottom");
    const inMore = NAV.filter((item) => item.id !== "home" && item.id !== "analytics");
    const chosen = (): PageSummary => {
        const found = chosenPage(account().pages, askedPage());
        if (!found) throw new Error("The page couldn't be loaded.");
        return found;
    };
    // Only the id, so a fresh list of pages doesn't start the current screen again.
    const pageId = createMemo(() => chosen().id);
    const [atLimit, setAtLimit] = createSignal(false);
    const canAdd = () => canAddPage(account().limits, ownPageCount(account().pages));
    // The builder and the start flow send people here to see the limit prompt.
    onMount(() => {
        const asked = new URLSearchParams(location.search);
        if (!asked.get("limit")) return;
        asked.delete("limit");
        history.replaceState(null, "", `${location.pathname}?${asked.toString()}`);
        setAtLimit(!canAdd());
    });
    const refreshPages = async () => {
        const pages = await loadPages();
        if (pages) setAccount({ ...account(), pages });
    };
    const pickPage = (next: PageSummary) => {
        navigate(onPage(path(), next.id));
    };
    const switcher = () => (
        <PageSwitcher
            pages={account().pages}
            current={chosen()}
            limits={account().limits}
            onOpen={() => {
                refreshPages().catch(() => undefined);
            }}
            onPick={pickPage}
            onNew={() => {
                if (canAdd()) location.assign(appPath(newPagePath(pageId(), path())));
                else setAtLimit(true);
            }}
        />
    );
    // Reads the chosen page, so choosing another starts each screen again with its own data.
    const page = () => {
        pageId();
        switch (path()) {
            case "/analytics":
                return <AnalyticsPage pageId={pageId()} />;
            case "/settings":
                return (
                    <SettingsPage
                        page={chosen()}
                        onAddress={(handle) => {
                            setAccount({
                                ...account(),
                                pages: account().pages.map((other) =>
                                    other.id === pageId() ? { ...other, handle } : other,
                                ),
                            });
                        }}
                        canDelete={account().pages.length > 1}
                        canAddPage={canAdd()}
                        onPageLimit={() => setAtLimit(true)}
                        onDeleted={() => {
                            const left = account().pages.filter((other) => other.id !== pageId());
                            setAccount({ ...account(), pages: left });
                            navigate("/settings");
                        }}
                    />
                );
            case "/account":
                return <AccountPage account={account()} />;
            case "/":
                return <HomePage page={chosen()} name={account().name} />;
            default:
                return <NotFoundPage />;
        }
    };
    return (
        <div class="app">
            <aside class="side">
                <div class="side-top">
                    <Logo />
                    {switcher()}
                </div>
                <nav class="nav" aria-label="Main">
                    <For each={groups}>
                        {(group) => (
                            <>
                                <Show when={group.name}>
                                    <h3>{group.name}</h3>
                                </Show>
                                <For each={group.items}>
                                    {(item) => <NavLink item={item} pageId={pageId()} />}
                                </For>
                            </>
                        )}
                    </For>
                </nav>
                <div class="side-foot">
                    <PlanLine />
                    <For each={bottom}>{(item) => <NavLink item={item} pageId={pageId()} />}</For>
                </div>
            </aside>
            <div class="main">
                <header class="bar">
                    <Logo />
                    {switcher()}
                </header>
                <main class="wrap">{page()}</main>
            </div>
            <nav class="bottom" aria-label="Main">
                <a
                    href={appPath(onPage("/", pageId()))}
                    aria-current={path() === "/" ? "page" : undefined}
                    onClick={(e) => {
                        follow(e, onPage("/", pageId()));
                    }}
                >
                    <NavIcon name="home" />
                    Home
                </a>
                <a class="ed" href={appPath(onPage("/edit", pageId()))}>
                    <NavIcon name="edit" />
                    Edit page
                </a>
                <a
                    href={appPath(onPage("/analytics", pageId()))}
                    aria-current={path() === "/analytics" ? "page" : undefined}
                    onClick={(e) => {
                        follow(e, onPage("/analytics", pageId()));
                    }}
                >
                    <NavIcon name="chart" />
                    Analytics
                </a>
                <button
                    type="button"
                    aria-expanded={more()}
                    onClick={() => {
                        setMore(!more());
                    }}
                >
                    <NavIcon name="more" />
                    More
                </button>
            </nav>
            <Show when={atLimit()}>
                <PageLimitPrompt account={account()} onClose={() => setAtLimit(false)} />
            </Show>
            <Show when={more()}>
                <div
                    class="scrim"
                    onClick={() => {
                        setMore(false);
                    }}
                />
                <div class="sheet" role="dialog" aria-label="More">
                    <PlanLine />
                    <For each={inMore}>
                        {(item) => (
                            <NavLink item={item} pageId={pageId()} onGo={() => setMore(false)} />
                        )}
                    </For>
                </div>
            </Show>
        </div>
    );
}
