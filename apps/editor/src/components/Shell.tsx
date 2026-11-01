import { paint } from "@tondo/render";
import { createEffect, createSignal, For, Show, untrack } from "solid-js";
import { groupsInOrder, NAV } from "../app/nav";
import type { NavItem } from "../app/nav";
import { follow, path } from "../app/router";
import { appPath, SITE_URL } from "../lib/account";
import type { Account } from "../lib/account";
import { AccountPage } from "./AccountPage";
import { AnalyticsPage } from "./AnalyticsPage";
import { HomePage } from "./HomePage";
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

function NavLink(props: { item: NavItem; onGo?: () => void }) {
    const to = () => props.item.path ?? "/";
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
                href={appPath(to())}
                aria-current={path() === to() ? "page" : undefined}
                onClick={(e) => {
                    follow(e, to());
                    props.onGo?.();
                }}
            >
                <NavIcon name={props.item.icon} />
                {props.item.label}
            </a>
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
    const page = () => {
        switch (path()) {
            case "/analytics":
                return <AnalyticsPage />;
            case "/settings":
                return (
                    <SettingsPage
                        account={account()}
                        onAddress={(handle) => {
                            setAccount({ ...account(), handle });
                        }}
                    />
                );
            case "/account":
                return <AccountPage account={account()} />;
            case "/":
                return <HomePage account={account()} />;
            default:
                return <NotFoundPage />;
        }
    };
    return (
        <div class="app">
            <aside class="side">
                <div class="side-top">
                    <Logo />
                    <a class="edit" href={appPath("/edit")}>
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
                                <For each={group.items}>{(item) => <NavLink item={item} />}</For>
                            </>
                        )}
                    </For>
                </nav>
                <div class="side-foot">
                    <For each={bottom}>{(item) => <NavLink item={item} />}</For>
                </div>
            </aside>
            <div class="main">
                <header class="bar">
                    <Logo />
                    <span class="bar-address">tondo.page/{account().handle}</span>
                </header>
                <main class="wrap">{page()}</main>
            </div>
            <nav class="bottom" aria-label="Main">
                <a
                    href={appPath("/")}
                    aria-current={path() === "/" ? "page" : undefined}
                    onClick={(e) => {
                        follow(e, "/");
                    }}
                >
                    <NavIcon name="home" />
                    Home
                </a>
                <a class="ed" href={appPath("/edit")}>
                    <NavIcon name="edit" />
                    Edit page
                </a>
                <a
                    href={appPath("/analytics")}
                    aria-current={path() === "/analytics" ? "page" : undefined}
                    onClick={(e) => {
                        follow(e, "/analytics");
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
                    <For each={inMore}>
                        {(item) => <NavLink item={item} onGo={() => setMore(false)} />}
                    </For>
                </div>
            </Show>
        </div>
    );
}
