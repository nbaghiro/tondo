import { z } from "zod";
import { escapeHtml } from "../define-block";

/** One entry in a block's list. Its id stays the same when it moves. */
export const item = <const Shape extends z.ZodRawShape>(shape: Shape) =>
    z.strictObject({ id: z.string().min(1), ...shape });

/** A time on someone's own clock, such as 2026-11-14T10:00. A 10 am class stays at 10 am. */
export const localTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

// A sample date is worked out from today, so it can't be compared with anything. This minute marks
// it instead: nobody plans an event for 18:01, and changing the date in the editor changes the time.
const SAMPLE_MINUTE = "T18:01";

export function daysFromNow(days: number): string {
    return `${new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)}${SAMPLE_MINUTE}`;
}

export const isSampleTime = (time: string): boolean => time.endsWith(SAMPLE_MINUTE);

export const daysUntil = (time: string, now: Date): number =>
    Math.ceil((Date.parse(`${time}Z`) - now.getTime()) / 86_400_000);

const MONTHS = "JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split(" ");

export function dateTile(time: string | undefined): string {
    const match = /^\d{4}-(\d{2})-(\d{2})/.exec(time ?? "");
    const month = MONTHS[Number(match?.[1] ?? 0) - 1] ?? "";
    return `<span class="b-date"><small>${month}</small><b>${match?.[2] ?? ""}</b></span>`;
}

export const lines = (value: string | undefined): string[] =>
    (value ?? "").split("\n").filter(Boolean);

export const listItems = (values: readonly string[]): string =>
    values.map((value) => `<li>${escapeHtml(value)}</li>`).join("");

export const carouselCss = `.b-car{display:flex;gap:10px;overflow-x:auto;margin:10px -18px 0;padding:0 18px 4px;scrollbar-width:none;scroll-snap-type:x proximity}.b-car>span,.b-car>a{flex:0 0 62%;display:block;scroll-snap-align:center}.b-car img{height:210px;border-radius:var(--r)}.b-car small{display:block;font-size:15px;font-weight:600;margin-top:7px}`;
export const videoCss = `.b-video{display:block;position:relative;height:215px;border-radius:var(--r);overflow:hidden;margin-top:10px;color:#fff!important;background:#111}.b-video::after{content:"";position:absolute;inset:35% 0 0;background:linear-gradient(transparent,rgba(0,0,0,.76))}.b-play{position:absolute;z-index:1;left:50%;top:42%;width:56px;height:56px;margin:-28px;display:grid;place-items:center;border-radius:50%;background:#fff;color:#111}.b-vt{position:absolute;z-index:1;left:14px;right:14px;bottom:12px}.b-vt b{display:block;line-height:1.2;font-size:17px}.b-vt small{font-size:13px;opacity:.85}`;
export const cardCss = `background:var(--card);color:var(--cardfg);border:var(--line-b,1px solid var(--line));border-radius:var(--r);box-shadow:var(--sh,none)`;
