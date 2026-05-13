import type { McpCatalogFiltersState } from '~/app/pages/mcpCatalog/types/mcpCatalogFilterOptions';
import type { McpDeploymentMode, McpEndpoints, McpSecurityIndicator } from '~/app/mcpServerCatalogTypes';
export declare const isMcpRemoteDeploymentMode: (mode?: McpDeploymentMode) => boolean;
export declare const getMcpServerPrimaryEndpoint: (endpoints?: McpEndpoints | null) => string | undefined;
export declare const getSecurityIndicatorLabels: (securityIndicators?: McpSecurityIndicator | null) => string[];
export declare const hasMcpFiltersApplied: (filters: McpCatalogFiltersState, searchQuery: string) => boolean;
export declare function mcpFiltersToFilterQuery(filters: McpCatalogFiltersState): string;
