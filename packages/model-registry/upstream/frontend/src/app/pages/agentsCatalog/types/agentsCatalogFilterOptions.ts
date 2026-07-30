import type { CatalogFilterStringOption } from '~/app/shared/components/catalog';

export type AgentFilterCategoryKey = 'framework';

export type AgentsCatalogFiltersState = {
  [K in AgentFilterCategoryKey]?: string[];
};

export type AgentsCatalogFilterOptions = {
  [key in AgentFilterCategoryKey]?: CatalogFilterStringOption;
};

export type AgentsCatalogFilterOptionsList = {
  filters?: AgentsCatalogFilterOptions;
};
