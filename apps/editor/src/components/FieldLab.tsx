import type { BlockValues, Field } from "@tondo/page";
import { createSignal, For } from "solid-js";
import { FieldView, SourceInput } from "./Fields";
import type { ConnectionState } from "./Fields";

const ASSETS = "/photos/";

// Development only, at /?fields: each field type on its own, including the ones the slice doesn't
// use yet.
const FIELDS: readonly Field[] = [
    { kind: "text", key: "text", label: "Text", max: 40 },
    { kind: "longText", key: "long", label: "Long text", max: 200 },
    { kind: "link", key: "link", label: "Link", fills: "text" },
    { kind: "photo", key: "photo", label: "Photo with crop point" },
    { kind: "photoList", key: "photos", label: "Photo list", max: 8 },
    { kind: "toggle", key: "toggle", label: "On or off" },
    {
        kind: "choice",
        key: "short",
        label: "Choice, short",
        options: [
            ["s", "Small"],
            ["m", "Medium"],
            ["l", "Large"],
        ],
    },
    {
        kind: "choice",
        key: "long2",
        label: "Choice, long",
        options: [
            ["a", "Instagram"],
            ["b", "TikTok"],
            ["c", "YouTube"],
            ["d", "Apple Music"],
        ],
    },
    { kind: "dateTime", key: "date", label: "Date and time" },
    {
        kind: "list",
        key: "items",
        label: "List of items",
        title: "name",
        add: "Add an item",
        max: 4,
        make: () => ({ name: "New item", url: "" }),
        fields: [
            { kind: "text", key: "name", label: "Name", max: 40 },
            { kind: "link", key: "url", label: "Link" },
        ],
    },
    { kind: "file", key: "file", label: "File" },
];

const SOURCE: Field = {
    kind: "source",
    key: "source",
    label: "Where it comes from",
    options: [
        { value: "manual", label: "My photos" },
        { value: "instagram", label: "Instagram" },
        { value: "later", label: "Hidden, not built yet", held: true },
    ],
};

export function FieldLab() {
    const [values, setValues] = createSignal<BlockValues>({});
    const [connection, setConnection] = createSignal<ConnectionState>("none");
    const set = (key: string, value: unknown) => {
        setValues((current) => ({ ...current, [key]: value }));
        return true;
    };
    return (
        <main class="lab">
            <h1>Field types</h1>
            <div class="lab-grid">
                <For each={FIELDS}>
                    {(field) => (
                        <section class="lab-card">
                            <FieldView assets={ASSETS} field={field} values={values} set={set} />
                        </section>
                    )}
                </For>
                <section class="lab-card">
                    <div class="fd-l">
                        <span>Source and connection</span>
                    </div>
                    <SourceInput
                        assets={ASSETS}
                        field={SOURCE}
                        values={values}
                        set={set}
                        connection={connection()}
                        onConnect={() =>
                            setConnection((state) => (state === "none" ? "broken" : "connected"))
                        }
                    />
                </section>
            </div>
            <pre class="lab-out">{JSON.stringify(values(), null, 2)}</pre>
        </main>
    );
}
