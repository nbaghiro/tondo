import { everyLayoutPage, lookNames } from "@tondo/page";
import type { LookName } from "@tondo/page";
import { renderDocument } from "@tondo/render";
import { createSignal, For } from "solid-js";

/** Every layout of every block in one look, for checking them by eye. Development only. */
export function BlockLab() {
    const [look, setLook] = createSignal<LookName>("madder");
    const html = () =>
        renderDocument(everyLayoutPage(look()), {
            title: "Blocks",
            assetBase: "/photos/",
            editable: false,
        });
    return (
        <div style={{ display: "grid", "grid-template-columns": "auto 390px", height: "100vh" }}>
            <div style={{ "overflow-y": "auto", padding: "12px" }}>
                <For each={lookNames}>
                    {(name) => (
                        <button
                            style={{ display: "block", "font-weight": look() === name ? 700 : 400 }}
                            onClick={() => setLook(name)}
                        >
                            {name}
                        </button>
                    )}
                </For>
            </div>
            <iframe
                title="Blocks"
                srcdoc={html()}
                style={{ border: 0, width: "390px", height: "100%" }}
            />
        </div>
    );
}
