import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { useUserInteraction } from '~/concepts/userInteraction';
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
import {
  AGENT_CATALOG_EVENTS,
  buildAgentDetailsNavigationState,
} from '~/app/pages/agentsCatalog/tracking';

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
  const { trackSimpleEvent } = useUserInteraction();
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
  const { items, size, loadMore, hasMore, isLoadingMore } = agents;

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

  const handleLoadMore = React.useCallback(() => {
    const visibleCountBefore = items.length;
    trackSimpleEvent(AGENT_CATALOG_EVENTS.LOAD_MORE_CLICKED, {
      visibleCountBefore,
      visibleCountAfter: Math.min(visibleCountBefore + AGENTS_CATALOG_GALLERY.PAGE_SIZE, size),
      totalAvailable: size,
    });
    loadMore();
  }, [items.length, size, loadMore, trackSimpleEvent]);

  return (
    <CatalogGalleryLayout
      items={items}
      loaded={loaded}
      loadError={agentsLoadError}
      renderCard={(agent, index) => (
        <AgentsCatalogCard
          agent={agent}
          detailsNavigationState={buildAgentDetailsNavigationState(
            index,
            filters,
            searchQuery,
            size,
          )}
        />
      )}
      getItemKey={(agent) => agent.id}
      gridSpans={AGENTS_CATALOG_GRID_SPAN}
      hasMore={hasMore && items.length >= AGENTS_CATALOG_GALLERY.PAGE_SIZE}
      isLoadingMore={isLoadingMore}
      onLoadMore={handleLoadMore}
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
          description="No agent templates match your filters. Adjust your filters and try again."
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
