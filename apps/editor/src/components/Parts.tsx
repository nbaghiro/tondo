import { createSignal, Show } from "solid-js";
import type { JSX } from "solid-js";
import { needsPro } from "../state/plan";

const ICONS: Record<string, string> = {
    spark: '<path d="M12 4l1.8 5.2L19 11l-5.2 1.8L12 18l-1.8-5.2L5 11l5.2-1.8z"/>',
    home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
    chart: '<path d="M4 19h16M7 16v-5M12 16V7M17 16v-8"/>',
    sliders:
        '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8M12 17h.01"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h9"/>',
    open: '<path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5"/>',
    share: '<path d="M12 15V4M8 8l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    go: '<path d="M9 6l6 6-6 6"/>',
};

/** A small word beside something that works here and needs Pro to publish. It isn't a lock. */
export function ProLabel(props: { for: "design" | "business" }) {
    return (
        <Show when={needsPro(props.for)}>
            <small class="pro-label" aria-label="part of Pro">
                Pro
            </small>
        </Show>
    );
}

export function NavIcon(props: { name: string }) {
    return (
        <svg
            class="i"
            viewBox="0 0 24 24"
            aria-hidden="true"
            ref={(el) => {
                el.innerHTML = ICONS[props.name] ?? "";
            }}
        />
    );
}

export function PageHeader(props: { title: string; lead?: string; children?: JSX.Element }) {
    return (
        <div class="ph">
            <div>
                <h1>{props.title}</h1>
                <Show when={props.lead}>
                    <p>{props.lead}</p>
                </Show>
            </div>
            <Show when={props.children}>
                <div class="acts">{props.children}</div>
            </Show>
        </div>
    );
}

export function Card(props: {
    title?: string;
    note?: string;
    extra?: JSX.Element;
    children: JSX.Element;
}) {
    return (
        <section class="card">
            <Show when={props.title}>
                <div class="ch">
                    <h2>{props.title}</h2>
                    <Show when={props.note}>
                        <small>{props.note}</small>
                    </Show>
                    {props.extra}
                </div>
            </Show>
            {props.children}
        </section>
    );
}

export function SettingsSection(props: { title: string; lead: string; children: JSX.Element }) {
    return (
        <section class="fs">
            <div>
                <h2>{props.title}</h2>
                <p>{props.lead}</p>
            </div>
            <div>{props.children}</div>
        </section>
    );
}

export function EmptyLine(props: { children: JSX.Element }) {
    return <p class="emptyline">{props.children}</p>;
}

/** Says what happened, and goes away by itself. */
export function createToast() {
    const [message, setMessage] = createSignal("");
    let timer: ReturnType<typeof setTimeout> | undefined;
    return {
        say(text: string) {
            setMessage(text);
            clearTimeout(timer);
            timer = setTimeout(() => setMessage(""), 2600);
        },
        View: () => (
            <div class="toast-s" classList={{ show: Boolean(message()) }} role="status">
                {message()}
            </div>
        ),
    };
}
