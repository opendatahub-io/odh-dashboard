import * as React from 'react';
import { ApplicationsPage, ProjectObjectType, TitleWithIcon } from 'mod-arch-shared';
import { SearchIcon } from '@patternfly/react-icons';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import { useSearchParams } from 'react-router-dom';
import { isModelCatalogBannerExtension } from '~/odh/extension-points';
import ModelCatalogFilters from '~/app/pages/modelCatalog/components/ModelCatalogFilters';
import { ModelCatalogContext } from '~/app/context/modelCatalog/ModelCatalogContext';
import { CategoryName } from '~/app/modelCatalogTypes';
import { useHasVisibleFiltersApplied } from '~/app/hooks/modelCatalog/useHasVisibleFiltersApplied';
import { CatalogPageLayout, EmptyCatalogState } from '~/app/shared/components/catalog';
import { MODEL_CATALOG_TITLE, MODEL_CATALOG_DESCRIPTION } from '~/app/pages/modelCatalog/const';
import { useUserInteraction } from '~/concepts/userInteraction';
import {
  MODEL_CATALOG_EVENTS,
  ModelCatalogCategorySelectedProperties,
  ModelCatalogFiltersResetProperties,
  ModelCatalogFiltersResetSource,
  resetDetailsViewedTracking,
  toCategorySelectedValue,
} from '~/app/pages/modelCatalog/tracking';
import ModelCatalogSourceLabelSelectorNavigator from './ModelCatalogSourceLabelSelectorNavigator';
import ModelCatalogAllModelsView from './ModelCatalogAllModelsView';
import ModelCatalogGalleryView from './ModelCatalogGalleryView';

const ModelCatalog: React.FC = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [pendingSearchTracking, setPendingSearchTracking] = React.useState(false);

  React.useEffect(() => {
    resetDetailsViewedTracking();
  }, []);
  const {
    selectedSourceLabel,
    setSelectedSourceLabel,
    clearAllFilters,
    catalogSources,
    catalogLabels,
    catalogSourcesLoaded,
    emptyCategoryLabels,
    setCategoryCount,
    pendingFilterAppliedTracking,
    pendingVramFilterAppliedTracking,
    pendingPerformanceFilterAppliedTracking,
  } = React.useContext(ModelCatalogContext);
  const { trackSimpleEvent } = useUserInteraction();
  const filtersApplied = useHasVisibleFiltersApplied();

  // Keep Gallery mounted while search / filter tracking is still pending.
  const isAllModelsView =
    selectedSourceLabel === CategoryName.allModels &&
    !searchTerm &&
    !filtersApplied &&
    !pendingSearchTracking &&
    !pendingFilterAppliedTracking &&
    !pendingVramFilterAppliedTracking &&
    !pendingPerformanceFilterAppliedTracking;

  const bannerExtensions = useExtensions(isModelCatalogBannerExtension);
  const [searchParams, setSearchParams] = useSearchParams();

  React.useEffect(() => {
    const validatedParam = searchParams.get('validated');
    if (validatedParam === 'true') {
      setSearchParams({});
      const validatedLabel = 'Red Hat AI validated';
      setSelectedSourceLabel(validatedLabel);
      const properties: ModelCatalogCategorySelectedProperties = {
        category: toCategorySelectedValue(validatedLabel),
      };
      trackSimpleEvent(MODEL_CATALOG_EVENTS.CATEGORY_SELECTED, properties);
    }
  }, [searchParams, setSearchParams, setSelectedSourceLabel, trackSimpleEvent]);

  const handleSearch = React.useCallback((term: string) => {
    setSearchTerm(term);
    setPendingSearchTracking(true);
  }, []);

  const handleClearSearch = React.useCallback(() => {
    if (searchTerm.trim().length > 0) {
      setPendingSearchTracking(true);
    }
    setSearchTerm('');
  }, [searchTerm]);

  const handleFilterReset = React.useCallback(
    (source: ModelCatalogFiltersResetSource) => {
      setPendingSearchTracking(false);
      setSearchTerm('');
      clearAllFilters();
      // Fire on click — Gallery often unmounts when All models returns.
      const properties: ModelCatalogFiltersResetProperties = { source };
      trackSimpleEvent(MODEL_CATALOG_EVENTS.FILTERS_RESET, properties);
    },
    [clearAllFilters, trackSimpleEvent],
  );

  const handleSearchTrackingFired = React.useCallback(() => {
    setPendingSearchTracking(false);
  }, []);

  return (
    <ApplicationsPage
      noTitle // rendered inside a TabRoutePage which provides the title
      title={
        <TitleWithIcon title={MODEL_CATALOG_TITLE} objectType={ProjectObjectType.modelCatalog} />
      }
      description={MODEL_CATALOG_DESCRIPTION}
      empty={false}
      loaded
      provideChildrenPadding
    >
      {bannerExtensions.map((extension) => (
        <LazyCodeRefComponent
          key={extension.properties.id}
          component={extension.properties.component}
        />
      ))}
      <CatalogPageLayout
        catalogSources={catalogSources}
        catalogLabels={catalogLabels}
        catalogSourcesLoaded={catalogSourcesLoaded}
        selectedSourceLabel={selectedSourceLabel}
        onSelectSourceLabel={setSelectedSourceLabel}
        isAllItemsView={isAllModelsView}
        emptyCategoryLabels={emptyCategoryLabels}
        setCategoryCount={setCategoryCount}
        renderEmptyCategoriesState={() => (
          <EmptyCatalogState
            testid="empty-model-catalog-no-categories"
            title="No models available"
            headerIcon={SearchIcon}
            description="There are no model categories available. Configure model sources in settings to get started."
          />
        )}
        renderFilterSidebar={() => <ModelCatalogFilters />}
        renderToolbar={() => (
          <ModelCatalogSourceLabelSelectorNavigator
            searchTerm={searchTerm}
            onSearch={handleSearch}
            onClearSearch={handleClearSearch}
            onResetAllFilters={() => handleFilterReset('toolbar')}
          />
        )}
        renderAllItemsView={() => <ModelCatalogAllModelsView searchTerm={searchTerm} />}
        renderGalleryView={(isSingleCategory, singleCategoryLabel) => (
          <ModelCatalogGalleryView
            searchTerm={searchTerm}
            handleFilterReset={() => handleFilterReset('emptyState')}
            isSingleCategory={isSingleCategory}
            singleCategoryLabel={singleCategoryLabel}
            pendingSearchTracking={pendingSearchTracking}
            onSearchTrackingFired={handleSearchTrackingFired}
          />
        )}
      />
    </ApplicationsPage>
  );
};

export default ModelCatalog;
