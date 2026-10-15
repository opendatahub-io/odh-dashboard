import type { AgentsCatalogFiltersState } from '~/app/pages/agentsCatalog/types/agentsCatalogFilterOptions';
/**
 * Agent Catalog Segment event names.
 * @see https://docs.google.com/document/d/1m6sqycUcNViHhVFrTbaYUBjekVV-BHqectg5t4XZZQA
 */
export declare const AGENT_CATALOG_EVENTS: {
    readonly FILTER_APPLIED: "Agent Catalog Filter Applied";
    readonly SEARCH_SUBMITTED: "Agent Catalog Search Submitted";
    readonly FILTERS_RESET: "Agent Catalog Filters Reset";
    readonly LOAD_MORE_CLICKED: "Agent Catalog Load More Clicked";
    readonly DETAILS_VIEWED: "Agent Catalog Details Viewed";
    readonly OPEN_GITHUB_CLICKED: "Agent Catalog Details Open GitHub Clicked";
    readonly BACK_TO_CATALOG_CLICKED: "Agent Catalog Details Back To Catalog Clicked";
};
export type AgentCatalogEntrySource = 'catalog_card' | 'catalog_list' | 'direct_url';
export type AgentCatalogDetailsNavigationState = {
    entrySource: AgentCatalogEntrySource;
    positionIndex?: number;
    hasActiveFilters?: boolean;
    countActiveFilters?: number;
    hasSearchQuery?: boolean;
    resultCount?: number;
};
export declare const countActiveAgentFilters: (filters: AgentsCatalogFiltersState) => number;
/** Display label for a filter value (same pattern as catalog filter getLabel). */
export declare const getAgentFilterDisplayValue: (filterType: string, filterValue: string) => string;
/** Diff helper: which single value was added or removed between two filter arrays. */
export declare const getToggledFilterValue: (previousValues: string[] | undefined, nextValues: string[]) => string | undefined;
export declare const buildAgentDetailsNavigationState: (positionIndex: number, filters: AgentsCatalogFiltersState, searchQuery: string, resultCount: number) => AgentCatalogDetailsNavigationState;
export declare const isAgentCatalogDetailsNavigationState: (state: unknown) => state is AgentCatalogDetailsNavigationState;
