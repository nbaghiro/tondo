const PATHS = {
    grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
    up: "m6 14 6-6 6 6",
    down: "m6 10 6 6 6-6",
    copy: "M8.5 8.5h11v11h-11zM15.5 8.5v-4h-11v11h4",
    trash: "M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.8 12.2h9.4L17.5 7",
    undo: "M8.5 5 4 9.5 8.5 14M4.5 9.500H14a5.500 5.500 0 0 1 0 11h-3",
    redo: "m15.500 5 4.500 4.500-4.500 4.500M19.500 9.500H10a5.500 5.500 0 0 0 0 11h3",
    back: "m14 6-6 6 6 6",
    close: "M6 6l12 12M18 6 6 18",
    brush: "M20 4c-5 1.500-9 5-11 9l2.500 2.500c4-2 7.500-6 8.500-11.500zM8.500 14c-2 .3-3 1.700-3.200 3.300-.1 1-.8 1.700-1.800 2 2.500.8 6.300.3 7.300-2.700",
} as const;

export function Icon(props: { name: keyof typeof PATHS }) {
    return (
        <svg
            class="icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width={props.name === "grip" ? 3 : 1.7}
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
        >
            <path d={PATHS[props.name]} />
        </svg>
    );
}
