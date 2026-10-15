import { Agent } from '~/app/agentsCatalogTypes';
import type { ModelCatalogAPIState } from '~/app/hooks/modelCatalog/useModelCatalogAPIState';
type PaginatedAgentList = {
    items: Agent[];
    size: number;
    pageSize: number;
    nextPageToken: string;
    loadMore: () => void;
    isLoadingMore: boolean;
    hasMore: boolean;
    refresh: () => void;
    loadMoreError?: Error;
};
export type AgentsResult = {
    agents: PaginatedAgentList;
    agentsLoaded: boolean;
    agentsLoadError: Error | undefined;
    refresh: () => void;
};
type UseAgentsBySourceLabelParams = {
    sourceLabel?: string;
    pageSize?: number;
    searchQuery?: string;
    filterQuery?: string;
    namedQuery?: string;
    sortBy?: string | null;
    sortOrder?: string;
};
export declare function useAgentsBySourceLabelWithAPI(apiState: ModelCatalogAPIState, params: UseAgentsBySourceLabelParams): AgentsResult;
export declare const useAgentsBySourceLabel: (sourceLabel?: string, pageSize?: number, searchQuery?: string, filterQuery?: string, namedQuery?: string, sortBy?: string | null, sortOrder?: string) => AgentsResult;
export {};
