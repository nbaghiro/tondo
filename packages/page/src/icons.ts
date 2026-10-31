// Stand-in drawings. The product needs proper brand icons.
const PATHS: Record<string, string> = {
    instagram:
        '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.8" cy="7.2" r=".6" fill="currentColor"/>',
    tiktok: '<path d="M13.5 4v10.6a3.4 3.4 0 1 1-3-3.4"/><path d="M13.5 4c.3 2.6 2 4.2 4.5 4.4"/>',
    youtube:
        '<rect x="3" y="6" width="18" height="12" rx="4"/><path d="m10.5 9.5 4 2.5-4 2.5z" fill="currentColor"/>',
    spotify:
        '<circle cx="12" cy="12" r="9"/><path d="M7.5 9.5c3-1 6.5-.8 9 .8M8 12.7c2.5-.7 5.2-.5 7.4.8M8.7 15.6c2-.5 3.9-.3 5.6.6"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4 7.5 8 6 8-6"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.5 3.6 5.3 3.6 8.5S14.6 18 12 20.5M12 3.5C9.4 6 8.4 8.8 8.4 12s1 6 3.6 8.5"/>',
    apple: '<path d="M9 18V7l10-2v10.5"/><circle cx="6.7" cy="18" r="2.3"/><circle cx="16.7" cy="15.5" r="2.3"/>',
    phone: '<path d="M6 3.5h3l1.5 4.5-2 1.5a12 12 0 0 0 6 6l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5.5a2 2 0 0 1 2-2z"/>',
    chat: '<path d="M4 19.5 5.3 15A8 8 0 1 1 9 18.3z"/>',
    calendar:
        '<rect x="4" y="5.5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>',
    bag: '<path d="M5.5 8.5h13l1 12h-15zM9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
    pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
};

export function icon(name: string): string {
    return `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] ?? ""}</svg>`;
}
