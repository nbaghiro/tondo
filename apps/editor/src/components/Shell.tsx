import { paint } from "@tondo/render";
import { createEffect, createSignal, For, Show, untrack } from "solid-js";
import { groupsInOrder, NAV } from "../app/nav";
import type { NavItem } from "../app/nav";
import { follow, path } from "../app/router";
import { appPath, chosenPage, onPage, SITE_URL } from "../lib/account";
import type { Account } from "../lib/account";
import type { PageSummary } from "@tondo/contract";
import { AccountPage } from "./AccountPage";
import { AnalyticsPage } from "./AnalyticsPage";
import { HomePage } from "./HomePage";
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
        const found = chosenPage(account().pages);
        if (!found) throw new Error("The page couldn't be loaded.");
        return found;
    };
    const pageId = () => chosen().id;
    const page = () => {
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
                    />
                );
            case "/account":
                return <AccountPage account={account()} />;
            case "/":
                return <HomePage page={chosen()} />;
            default:
                return <NotFoundPage />;
        }
    };
    return (
        <div class="app">
            <aside class="side">
                <div class="side-top">
                    <Logo />
                    <a class="edit" href={appPath(onPage("/edit", pageId()))}>
                        <NavIcon name="edit" />
                        Edit page
                    </a>
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
                    <span class="bar-address">tondo.page/{chosen().handle}</span>
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
