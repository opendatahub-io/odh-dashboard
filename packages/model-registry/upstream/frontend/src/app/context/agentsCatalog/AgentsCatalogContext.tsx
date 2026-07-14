import * as React from 'react';
import { useQueryParamNamespaces } from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import {
  createCatalogContext,
  CatalogCommonData,
  CatalogProviderState,
} from '~/app/context/catalogContext/createCatalogContext';
import useModelCatalogAPIState from '~/app/hooks/modelCatalog/useModelCatalogAPIState';
import { useCatalogSources } from '~/app/hooks/modelCatalog/useCatalogSources';
import { useCatalogLabels } from '~/app/hooks/modelCatalog/useCatalogLabels';
import { useAgentFilterOptionListWithAPI } from '~/app/hooks/agentsCatalog/useAgentFilterOptionList';
import useEmptyCategoryTracking from '~/app/hooks/useEmptyCategoryTracking';
import type {
  AgentsCatalogFiltersState,
  AgentsCatalogFilterOptionsList,
} from '~/app/pages/agentsCatalog/types/agentsCatalogFilterOptions';
import { useAgentsUrlSync } from '~/app/pages/agentsCatalog/hooks/useAgentsUrlSync';
import type { AgentsCatalogExtension, AgentsCatalogPaginationState } from './types';

export type {
  AgentsCatalogContextType,
  AgentsCatalogExtension,
  AgentsCatalogPaginationState,
} from './types';
export type { AgentsCatalogFiltersState } from '~/app/pages/agentsCatalog/types/agentsCatalogFilterOptions';

const MODEL_CATALOG_PATH = `${URL_PREFIX}/api/${BFF_API_VERSION}/model_catalog`;
const AGENT_CATALOG_PATH = `${URL_PREFIX}/api/${BFF_API_VERSION}/agent_catalog`;

const defaultPagination: AgentsCatalogPaginationState = {
  page: 1,
  pageSize: 10,
  totalItems: 0,
};

function useAgentsCatalogSetup(providerState: CatalogProviderState) {
  const queryParams = useQueryParamNamespaces();
  const [apiStateModelCatalog] = useModelCatalogAPIState(MODEL_CATALOG_PATH, queryParams);
  const [apiStateAgentCatalog] = useModelCatalogAPIState(AGENT_CATALOG_PATH, queryParams);

  const agentListParams = React.useMemo(() => ({ assetType: 'agents' as const }), []);
  const [catalogSources, catalogSourcesLoaded, catalogSourcesLoadError] = useCatalogSources(
    apiStateModelCatalog,
    agentListParams,
  );
  const [catalogLabels, catalogLabelsLoaded, catalogLabelsLoadError] = useCatalogLabels(
    apiStateModelCatalog,
    agentListParams,
  );
  const [filterOptions, filterOptionsLoaded, filterOptionsLoadError] =
    useAgentFilterOptionListWithAPI(apiStateAgentCatalog);

  const { initialState, syncToUrl } = useAgentsUrlSync();

  const [filters, setFilters] = React.useState<AgentsCatalogFiltersState>(initialState.filters);
  const [searchQuery, setSearchQuery] = React.useState(initialState.searchQuery);
  const [namedQuery, setNamedQuery] = React.useState<string | null>(null);
  const [pagination, setPaginationState] =
    React.useState<AgentsCatalogPaginationState>(defaultPagination);

  const { setSelectedSourceLabel } = providerState;
  const { emptyCategoryLabels, categoriesResolved, reportCategoryEmpty, setCategoryCount } =
    useEmptyCategoryTracking();

  // ponytail: skip first syncToUrl to avoid interfering with <Navigate replace> redirect
  const hasMounted = React.useRef(false);

  React.useEffect(() => {
    setSelectedSourceLabel(initialState.selectedSourceLabel);
  }, [setSelectedSourceLabel, initialState.selectedSourceLabel]);

  React.useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    syncToUrl({
      searchQuery,
      filters,
      selectedSourceLabel: providerState.selectedSourceLabel,
    });
  }, [searchQuery, filters, providerState.selectedSourceLabel, syncToUrl]);

  const setPage = React.useCallback((page: number) => {
    setPaginationState((prev) => ({ ...prev, page }));
  }, []);

  const setPageSize = React.useCallback((pageSize: number) => {
    setPaginationState((prev) => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const setTotalItems = React.useCallback((totalItems: number) => {
    setPaginationState((prev) => ({ ...prev, totalItems }));
  }, []);

  const clearAllFilters = React.useCallback(() => {
    setSearchQuery('');
    setFilters({});
    setNamedQuery(null);
  }, []);

  const catalogData = React.useMemo<CatalogCommonData<AgentsCatalogFilterOptionsList>>(
    () => ({
      catalogSources,
      catalogSourcesLoaded,
      catalogSourcesLoadError,
      catalogLabels,
      catalogLabelsLoaded,
      catalogLabelsLoadError,
      filterOptions,
      filterOptionsLoaded,
      filterOptionsLoadError,
    }),
    [
      catalogSources,
      catalogSourcesLoaded,
      catalogSourcesLoadError,
      catalogLabels,
      catalogLabelsLoaded,
      catalogLabelsLoadError,
      filterOptions,
      filterOptionsLoaded,
      filterOptionsLoadError,
    ],
  );

  const extension = React.useMemo(
    () => ({
      filters,
      setFilters,
      searchQuery,
      setSearchQuery,
      namedQuery,
      setNamedQuery,
      pagination,
      setPage,
      setPageSize,
      setTotalItems,
      clearAllFilters,
      agentApiState: apiStateAgentCatalog,
      emptyCategoryLabels,
      categoriesResolved,
      reportCategoryEmpty,
      setCategoryCount,
    }),
    [
      apiStateAgentCatalog,
      filters,
      searchQuery,
      namedQuery,
      pagination,
      setPage,
      setPageSize,
      setTotalItems,
      clearAllFilters,
      emptyCategoryLabels,
      categoriesResolved,
      reportCategoryEmpty,
      setCategoryCount,
    ],
  );

  return { catalogData, extension };
}

const {
  Context: AgentsCatalogContext,
  Provider: AgentsCatalogContextProvider,
  useContext: useAgentsCatalogContext,
} = createCatalogContext<AgentsCatalogFilterOptionsList, AgentsCatalogExtension>({
  displayName: 'AgentsCatalogContextProvider',
  useSetup: useAgentsCatalogSetup,
});

export { AgentsCatalogContext, AgentsCatalogContextProvider, useAgentsCatalogContext };
