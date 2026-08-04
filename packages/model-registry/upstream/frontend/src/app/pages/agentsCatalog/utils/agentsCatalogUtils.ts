import type { AgentsCatalogFiltersState } from '~/app/pages/agentsCatalog/types/agentsCatalogFilterOptions';
import { AGENT_FILTER_KEYS } from '~/app/pages/agentsCatalog/const';
import { hasFiltersApplied, stringFiltersToFilterQuery } from '~/app/shared/components/catalog';

export const hasAgentFiltersApplied = (
  filters: AgentsCatalogFiltersState,
  searchQuery: string,
): boolean => hasFiltersApplied(filters, AGENT_FILTER_KEYS, searchQuery);

export function agentFiltersToFilterQuery(filters: AgentsCatalogFiltersState): string {
  return stringFiltersToFilterQuery(filters, {});
}
