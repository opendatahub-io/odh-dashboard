export declare enum CatalogSettingsPreviewTab {
    INCLUDED = "included",
    EXCLUDED = "excluded"
}
export declare const DEFAULT_PREVIEW_PAGE_SIZE = 20;
export type CatalogSettingsPreviewTabState<TItem> = {
    items: TItem[];
    nextPageToken?: string;
    hasMore: boolean;
};
export type CatalogSettingsPreviewResult<TItem, TSummary> = {
    items: TItem[];
    summary: TSummary;
    nextPageToken?: string;
};
export declare const getTargetPreviewTab: (isFreshPreview: boolean, switchToTab: CatalogSettingsPreviewTab | undefined, activeTab: CatalogSettingsPreviewTab, includedTab: CatalogSettingsPreviewTab) => CatalogSettingsPreviewTab;
export declare const createInitialPreviewTabState: <TItem>() => CatalogSettingsPreviewTabState<TItem>;
