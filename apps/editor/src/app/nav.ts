// Every place in the dashboard. A new page is one line here, one route in routes.tsx and one file.
// An item only appears once its feature works, and items never move, so people's habits survive.
export type NavGroup = "top" | "grow" | "sell" | "share" | "manage" | "bottom";

export interface NavItem {
    id: string;
    label: string;
    icon: string;
    group: NavGroup;
    /** Inside the app. */
    path?: string;
    /** On the marketing site. */
    external?: string;
}

export const GROUP_NAMES: Partial<Record<NavGroup, string>> = {
    grow: "Grow",
    sell: "Sell",
    share: "Share",
    manage: "Manage",
};

export const NAV: readonly NavItem[] = [
    { id: "home", label: "Home", icon: "home", group: "top", path: "/" },
    { id: "analytics", label: "Analytics", icon: "chart", group: "top", path: "/analytics" },
    { id: "team", label: "Team", icon: "team", group: "top", path: "/team" },
    { id: "settings", label: "Page settings", icon: "sliders", group: "manage", path: "/settings" },
    { id: "help", label: "Help", icon: "help", group: "bottom", external: "/support" },
    { id: "account", label: "Account", icon: "person", group: "bottom", path: "/account" },
];

export const groupsInOrder = (items: readonly NavItem[]) => {
    const order: NavGroup[] = ["top", "grow", "sell", "share", "manage"];
    return order.flatMap((group) => {
        const inside = items.filter((item) => item.group === group);
        return inside.length ? [{ group, name: GROUP_NAMES[group], items: inside }] : [];
    });
};
