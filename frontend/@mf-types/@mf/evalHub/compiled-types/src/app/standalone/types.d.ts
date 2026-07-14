export declare const isNavDataGroup: (navItem: NavDataItem) => navItem is NavDataGroup;
type NavDataCommon = {
    label: string;
};
export type NavDataHref = NavDataCommon & {
    path: string;
    href: string;
};
export type NavDataGroup = NavDataCommon & {
    children: NavDataHref[];
};
export type NavDataItem = NavDataHref | NavDataGroup;
export {};
