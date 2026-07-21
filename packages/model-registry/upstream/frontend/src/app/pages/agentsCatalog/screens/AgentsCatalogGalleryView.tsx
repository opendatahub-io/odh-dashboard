import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { AgentsCatalogContext } from '~/app/context/agentsCatalog/AgentsCatalogContext';
import { useAgentsBySourceLabelWithAPI } from '~/app/hooks/agentsCatalog/useAgentsBySourceLabel';
import {
  AGENTS_CATALOG_GALLERY,
  AGENTS_CATALOG_GRID_SPAN,
  OTHER_AGENTS_DISPLAY_NAME,
} from '~/app/pages/agentsCatalog/const';
import { agentFiltersToFilterQuery } from '~/app/pages/agentsCatalog/utils/agentsCatalogUtils';
import {
  getLabelDisplayName,
  getLabelDescription,
  CatalogGalleryLayout,
  EmptyCatalogState,
} from '~/app/shared/components/catalog';
import AgentsCatalogCard from '~/app/pages/agentsCatalog/components/AgentsCatalogCard';

type AgentsCatalogGalleryViewProps = {
  handleFilterReset: () => void;
  isSingleCategory?: boolean;
  singleCategoryLabel?: string;
};

const AgentsCatalogGalleryView: React.FC<AgentsCatalogGalleryViewProps> = ({
  handleFilterReset,
  isSingleCategory = false,
  singleCategoryLabel,
}) => {
  const {
    agentApiState,
    selectedSourceLabel,
    searchQuery,
    filters,
    catalogLabels,
    catalogLabelsLoaded,
  } = React.useContext(AgentsCatalogContext);

  const filterQuery = React.useMemo(() => agentFiltersToFilterQuery(filters), [filters]);

  const { agents, agentsLoaded, agentsLoadError } = useAgentsBySourceLabelWithAPI(agentApiState, {
    sourceLabel: selectedSourceLabel,
    pageSize: AGENTS_CATALOG_GALLERY.PAGE_SIZE,
    searchQuery,
    filterQuery: filterQuery || undefined,
  });

  const loaded = agentsLoaded && catalogLabelsLoaded;

  const effectiveCategoryLabel = singleCategoryLabel || selectedSourceLabel || '';
  const categoryTitle = isSingleCategory
    ? getLabelDisplayName(
        effectiveCategoryLabel,
        catalogLabels,
        OTHER_AGENTS_DISPLAY_NAME,
        'agents',
      )
    : undefined;
  const categoryDescription = isSingleCategory
    ? getLabelDescription(effectiveCategoryLabel, catalogLabels)
    : undefined;

  return (
    <CatalogGalleryLayout
      items={agents.items}
      loaded={loaded}
      loadError={agentsLoadError}
      renderCard={(agent) => <AgentsCatalogCard agent={agent} />}
      getItemKey={(agent) => agent.id}
      gridSpans={AGENTS_CATALOG_GRID_SPAN}
      hasMore={agents.hasMore && agents.items.length >= AGENTS_CATALOG_GALLERY.PAGE_SIZE}
      isLoadingMore={agents.isLoadingMore}
      onLoadMore={agents.loadMore}
      loadMoreLabel="Load more agents"
      loadingMoreLabel="Loading more agents..."
      loadingLabel="Loading agents..."
      errorTitle="Failed to load agents"
      categoryTitle={categoryTitle}
      categoryDescription={categoryDescription}
      renderEmptyState={() => (
        <EmptyCatalogState
          testid="empty-agents-catalog-state"
          title="No results found"
          headerIcon={SearchIcon}
          description="Adjust your filters and try again."
          primaryAction={
            <Button variant="link" onClick={handleFilterReset}>
              Reset filters
            </Button>
          }
        />
      )}
    />
  );
};

export default AgentsCatalogGalleryView;
