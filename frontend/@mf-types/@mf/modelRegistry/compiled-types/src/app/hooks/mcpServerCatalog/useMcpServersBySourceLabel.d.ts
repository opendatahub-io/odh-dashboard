import { McpServer } from '~/app/mcpServerCatalogTypes';
import type { ModelCatalogAPIState } from '~/app/hooks/modelCatalog/useModelCatalogAPIState';
type PaginatedMcpServerList = {
    items: McpServer[];
    size: number;
    pageSize: number;
    nextPageToken: string;
    loadMore: () => void;
    isLoadingMore: boolean;
    hasMore: boolean;
    refresh: () => void;
    loadMoreError?: Error;
};
export type McpServersResult = {
    mcpServers: PaginatedMcpServerList;
    mcpServersLoaded: boolean;
    mcpServersLoadError: Error | undefined;
    refresh: () => void;
};
type UseMcpServersBySourceLabelParams = {
    sourceLabel?: string;
    pageSize?: number;
    searchQuery?: string;
    filterQuery?: string;
    namedQuery?: string;
    includeTools?: boolean;
    toolLimit?: number;
    sortBy?: string | null;
    sortOrder?: string;
};
export declare function useMcpServersBySourceLabelWithAPI(apiState: ModelCatalogAPIState, params: UseMcpServersBySourceLabelParams): McpServersResult;
export declare const useMcpServersBySourceLabel: (sourceLabel?: string, pageSize?: number, searchQuery?: string, filterQuery?: string, namedQuery?: string, includeTools?: boolean, toolLimit?: number, sortBy?: string | null, sortOrder?: string) => McpServersResult;
export {};
