import type { AgentsCatalogFiltersState } from '~/app/pages/agentsCatalog/types/agentsCatalogFilterOptions';
import { AGENT_FILTER_KEYS, AGENT_LABEL_MAPPINGS } from '~/app/pages/agentsCatalog/const';

/**
 * Agent Catalog Segment event names.
 * @see https://docs.google.com/document/d/1m6sqycUcNViHhVFrTbaYUBjekVV-BHqectg5t4XZZQA
 */
export const AGENT_CATALOG_EVENTS = {
  FILTER_APPLIED: 'Agent Catalog Filter Applied',
  SEARCH_SUBMITTED: 'Agent Catalog Search Submitted',
  FILTERS_RESET: 'Agent Catalog Filters Reset',
  LOAD_MORE_CLICKED: 'Agent Catalog Load More Clicked',
  DETAILS_VIEWED: 'Agent Catalog Details Viewed',
  OPEN_GITHUB_CLICKED: 'Agent Catalog Details Open GitHub Clicked',
  BACK_TO_CATALOG_CLICKED: 'Agent Catalog Details Back To Catalog Clicked',
} as const;

export type AgentCatalogEntrySource = 'catalog_card' | 'catalog_list' | 'direct_url';

export type AgentCatalogDetailsNavigationState = {
  entrySource: AgentCatalogEntrySource;
  positionIndex?: number;
  hasActiveFilters?: boolean;
  countActiveFilters?: number;
  hasSearchQuery?: boolean;
  resultCount?: number;
};

export const countActiveAgentFilters = (filters: AgentsCatalogFiltersState): number =>
  AGENT_FILTER_KEYS.reduce((count, key) => {
    const values = filters[key];
    return count + (Array.isArray(values) ? values.length : 0);
  }, 0);

/** Display label for a filter value (same pattern as catalog filter getLabel). */
export const getAgentFilterDisplayValue = (filterType: string, filterValue: string): string => {
  if (!(filterType in AGENT_LABEL_MAPPINGS)) {
    return filterValue;
  }
  return AGENT_LABEL_MAPPINGS[filterType][filterValue] || filterValue;
};

/** Diff helper: which single value was added or removed between two filter arrays. */
export const getToggledFilterValue = (
  previousValues: string[] | undefined,
  nextValues: string[],
): string | undefined => {
  const prev = previousValues ?? [];
  const added = nextValues.find((value) => !prev.includes(value));
  if (added) {
    return added;
  }
  return prev.find((value) => !nextValues.includes(value));
};

export const buildAgentDetailsNavigationState = (
  positionIndex: number,
  filters: AgentsCatalogFiltersState,
  searchQuery: string,
  resultCount: number,
): AgentCatalogDetailsNavigationState => {
  const countActiveFilters = countActiveAgentFilters(filters);
  return {
    entrySource: 'catalog_card',
    positionIndex,
    hasActiveFilters: countActiveFilters > 0,
    countActiveFilters,
    hasSearchQuery: searchQuery.trim().length > 0,
    resultCount,
  };
};

export const isAgentCatalogDetailsNavigationState = (
  state: unknown,
): state is AgentCatalogDetailsNavigationState => {
  if (!state || typeof state !== 'object' || !('entrySource' in state)) {
    return false;
  }
  const { entrySource } = state;
  return (
    entrySource === 'catalog_card' || entrySource === 'catalog_list' || entrySource === 'direct_url'
  );
};
