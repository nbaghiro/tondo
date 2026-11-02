const DRAWING = `<circle cx="12" cy="12" r="11.5" fill="#c8385f"/><path d="M0.89 14.98A11.5 11.5 0 0 1 17.75 2.04Q13 13 0.89 14.98Z" fill="#a42a55"/><path d="M21.96 6.25A11.5 11.5 0 0 1 8.07 22.81Q9 9 21.96 6.25Z" fill="#e8876a"/><path d="M23.46 13A11.5 11.5 0 0 1 14 23.33Q13 13 23.46 13Z" fill="#f2b56b"/><path d="M12 4.8Q13.44 10.56 19.2 12Q13.44 13.44 12 19.2Q10.56 13.44 4.8 12Q10.56 10.56 12 4.8Z" fill="#fff" stroke="#fff" stroke-width="0.9" stroke-linejoin="round"/>`;

/** Help me's mark: a painted roundel with a star cut out. Its colours are its own, so it isn't a `Glyph`. */
export function HelpMark() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            aria-hidden="true"
            ref={(el) => {
                el.innerHTML = DRAWING;
            }}
        />
    );
}
