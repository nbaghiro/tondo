import { findSection, pageHash, publishIssues, publishWarnings } from "@tondo/page";
import type { PublishIssue } from "@tondo/page";
import type { DraftResponse } from "@tondo/contract";
import { looks, paint, paintFor, themeOf } from "@tondo/render";
import { createEffect, createSignal, onCleanup, onMount, Show, untrack } from "solid-js";
import type { JSX } from "solid-js";
import { loadDraft, loadPublishChecks, loadStats, publish } from "../lib/api";
import { pageUrl, toLogin } from "../lib/account";
import type { Account } from "../lib/account";
import { downloadPage, dropBackup, loadStaleBackup } from "../state/storage";
import type { Backup } from "../state/storage";
import { createEditor, HEADER } from "../state/document";
import { Canvas } from "./Canvas";
import { LookTiles, MakeItYours } from "./LookPanel";
import { AddList, Glyph, PagePanel } from "./Panels";
import { Preview } from "./Preview";
import { revealAsked, setAskedItem } from "./Fields";
import { PublishPanel, publishTitle } from "./PublishPanel";
import type { PublishView } from "./PublishPanel";
import { HeaderPanel, SectionPanel } from "./SectionPanel";
import { TopBar } from "./TopBar";

type Left = "page" | "add";
type Right = "look" | "publish" | null;
type Sheet = "page" | "add" | "look" | "section" | "publish" | null;

/** How far the sheet's grip has to move to count as a drag and not a tap. */
const GRIP_DRAG = 24;
const NOTICE_MS = 3200;

function Panel(props: {
    title: string;
    class: string;
    open: boolean;
    tall: boolean;
    onBack?: (() => void) | undefined;
    onClose?: (() => void) | undefined;
    extra?: JSX.Element;
    onGrip: (e: PointerEvent) => void;
    onGripTap: () => void;
    children: JSX.Element;
}) {
    return (
        <aside class={`side ${props.class}`} classList={{ open: props.open, tall: props.tall }}>
            <button
                type="button"
                class="sheet-grip"
                aria-label={props.tall ? "Make the panel shorter" : "Make the panel taller"}
                onClick={() => {
                    props.onGripTap();
                }}
                onPointerDown={(e) => {
                    props.onGrip(e);
                }}
            />
            <div class="side-top">
                <Show when={props.onBack}>
                    <button
                        type="button"
                        class="back"
                        aria-label="Back"
                        onClick={() => props.onBack?.()}
                    >
                        <Glyph name="back" />
                    </button>
                </Show>
                <h2>{props.title}</h2>
                {props.extra}
                <Show when={props.onClose}>
                    <button
                        type="button"
                        class="back close"
                        aria-label="Close"
                        onClick={() => props.onClose?.()}
                    >
                        <Glyph name="x" />
                    </button>
                </Show>
            </div>
            <div class="side-body">{props.children}</div>
        </aside>
    );
}

export function Editor(props: { account: Account; draft: DraftResponse }) {
    const editor = untrack(() =>
        createEditor({
            handle: props.account.handle,
            // Dates on the page follow this person's clock. It's saved with their next change.
            page: {
                ...props.draft.page,
                timeZone:
                    props.draft.page.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            updatedAt: props.draft.updatedAt,
            changed: props.draft.changed,
            onLoggedOut: toLogin,
        }),
    );
    const [publishing, setPublishing] = createSignal(false);
    const [serverIssues, setServerIssues] = createSignal<PublishIssue[]>([]);
    const [view, setView] = createSignal<PublishView | null>(null);
    const [frame, setFrame] = createSignal<HTMLIFrameElement>();
    const [left, setLeft] = createSignal<Left>("page");
    const [right, setRight] = createSignal<Right>(null);
    const [lookTab, setLookTab] = createSignal<"looks" | "mine">("looks");
    const [sheet, setSheet] = createSignal<Sheet>(null);
    const [tall, setTall] = createSignal(false);
    const [socialAsked, setSocialAsked] = createSignal(0);
    const [previewing, setPreviewing] = createSignal(false);
    const [dragOrder, setDragOrder] = createSignal<{ id: string; to: number } | null>(null);
    const [picking, setPicking] = createSignal<{ name: string; x: number; y: number } | null>(null);

    const showPublish = () => {
        editor.select(null);
        setRight("publish");
        setSheet("publish");
    };
    const runPublish = async () => {
        setPublishing(true);
        const failedSave = "Your latest changes aren't saved yet. Try again in a moment.";
        const saved = await editor.saver.flush();
        const result = saved
            ? await publish(editor.saver.updatedAt())
            : ({ state: "failed", message: editor.saver.message() || failedSave } as const);
        setPublishing(false);
        if (result.state === "published") {
            editor.markPublished();
            setView({
                state: "live",
                url: pageUrl(props.account.handle),
                handle: props.account.handle,
                stats: await loadStats(),
            });
        } else if (result.state === "issues") {
            // Everything the server refused stays listed until it's fixed.
            const known = publishIssues(editor.page()).map((issue) => issue.message);
            setServerIssues(result.issues.filter((issue) => !known.includes(issue.message)));
            setView(listView());
        } else {
            setView(result);
        }
        showPublish();
    };
    // Only the server knows some problems. A refused link clears once it's gone from the page.
    const stillApplies = (issue: PublishIssue) =>
        !issue.url ||
        JSON.stringify(editor.page()).includes(JSON.stringify(issue.url).slice(1, -1));
    const listView = (): PublishView => {
        const issues = [...serverIssues().filter(stillApplies), ...publishIssues(editor.page())];
        return issues.length
            ? { state: "issues", issues }
            : { state: "warnings", warnings: publishWarnings(editor.page()) };
    };
    const openPublishList = async () => {
        if (await editor.saver.flush()) setServerIssues(await loadPublishChecks());
        setView(listView());
        showPublish();
    };
    const startPublish = () => {
        openPublishList()
            .then(() => {
                const shown = view();
                if (shown?.state === "warnings" && !shown.warnings.length) return runPublish();
                return undefined;
            })
            .catch(() => {
                setPublishing(false);
            });
    };
    // The list follows the page, so it stays right while things get fixed.
    const shownView = (): PublishView | null => {
        const current = view();
        if (current?.state !== "issues" && current?.state !== "warnings") return current;
        return listView();
    };
    const fixing = () => (view() && view()?.state !== "live" ? shownView() : null);

    const closeRight = () => {
        setRight(null);
        setView(null);
        editor.select(null);
        setSheet(null);
    };
    const openLook = () => {
        editor.select(null);
        setRight("look");
        setSheet("look");
    };
    const openAdd = () => {
        setLeft("add");
        setSheet("add");
    };

    // The list drags on the phone are in sections, so a drag only needs the id and where it's headed.
    const addAt = (key: string, at?: number) => {
        editor.addSection(key, at);
        setLeft("page");
    };

    // Dragging a new section from the panel to a chosen spot on the phone.
    const startPick = (key: string, name: string, down: PointerEvent) => {
        const startX = down.clientX;
        const startY = down.clientY;
        let dragging = false;
        let index: number | null = null;
        const nodes = () => [
            ...(frame()?.contentDocument?.querySelectorAll<HTMLElement>("section.t-s[data-s]") ??
                []),
        ];
        const move = (e: PointerEvent) => {
            if (!dragging && Math.hypot(e.clientX - startX, e.clientY - startY) < 5) return;
            dragging = true;
            const iframe = frame();
            if (iframe) iframe.style.pointerEvents = "none";
            setPicking({ name, x: e.clientX, y: e.clientY });
            const box = frame()?.getBoundingClientRect();
            const inside =
                box &&
                e.clientX > box.left - 40 &&
                e.clientX < box.right + 40 &&
                e.clientY > box.top &&
                e.clientY < box.bottom;
            index = null;
            for (const node of nodes()) node.style.transform = "";
            if (!inside) return;
            const list = nodes();
            const y = e.clientY - box.top;
            const found = list.findIndex((node) => {
                const r = node.getBoundingClientRect();
                return y < r.top + r.height / 2;
            });
            index = found < 0 ? list.length : found;
            list.forEach((node, i) => {
                node.style.transform = i >= (index ?? 0) ? "translateY(52px)" : "";
            });
        };
        const up = (e: PointerEvent) => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            window.removeEventListener("pointercancel", up);
            for (const node of nodes()) node.style.transform = "";
            const iframe = frame();
            if (iframe) iframe.style.pointerEvents = "";
            setPicking(null);
            if (dragging) {
                swallowClick = true;
                setTimeout(() => {
                    swallowClick = false;
                }, 60);
                if (e.type === "pointerup" && index !== null) addAt(key, index);
            }
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
    };
    let swallowClick = false;

    const onGripDown = (e: PointerEvent) => {
        const startY = e.clientY;
        const onUp = (up: PointerEvent) => {
            const moved = up.clientY - startY;
            if (Math.abs(moved) < GRIP_DRAG) return;
            if (moved < 0) setTall(true);
            else if (tall()) setTall(false);
            else {
                setSheet(null);
                editor.select(null);
            }
        };
        window.addEventListener("pointerup", onUp, { once: true });
    };
    const panelBits = {
        onGrip: onGripDown,
        onGripTap: () => setTall((was) => !was),
    };

    // A quiet painting behind the phone, following the page's colours. The palette is limited to hex
    // colours by the page schema, so this markup is safe to insert.
    const [wash, setWash] = createSignal<HTMLDivElement>();
    createEffect(() => {
        const page = editor.page();
        const look = looks[page.look];
        const theme = themeOf(page);
        const element = wash();
        if (element) {
            element.innerHTML = paint(
                theme ? paintFor(theme) : (page.paint ?? look.palette),
                (page.seed ?? look.seed) + 3,
            ).replace('class="tondo"', "");
        }
    });

    createEffect(() => {
        const message = editor.notice();
        if (!message) return;
        const timer = setTimeout(() => {
            editor.clearNotice();
        }, NOTICE_MS);
        onCleanup(() => {
            clearTimeout(timer);
        });
    });

    const onKey = (e: KeyboardEvent) => {
        const target = e.target as {
            tagName?: string;
            isContentEditable?: boolean;
            blur?: () => void;
        } | null;
        const typing =
            target?.tagName === "INPUT" ||
            target?.tagName === "TEXTAREA" ||
            target?.tagName === "SELECT" ||
            Boolean(target?.isContentEditable);
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !typing) {
            e.preventDefault();
            if (e.shiftKey) editor.redo();
            else editor.undo();
            return;
        }
        if (e.key === "Escape") {
            setPreviewing(false);
            setView(null);
            setRight(null);
            setLeft("page");
            setSheet(null);
            target?.blur?.();
            editor.select(null);
            return;
        }
        if (typing) return;
        const id = editor.selected();
        if (id && id !== HEADER && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
            e.preventDefault();
            editor.duplicate(id);
            return;
        }
        if (id && id !== HEADER && e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            e.preventDefault();
            const index = findSection(editor.page(), id)?.index ?? 0;
            editor.moveSection(id, index + (e.key === "ArrowUp" ? -1 : 1));
            return;
        }
        if (id && id !== HEADER && (e.key === "Backspace" || e.key === "Delete")) {
            e.preventDefault();
            editor.remove(id);
        }
    };

    const openIssue = (target: string, item?: string) => {
        // Nothing to go to: a problem with the page as a whole.
        if (target === "page") return;
        setAskedItem(item ?? target);
        editor.select(
            target === HEADER ? HEADER : (findSection(editor.page(), target)?.section.id ?? null),
        );
        revealAsked(item, target);
    };

    // Home links straight to the thing to fix. A link only ever opens the panel, never publishes.
    const openAsked = () => {
        const asked = new URLSearchParams(location.search);
        const panel = asked.get("panel");
        const section = asked.get("section");
        if (!panel && !section) return;
        history.replaceState(null, "", location.pathname);
        if (panel === "publish") {
            openPublishList().catch(() => undefined);
        } else if (panel === "look") {
            openLook();
        } else if (panel === "add") {
            openAdd();
        } else if (section) {
            openIssue(section, asked.get("item") ?? undefined);
        }
    };

    const [stale, setStale] = createSignal(
        untrack(() => {
            const found = loadStaleBackup(props.account.handle, props.draft.updatedAt);
            if (found && pageHash(found.page) === pageHash(props.draft.page)) {
                dropBackup(found.key);
                return null;
            }
            return found;
        }),
    );
    const restoreStale = async (backup: Backup) => {
        await editor.saver.keepMine(backup.page);
        dropBackup(backup.key);
        location.reload();
    };

    // Another tab or the dashboard can take the page down, so coming back here checks.
    const checkLive = () => {
        if (document.visibilityState !== "visible") return;
        loadDraft()
            .then((latest) => {
                editor.syncLive(latest.published, latest.changed);
            })
            .catch(() => undefined);
    };

    onMount(() => {
        openAsked();
        document.addEventListener("visibilitychange", checkLive);
        onCleanup(() => {
            document.removeEventListener("visibilitychange", checkLive);
        });
        window.addEventListener("keydown", onKey);
        onCleanup(() => {
            window.removeEventListener("keydown", onKey);
        });
    });

    createEffect(() => {
        const id = editor.selected();
        if (id) {
            setRight(null);
            // Fixing something from the publish list keeps the list to come back to.
            setView((was) => (was?.state === "live" ? null : was));
            setLeft("page");
            setTall(false);
            setSheet("section");
        } else if (untrack(sheet) === "section") {
            setSheet(null);
        }
    });

    const selectedTitle = () => {
        const id = editor.selected();
        if (id === HEADER) return "Your name and links";
        return id ? (findSection(editor.page(), id)?.section.definition.name ?? "") : "";
    };

    return (
        <div
            class="build"
            data-sheet={sheet() ?? undefined}
            classList={{ previewing: previewing() }}
        >
            <div class="recovers">
                <Show when={stale()}>
                    {(backup) => (
                        <div class="recover" role="alert">
                            <p>This browser has unsaved work on an older version of your page.</p>
                            <button
                                type="button"
                                class="recover-restore"
                                onClick={() => {
                                    restoreStale(backup()).catch(() => undefined);
                                }}
                            >
                                Restore it
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    downloadPage(backup().page, props.account.handle);
                                }}
                            >
                                Download it
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    dropBackup(backup().key);
                                    setStale(null);
                                }}
                            >
                                Discard it
                            </button>
                        </div>
                    )}
                </Show>
                <Show when={editor.page().unreadable?.length}>
                    <div class="recover" role="status" data-unreadable>
                        <p>
                            Part of your page couldn't be read, so it's off your live page. It's
                            kept safe. Email support and we'll get it back for you.
                        </p>
                    </div>
                </Show>
            </div>
            <main class="stage">
                <div class="wash" aria-hidden="true" ref={setWash} />
                <TopBar
                    editor={editor}
                    account={props.account}
                    onPreview={() => setPreviewing(true)}
                    publishing={publishing()}
                    onPublish={startPublish}
                    suspended={props.draft.suspended}
                />
                <div class="phone" id="phone">
                    <Canvas
                        editor={editor}
                        ref={setFrame}
                        onKey={onKey}
                        onAddBelow={(id) => {
                            editor.select(id);
                            openAdd();
                        }}
                        onDragStart={() => {
                            setSheet(null);
                        }}
                        onDragOver={(id, to) => {
                            setDragOrder({ id, to });
                        }}
                        onSocialIcons={() => {
                            editor.select(HEADER);
                            setSheet("section");
                            setTall(true);
                            setSocialAsked((was) => was + 1);
                        }}
                        onDragEnd={() => {
                            setDragOrder(null);
                        }}
                    />
                </div>
            </main>
            <Show
                when={left() === "add"}
                fallback={
                    <Panel
                        title="Your page"
                        class="lside"
                        open={sheet() === "page"}
                        {...panelBits}
                        tall={tall()}
                        onClose={() => {
                            setSheet(null);
                        }}
                    >
                        <PagePanel
                            editor={editor}
                            onOpenLook={openLook}
                            onOpenAdd={openAdd}
                            onAdded={() => {
                                setSheet("section");
                            }}
                            dragOrder={dragOrder}
                        />
                    </Panel>
                }
            >
                <Panel
                    title="Add a section"
                    class="lside"
                    open={sheet() === "add"}
                    {...panelBits}
                    tall={true}
                    onBack={() => {
                        setLeft("page");
                        setSheet("page");
                    }}
                >
                    <AddList
                        editor={editor}
                        onAdd={(key) => {
                            if (!swallowClick) addAt(key);
                        }}
                        onDrag={startPick}
                    />
                </Panel>
            </Show>
            <Show when={editor.selected()} keyed>
                {(id) => (
                    <Panel
                        title={selectedTitle()}
                        class="rside"
                        open={sheet() === "section"}
                        {...panelBits}
                        tall={tall()}
                        onClose={closeRight}
                    >
                        <Show when={fixing()}>
                            <button type="button" class="pub-back" onClick={showPublish}>
                                <Show
                                    when={publishIssues(editor.page()).length}
                                    fallback="Back to publishing"
                                >
                                    {(n) => `Back to the list: ${String(n())} left`}
                                </Show>
                            </button>
                        </Show>
                        <Show
                            when={id === HEADER}
                            fallback={<SectionPanel editor={editor} id={id} />}
                        >
                            <HeaderPanel editor={editor} socialAsked={socialAsked()} />
                        </Show>
                    </Panel>
                )}
            </Show>
            <Show when={!editor.selected() && right() === "look"}>
                <Panel
                    title="Look"
                    class="rside lookside"
                    open={sheet() === "look"}
                    {...panelBits}
                    tall={tall()}
                    onClose={closeRight}
                    extra={
                        <div class="tab-seg" role="tablist">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={lookTab() === "looks"}
                                onClick={() => setLookTab("looks")}
                            >
                                All looks
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={lookTab() === "mine"}
                                onClick={() => setLookTab("mine")}
                            >
                                Make it yours
                            </button>
                        </div>
                    }
                >
                    <Show when={lookTab() === "looks"} fallback={<MakeItYours editor={editor} />}>
                        <LookTiles
                            page={editor.page}
                            onPick={(look) => {
                                editor.setLook(look);
                            }}
                        />
                    </Show>
                </Panel>
            </Show>
            <Show when={!editor.selected() && right() === "publish" && shownView()}>
                {(current) => (
                    <Panel
                        title={publishTitle(current())}
                        class="rside"
                        open={sheet() === "publish"}
                        {...panelBits}
                        tall={tall()}
                        onClose={closeRight}
                    >
                        <PublishPanel
                            view={current()}
                            onOpen={(issue) => {
                                setRight(null);
                                if (issue.target === "add") {
                                    setView(null);
                                    openAdd();
                                    return;
                                }
                                openIssue(issue.target, issue.item);
                            }}
                            onPublishAnyway={() => {
                                runPublish().catch(() => {
                                    setPublishing(false);
                                });
                            }}
                        />
                    </Panel>
                )}
            </Show>
            <nav class="tabbar" aria-label="Editor">
                <button
                    type="button"
                    aria-pressed={sheet() === "page" || sheet() === "section"}
                    onClick={() => {
                        setLeft("page");
                        editor.select(null);
                        setSheet(sheet() === "page" ? null : "page");
                    }}
                >
                    <Glyph name="list" />
                    Sections
                </button>
                <button
                    type="button"
                    aria-pressed={sheet() === "add"}
                    onClick={() => {
                        if (sheet() === "add") {
                            setLeft("page");
                            setSheet(null);
                        } else {
                            openAdd();
                        }
                    }}
                >
                    <Glyph name="plus" />
                    Add
                </button>
                <button
                    type="button"
                    aria-pressed={sheet() === "look"}
                    onClick={() => {
                        if (sheet() === "look") closeRight();
                        else openLook();
                    }}
                >
                    <Glyph name="brush" />
                    Look
                </button>
                <button type="button" onClick={() => setPreviewing(true)}>
                    <Glyph name="play" />
                    Preview
                </button>
            </nav>
            <Show when={picking()}>
                {(ghost) => (
                    <div
                        class="drag-ghost"
                        style={{
                            transform: `translate(${String(ghost().x + 12)}px,${String(ghost().y + 10)}px)`,
                        }}
                    >
                        {ghost().name}
                    </div>
                )}
            </Show>
            <Show when={editor.notice()}>
                <div class="toast on" role="status">
                    {editor.notice()}
                </div>
            </Show>
            <Show when={previewing()}>
                <Preview page={editor.page()} onClose={() => setPreviewing(false)} />
            </Show>
        </div>
    );
}
