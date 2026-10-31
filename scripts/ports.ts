// Every host port Tondo uses. Sibling projects run on this machine at the same time and each has its
// own block, so anything new goes here and stays inside this range. `pnpm ports:audit` compares this
// list with sibling repos and what's listening now.
export const PORT_RANGE = { first: 8100, last: 8109 } as const;

export const PORTS = {
    editor: 8100,
    server: 8101,
    postgres: 8102,
    marketing: 8103,
    drizzleStudio: 8104,
    objectStorage: 8105,
    objectStorageConsole: 8106,
    scratchpad: 8107,
    testNeon: 8108,
    testServer: 8109,
} as const;
