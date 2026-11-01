import type { Page } from "@tondo/page";

// Every plan limit is checked here, so paid plans only have to change this file.
export interface Limits {
    photos: number;
}

const FREE: Limits = { photos: 200 };

export const limitsFor = (_userId: string): Limits => FREE;

/** Anything a page can't do on this plan. Nothing yet, because there's only one plan. */
export const planIssues = (_page: Page): string[] => [];
