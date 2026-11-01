import { createSignal, For, onCleanup, Show } from "solid-js";

export interface ChartPoint {
    day: string;
    value: number;
}

const H = 220;
const PAD = { left: 38, right: 10, top: 12, bottom: 26 };
const LINE = "#a42a55";

const niceMax = (value: number) => {
    if (value <= 4) return 4;
    const power = 10 ** Math.floor(Math.log10(value));
    const step = [1, 2, 2.5, 5, 10].map((n) => n * power).find((n) => n * 4 >= value) ?? power * 10;
    return step * 4;
};

export const shortDate = (day: string) =>
    new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    });

/** One measure over time: a thin line, a quiet grid, and exact values on hover. */
export function LineChart(props: { points: ChartPoint[]; label: string }) {
    const [hover, setHover] = createSignal<number | null>(null);
    // Drawn at its real width, so the labels stay readable on a phone instead of shrinking with it.
    const [width, setWidth] = createSignal(720);
    const W = () => Math.max(240, width());
    const watch = (el: HTMLElement) => {
        const observer = new ResizeObserver(([entry]) => {
            if (entry) setWidth(entry.contentRect.width);
        });
        observer.observe(el);
        onCleanup(() => {
            observer.disconnect();
        });
    };
    const max = () => niceMax(Math.max(0, ...props.points.map((point) => point.value)));
    const x = (i: number) =>
        PAD.left + (i * (W() - PAD.left - PAD.right)) / Math.max(1, props.points.length - 1);
    const y = (value: number) => H - PAD.bottom - (value / max()) * (H - PAD.top - PAD.bottom);
    const line = () =>
        props.points.map((point, i) => `${String(x(i))},${String(y(point.value))}`).join(" ");
    const every = () =>
        Math.max(1, Math.ceil(props.points.length / Math.max(2, Math.floor(W() / 110))));
    const shown = () => {
        const at = hover();
        return at === null ? null : (props.points[at] ?? null);
    };
    return (
        <div class="chart" ref={watch}>
            <svg
                viewBox={`0 0 ${String(W())} ${String(H)}`}
                role="img"
                aria-label={`${props.label} per day`}
                onPointerMove={(e) => {
                    const box = e.currentTarget.getBoundingClientRect();
                    const across = ((e.clientX - box.left) / box.width) * W();
                    const step =
                        (W() - PAD.left - PAD.right) / Math.max(1, props.points.length - 1);
                    const at = Math.round((across - PAD.left) / step);
                    setHover(Math.min(props.points.length - 1, Math.max(0, at)));
                }}
                onPointerLeave={() => setHover(null)}
            >
                <For each={[0, 1, 2, 3, 4]}>
                    {(tick) => {
                        const value = () => (max() * tick) / 4;
                        return (
                            <>
                                <line
                                    x1={PAD.left}
                                    x2={W() - PAD.right}
                                    y1={y(value())}
                                    y2={y(value())}
                                    stroke="#ece8ea"
                                />
                                <text x={PAD.left - 8} y={y(value()) + 4} text-anchor="end">
                                    {value()}
                                </text>
                            </>
                        );
                    }}
                </For>
                <For each={props.points}>
                    {(point, i) => (
                        <Show when={i() % every() === 0}>
                            <text x={x(i())} y={H - 6} text-anchor="middle">
                                {shortDate(point.day)}
                            </text>
                        </Show>
                    )}
                </For>
                <polyline points={line()} fill="none" stroke={LINE} stroke-width="2" />
                <Show when={hover() !== null && shown()}>
                    {(point) => (
                        <>
                            <line
                                x1={x(hover() ?? 0)}
                                x2={x(hover() ?? 0)}
                                y1={PAD.top}
                                y2={H - PAD.bottom}
                                stroke="#94868c"
                            />
                            <circle
                                cx={x(hover() ?? 0)}
                                cy={y(point().value)}
                                r="5"
                                fill={LINE}
                                stroke="#fff"
                                stroke-width="2"
                            />
                        </>
                    )}
                </Show>
            </svg>
            <Show when={shown()}>
                {(point) => (
                    <div
                        class="tip"
                        style={{
                            left: `${String(Math.min(82, (x(hover() ?? 0) / W()) * 100))}%`,
                        }}
                    >
                        <b>{shortDate(point().day)}</b>
                        <span>
                            {point().value} {props.label.toLowerCase()}
                        </span>
                    </div>
                )}
            </Show>
        </div>
    );
}

export function BarRows(props: { rows: { label: string; value: number }[] }) {
    const max = () => Math.max(1, ...props.rows.map((row) => row.value));
    return (
        <ul class="rows">
            <For each={props.rows}>
                {(row) => (
                    <li>
                        <span title={row.label}>{row.label}</span>
                        <b class="num">{row.value}</b>
                        <i>
                            <u style={{ width: `${String((row.value / max()) * 100)}%` }} />
                        </i>
                    </li>
                )}
            </For>
        </ul>
    );
}
