import type { ModelCatalogAPIState } from '~/app/hooks/modelCatalog/useModelCatalogAPIState';
import type { CatalogContextValue } from '~/app/context/catalogContext/createCatalogContext';
import type {
  McpCatalogFilterOptionsList,
  McpCatalogFiltersState,
} from '~/app/pages/mcpCatalog/types/mcpCatalogFilterOptions';

export type McpCatalogPaginationState = {
  page: number;
  pageSize: number;
  totalItems: number;
};

export type McpCatalogExtension = {
  filters: McpCatalogFiltersState;
  setFilters: (
    filters: McpCatalogFiltersState | ((prev: McpCatalogFiltersState) => McpCatalogFiltersState),
  ) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  namedQuery: string | null;
  setNamedQuery: (query: string | null) => void;
  pagination: McpCatalogPaginationState;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setTotalItems: (totalItems: number) => void;
  mcpApiState: ModelCatalogAPIState;
  emptyCategoryLabels: Set<string>;
  categoriesResolved: boolean;
  reportCategoryEmpty: (label: string, isEmpty: boolean) => void;
  setCategoryCount: (count: number) => void;
};

export type McpCatalogContextType = CatalogContextValue<McpCatalogFilterOptionsList> &
  McpCatalogExtension;
