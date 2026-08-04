import type { ModelCatalogAPIState } from '~/app/hooks/modelCatalog/useModelCatalogAPIState';
import type { CatalogContextValue } from '~/app/context/catalogContext/createCatalogContext';
import type {
  AgentsCatalogFilterOptionsList,
  AgentsCatalogFiltersState,
} from '~/app/pages/agentsCatalog/types/agentsCatalogFilterOptions';

export type AgentsCatalogPaginationState = {
  page: number;
  pageSize: number;
  totalItems: number;
};

export type AgentsCatalogExtension = {
  filters: AgentsCatalogFiltersState;
  setFilters: (
    filters:
      | AgentsCatalogFiltersState
      | ((prev: AgentsCatalogFiltersState) => AgentsCatalogFiltersState),
  ) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  namedQuery: string | null;
  setNamedQuery: (query: string | null) => void;
  pagination: AgentsCatalogPaginationState;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setTotalItems: (totalItems: number) => void;
  agentApiState: ModelCatalogAPIState;
  emptyCategoryLabels: Set<string>;
  categoriesResolved: boolean;
  reportCategoryEmpty: (label: string, isEmpty: boolean) => void;
  setCategoryCount: (count: number) => void;
};

export type AgentsCatalogContextType = CatalogContextValue<AgentsCatalogFilterOptionsList> &
  AgentsCatalogExtension;
