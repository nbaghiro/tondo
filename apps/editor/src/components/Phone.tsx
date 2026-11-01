import type { JSX } from "solid-js";
import "../styles/phone.css";

/** The device a page is shown in, the same size on every screen. */
export function Phone(props: { class?: string; id?: string; children: JSX.Element }) {
    return (
        <div class={props.class ? `phone ${props.class}` : "phone"} id={props.id}>
            {props.children}
        </div>
    );
}
