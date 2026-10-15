import type { AgentsCatalogFiltersState } from '~/app/pages/agentsCatalog/types/agentsCatalogFilterOptions';
export declare const hasAgentFiltersApplied: (filters: AgentsCatalogFiltersState, searchQuery: string) => boolean;
export declare function agentFiltersToFilterQuery(filters: AgentsCatalogFiltersState): string;
