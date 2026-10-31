// Pointer positions inside the iframe are relative to it, and the editor's are relative to the window.

export interface Point {
    x: number;
    y: number;
}

export function frameToWindow(frame: HTMLIFrameElement, point: Point): Point {
    const box = frame.getBoundingClientRect();
    return { x: point.x + box.left, y: point.y + box.top };
}

export function windowToFrame(frame: HTMLIFrameElement, point: Point): Point {
    const box = frame.getBoundingClientRect();
    return { x: point.x - box.left, y: point.y - box.top };
}

export function blockNode(frame: HTMLIFrameElement, id: string): Element | null {
    return frame.contentDocument?.querySelector(`[data-block-id="${CSS.escape(id)}"]`) ?? null;
}
