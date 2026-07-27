import * as React from 'react';
import {
  ApplicationsPage,
  KubeflowDocs,
  ProjectObjectType,
  TitleWithIcon,
  WhosMyAdministrator,
} from 'mod-arch-shared';
import { useThemeContext } from 'mod-arch-kubeflow';
import { useUserInteraction, TrackingOutcome } from '~/concepts/userInteraction';
import { AgentsCatalogContext } from '~/app/context/agentsCatalog/AgentsCatalogContext';
import { hasAgentFiltersApplied } from '~/app/pages/agentsCatalog/utils/agentsCatalogUtils';
import AgentsCatalogFilters from '~/app/pages/agentsCatalog/components/AgentsCatalogFilters';
import { AGENTS_CATALOG_TITLE, AGENTS_CATALOG_DESCRIPTION } from '~/app/pages/agentsCatalog/const';
import { CatalogPageLayout, EmptyCatalogState } from '~/app/shared/components/catalog';
import { AGENT_CATALOG_EVENTS, countActiveAgentFilters } from '~/app/pages/agentsCatalog/tracking';
import AgentsCatalogSourceLabelSelector from './AgentsCatalogSourceLabelSelector';
import AgentsCatalogAllAgentsView from './AgentsCatalogAllAgentsView';
import AgentsCatalogGalleryView from './AgentsCatalogGalleryView';

const AgentsCatalog: React.FC = () => {
  const { trackSimpleEvent, trackFormEvent } = useUserInteraction();
  const {
    searchQuery,
    setSearchQuery,
    clearAllFilters,
    selectedSourceLabel,
    setSelectedSourceLabel,
    filters,
    catalogSources,
    catalogLabels,
    catalogSourcesLoaded,
    emptyCategoryLabels,
    setCategoryCount,
  } = React.useContext(AgentsCatalogContext);
  const { isMUITheme } = useThemeContext();

  const filtersApplied = hasAgentFiltersApplied(filters, searchQuery);
  const isAllAgentsView = selectedSourceLabel === undefined && !filtersApplied;

  const handleSearch = React.useCallback(
    (term: string) => {
      setSearchQuery(term);
      trackFormEvent(AGENT_CATALOG_EVENTS.SEARCH_SUBMITTED, {
        outcome: TrackingOutcome.submit,
        countActiveFilters: countActiveAgentFilters(filters),
      });
    },
    [setSearchQuery, trackFormEvent, filters],
  );

  const handleClearSearch = React.useCallback(() => {
    setSearchQuery('');
  }, [setSearchQuery]);

  const handleResetAllFilters = React.useCallback(() => {
    trackSimpleEvent(AGENT_CATALOG_EVENTS.FILTERS_RESET);
    clearAllFilters();
  }, [trackSimpleEvent, clearAllFilters]);

  return (
    <ApplicationsPage
      noTitle
      title={
        <TitleWithIcon title={AGENTS_CATALOG_TITLE} objectType={ProjectObjectType.agentsCatalog} />
      }
      description={AGENTS_CATALOG_DESCRIPTION}
      empty={false}
      loaded
      provideChildrenPadding
    >
      <CatalogPageLayout
        catalogSources={catalogSources}
        catalogLabels={catalogLabels}
        catalogSourcesLoaded={catalogSourcesLoaded}
        selectedSourceLabel={selectedSourceLabel}
        onSelectSourceLabel={setSelectedSourceLabel}
        isAllItemsView={isAllAgentsView}
        emptyCategoryLabels={emptyCategoryLabels}
        setCategoryCount={setCategoryCount}
        renderEmptyCategoriesState={() => (
          <EmptyCatalogState
            testid="empty-agents-catalog-no-categories"
            title="Configure agent template sources"
            headerIcon={null}
            description={
              isMUITheme
                ? 'There are no agent templates to display. Follow the instructions in the docs below to add agent templates.'
                : 'There are no agent templates to display. Use the OpenShift console to add agent templates to the catalog.'
            }
            primaryAction={isMUITheme ? <KubeflowDocs /> : <WhosMyAdministrator />}
          />
        )}
        renderFilterSidebar={() => <AgentsCatalogFilters />}
        renderToolbar={() => (
          <AgentsCatalogSourceLabelSelector
            searchTerm={searchQuery}
            onSearch={handleSearch}
            onClearSearch={handleClearSearch}
            onResetAllFilters={handleResetAllFilters}
          />
        )}
        renderAllItemsView={() => <AgentsCatalogAllAgentsView searchTerm={searchQuery} />}
        renderGalleryView={(isSingleCategory, singleCategoryLabel) => (
          <AgentsCatalogGalleryView
            handleFilterReset={handleResetAllFilters}
            isSingleCategory={isSingleCategory}
            singleCategoryLabel={singleCategoryLabel}
          />
        )}
      />
    </ApplicationsPage>
  );
};

export default AgentsCatalog;
