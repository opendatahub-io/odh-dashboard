import type { AgentsCatalogFiltersState } from '~/app/pages/agentsCatalog/types/agentsCatalogFilterOptions';
type UrlState = {
    searchQuery: string;
    filters: AgentsCatalogFiltersState;
    selectedSourceLabel: string | undefined;
};
type UseAgentsUrlSyncReturn = {
    initialState: UrlState;
    syncToUrl: (state: UrlState) => void;
};
export declare function useAgentsUrlSync(): UseAgentsUrlSyncReturn;
export {};
