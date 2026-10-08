import * as React from 'react';
import { ApplicationsPage } from 'mod-arch-shared';
import { useQueryParamNamespaces } from 'mod-arch-core';
import {
  CatalogActiveFilters,
  CatalogPageLayout,
  CatalogSourceLabelSelector,
  EmptyCatalogState,
} from '~/app/shared/components/catalog';
import useModelCatalogAPIState from '~/app/hooks/modelCatalog/useModelCatalogAPIState';
import { useCatalogSources } from '~/app/hooks/modelCatalog/useCatalogSources';
import { useCatalogLabels } from '~/app/hooks/modelCatalog/useCatalogLabels';
import { URL_PREFIX, BFF_API_VERSION } from '~/app/utilities/const';
import { useServingRuntimeFilterOptionList } from '~/odh/hooks/servingRuntimeCatalog/useServingRuntimeFilterOptionList';
import RuntimeCatalogFilters from '~/odh/pages/runtimeCatalog/components/RuntimeCatalogFilters';
import RuntimeCatalogGalleryView from '~/odh/pages/runtimeCatalog/components/RuntimeCatalogGalleryView';
import {
  RUNTIME_CATALOG_FILTER_CATEGORY_NAMES,
  RUNTIME_CATALOG_FILTER_KEYS,
  type RuntimeCatalogFiltersState,
} from '~/odh/pages/runtimeCatalog/const';
import { hasRuntimeCatalogFiltersApplied } from '~/odh/pages/runtimeCatalog/utils/runtimeCatalogUtils';

const MODEL_CATALOG_PATH = `${URL_PREFIX}/api/${BFF_API_VERSION}/model_catalog`;

const RuntimeCatalogView: React.FC = () => {
  const [filters, setFilters] = React.useState<RuntimeCatalogFiltersState>({});
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedSourceLabel, setSelectedSourceLabel] = React.useState<string | undefined>(
    undefined,
  );
  const [filterOptions, filterOptionsLoaded, filterOptionsLoadError] =
    useServingRuntimeFilterOptionList();

  const queryParams = useQueryParamNamespaces();
  const runtimeListParams = React.useMemo(() => ({ assetType: 'serving_runtimes' as const }), []);
  const [apiStateModelCatalog] = useModelCatalogAPIState(MODEL_CATALOG_PATH, queryParams);
  const [catalogSources, catalogSourcesLoaded] = useCatalogSources(
    apiStateModelCatalog,
    runtimeListParams,
  );
  const [catalogLabels] = useCatalogLabels(apiStateModelCatalog, runtimeListParams);

  const pageTitle = React.useMemo(() => {
    const { items } = catalogSources;
    return items && items.length > 0 ? items[0].name : 'Runtime image library';
  }, [catalogSources]);

  const pageDescription = React.useMemo(
    () =>
      catalogLabels.items[0]?.description ??
      'Browse container images and templates you can install as serving runtimes on this cluster.',
    [catalogLabels],
  );

  const handleFilterChange = React.useCallback((key: string, values: string[]) => {
    setFilters((prev) => ({ ...prev, [key]: values }));
  }, []);

  const handleResetFilters = React.useCallback(() => {
    setFilters({});
    setSearchQuery('');
  }, []);

  const hasFiltersApplied = hasRuntimeCatalogFiltersApplied(filters, searchQuery);

  return (
    <ApplicationsPage
      noTitle
      title={pageTitle}
      description={pageDescription}
      empty={false}
      loaded
      provideChildrenPadding
    >
      <div data-testid="runtime-catalog-page">
        <CatalogPageLayout
          catalogSources={catalogSources}
          catalogLabels={catalogLabels}
          catalogSourcesLoaded={catalogSourcesLoaded}
          selectedSourceLabel={selectedSourceLabel}
          onSelectSourceLabel={setSelectedSourceLabel}
          isAllItemsView={selectedSourceLabel === undefined && !hasFiltersApplied}
          renderEmptyCategoriesState={() => (
            <EmptyCatalogState
              testid="empty-runtime-catalog-no-categories"
              title="No runtime sources configured"
              headerIcon={null}
              description="There are no runtime image sources to display."
            />
          )}
          renderFilterSidebar={() => (
            <RuntimeCatalogFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              filterOptions={filterOptions}
              filterOptionsLoaded={filterOptionsLoaded}
              filterOptionsLoadError={filterOptionsLoadError}
            />
          )}
          renderToolbar={() => (
            <CatalogSourceLabelSelector
              searchTerm={searchQuery}
              onSearch={setSearchQuery}
              onClearSearch={() => setSearchQuery('')}
              onResetAllFilters={handleResetFilters}
              hasFiltersApplied={hasFiltersApplied}
              searchPlaceholder="Search by name or description"
              searchInputTestId="runtime-catalog-search-input"
              searchButtonTestId="runtime-catalog-search-button"
              renderActiveFilters={() => (
                <CatalogActiveFilters
                  filterKeys={[...RUNTIME_CATALOG_FILTER_KEYS]}
                  categoryNames={RUNTIME_CATALOG_FILTER_CATEGORY_NAMES}
                  filters={filters}
                  setFilters={setFilters}
                  testIdPrefix="runtime-catalog-filter"
                />
              )}
            />
          )}
          renderAllItemsView={() => (
            <RuntimeCatalogGalleryView
              selectedSourceLabel={selectedSourceLabel}
              filters={filters}
              searchQuery={searchQuery}
              filterOptionsLoaded={filterOptionsLoaded}
              onResetFilters={handleResetFilters}
            />
          )}
          renderGalleryView={() => (
            <RuntimeCatalogGalleryView
              selectedSourceLabel={selectedSourceLabel}
              filters={filters}
              searchQuery={searchQuery}
              filterOptionsLoaded={filterOptionsLoaded}
              onResetFilters={handleResetFilters}
            />
          )}
        />
      </div>
    </ApplicationsPage>
  );
};

export default RuntimeCatalogView;
