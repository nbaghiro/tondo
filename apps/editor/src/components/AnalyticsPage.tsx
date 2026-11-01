import { createResource, createSignal, For, Show } from "solid-js";
import { loadStats } from "../lib/api";
import { BarRows, LineChart, shortDate } from "./Chart";
import { Card, EmptyLine, PageHeader } from "./Parts";

const RANGES = [7, 30, 90];

const readable = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

export function AnalyticsPage() {
    const [range, setRange] = createSignal(30);
    const [metric, setMetric] = createSignal<"views" | "clicks">("views");
    const [asTable, setAsTable] = createSignal(false);
    const [stats] = createResource(range, (days) => loadStats(days));
    const label = () => (metric() === "views" ? "Views" : "Link clicks");
    const points = () =>
        (stats()?.days ?? []).map((entry) => ({ day: entry.day, value: entry[metric()] }));
    return (
        <>
            <PageHeader
                title="Analytics"
                lead="How many people visit your page and what they open."
            >
                <div class="seg" role="group" aria-label="Date range">
                    <For each={RANGES}>
                        {(days) => (
                            <button
                                type="button"
                                aria-pressed={range() === days}
                                onClick={() => setRange(days)}
                            >
                                {days} days
                            </button>
                        )}
                    </For>
                </div>
            </PageHeader>
            <Show when={stats()} fallback={<p class="emptyline">Loading your numbers</p>}>
                {(data) => (
                    <div class="stack">
                        <Card>
                            <div class="tiles tiles-2">
                                <button
                                    type="button"
                                    class="tile"
                                    aria-pressed={metric() === "views"}
                                    onClick={() => setMetric("views")}
                                >
                                    <span>Views</span>
                                    <b class="num">{data().views}</b>
                                </button>
                                <button
                                    type="button"
                                    class="tile"
                                    aria-pressed={metric() === "clicks"}
                                    onClick={() => setMetric("clicks")}
                                >
                                    <span>Link clicks</span>
                                    <b class="num">{data().clicks}</b>
                                </button>
                            </div>
                        </Card>
                        <Card
                            title={`${label()} per day`}
                            extra={
                                <button
                                    type="button"
                                    class="lnk"
                                    onClick={() => setAsTable(!asTable())}
                                >
                                    {asTable() ? "Show chart" : "Show table"}
                                </button>
                            }
                        >
                            <Show
                                when={data().views + data().clicks > 0}
                                fallback={
                                    <EmptyLine>
                                        Nothing yet in this range. Numbers appear once people open
                                        your link.
                                    </EmptyLine>
                                }
                            >
                                <Show
                                    when={asTable()}
                                    fallback={<LineChart points={points()} label={label()} />}
                                >
                                    <div class="tw">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Day</th>
                                                    <th class="n">Views</th>
                                                    <th class="n">Link clicks</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <For each={[...data().days].reverse()}>
                                                    {(entry) => (
                                                        <tr>
                                                            <td>{shortDate(entry.day)}</td>
                                                            <td class="n">{entry.views}</td>
                                                            <td class="n">{entry.clicks}</td>
                                                        </tr>
                                                    )}
                                                </For>
                                            </tbody>
                                        </table>
                                    </div>
                                </Show>
                            </Show>
                        </Card>
                        <Card title="Top links">
                            <Show
                                when={data().links.length}
                                fallback={<EmptyLine>No link clicks in this range yet.</EmptyLine>}
                            >
                                <BarRows
                                    rows={data().links.map((link) => ({
                                        label: readable(link.url),
                                        value: link.clicks,
                                    }))}
                                />
                            </Show>
                        </Card>
                    </div>
                )}
            </Show>
        </>
    );
}
