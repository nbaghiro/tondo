import { FREE_LOOK_FOR, freeLookFor, lookNames, starterPage, stepDown } from "@tondo/page";
import type { LookName, PaidUse } from "@tondo/page";
import { looks, renderDocument } from "@tondo/render";
import { createSignal, For } from "solid-js";
import { PublishPanel } from "./PublishPanel";

const USES: PaidUse[] = [
    { code: "look", target: "look", label: "Bakehouse" },
    { code: "colour", target: "look", label: "your own colour" },
    { code: "section", target: "a", label: "Shop" },
];

/** The plan screens and every look with its mark and step-down, for checking by eye. Development only. */
export function PlanLab() {
    const [look, setLook] = createSignal<LookName>("bake");
    const page = () => ({ ...starterPage("Maya Okafor"), look: look() });
    const html = (down: boolean) =>
        renderDocument(down ? stepDown(page(), { keepContent: true }) : page(), {
            title: "Plans",
            assetBase: "/photos/",
            editable: false,
            live: true,
            trackAs: "maya",
            mark: true,
        });
    return (
        <div style={{ display: "grid", "grid-template-columns": "180px 320px 390px 390px" }}>
            <div style={{ height: "100vh", "overflow-y": "auto" }}>
                <p>{Object.keys(FREE_LOOK_FOR).length} paid looks</p>
                <For each={lookNames}>
                    {(name) => (
                        <button style={{ display: "block" }} onClick={() => setLook(name)}>
                            {looks[name].label}, then {looks[freeLookFor(name)].label}
                        </button>
                    )}
                </For>
            </div>
            <PublishPanel
                view={{ state: "plan", uses: USES, warnings: [] }}
                onOpen={() => undefined}
                onPublishAnyway={() => undefined}
            />
            <iframe title="Before" srcdoc={html(false)} style={{ border: 0, height: "100vh" }} />
            <iframe title="After" srcdoc={html(true)} style={{ border: 0, height: "100vh" }} />
        </div>
    );
}
