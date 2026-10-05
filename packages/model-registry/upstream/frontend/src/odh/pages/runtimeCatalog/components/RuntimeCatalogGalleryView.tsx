import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { CatalogGalleryLayout, EmptyCatalogState } from '~/app/shared/components/catalog';
import { useServingRuntimeList } from '~/odh/hooks/servingRuntimeCatalog/useServingRuntimeList';
import RuntimeCatalogCard from '~/odh/pages/runtimeCatalog/components/RuntimeCatalogCard';
import {
  RUNTIME_CATALOG_GALLERY_PAGE_SIZE,
  RUNTIME_CATALOG_GRID_SPANS,
  type RuntimeCatalogFiltersState,
} from '~/odh/pages/runtimeCatalog/const';
import {
  getRuntimeCatalogCardKey,
  runtimeCatalogFiltersToFilterQuery,
} from '~/odh/pages/runtimeCatalog/utils/runtimeCatalogUtils';

type RuntimeCatalogGalleryViewProps = {
  filters: RuntimeCatalogFiltersState;
  searchQuery: string;
  filterOptionsLoaded: boolean;
  onResetFilters: () => void;
};

const RuntimeCatalogGalleryView: React.FC<RuntimeCatalogGalleryViewProps> = ({
  filters,
  searchQuery,
  filterOptionsLoaded,
  onResetFilters,
}) => {
  const filterQuery = React.useMemo(() => runtimeCatalogFiltersToFilterQuery(filters), [filters]);

  const [runtimeList, runtimesLoaded, runtimesLoadError] = useServingRuntimeList({
    q: searchQuery.trim() || undefined,
    filterQuery: filterQuery || undefined,
    pageSize: RUNTIME_CATALOG_GALLERY_PAGE_SIZE,
  });

  const loaded = filterOptionsLoaded && runtimesLoaded;

  return (
    <CatalogGalleryLayout
      items={runtimeList.items}
      loaded={loaded}
      loadError={runtimesLoadError}
      renderCard={(runtime) => <RuntimeCatalogCard runtime={runtime} />}
      getItemKey={getRuntimeCatalogCardKey}
      gridSpans={RUNTIME_CATALOG_GRID_SPANS}
      loadingLabel="Loading runtime images..."
      errorTitle="Failed to load runtime images"
      renderEmptyState={() => (
        <EmptyCatalogState
          testid="runtime-catalog-empty-state"
          title="No results found"
          headerIcon={SearchIcon}
          description="No runtime images match your filters. Adjust your filters and try again."
          primaryAction={
            <Button variant="link" onClick={onResetFilters}>
              Reset filters
            </Button>
          }
        />
      )}
    />
  );
};

export default RuntimeCatalogGalleryView;
