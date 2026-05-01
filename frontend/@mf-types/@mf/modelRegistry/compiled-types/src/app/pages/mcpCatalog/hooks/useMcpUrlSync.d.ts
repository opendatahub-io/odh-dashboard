import type { McpCatalogFiltersState } from '~/app/pages/mcpCatalog/types/mcpCatalogFilterOptions';
type UrlState = {
    searchQuery: string;
    filters: McpCatalogFiltersState;
    selectedSourceLabel: string | undefined;
};
type UseMcpUrlSyncReturn = {
    initialState: UrlState;
    syncToUrl: (state: UrlState) => void;
};
export declare function useMcpUrlSync(): UseMcpUrlSyncReturn;
export {};
