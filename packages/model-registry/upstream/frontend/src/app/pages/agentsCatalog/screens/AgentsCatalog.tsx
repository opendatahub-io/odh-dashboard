import * as React from 'react';
import { ApplicationsPage, ProjectObjectType, TitleWithIcon } from 'mod-arch-shared';
import { SearchIcon } from '@patternfly/react-icons';
import { AgentsCatalogContext } from '~/app/context/agentsCatalog/AgentsCatalogContext';
import { hasAgentFiltersApplied } from '~/app/pages/agentsCatalog/utils/agentsCatalogUtils';
import AgentsCatalogFilters from '~/app/pages/agentsCatalog/components/AgentsCatalogFilters';
import { AGENTS_CATALOG_TITLE, AGENTS_CATALOG_DESCRIPTION } from '~/app/pages/agentsCatalog/const';
import { CatalogPageLayout, EmptyCatalogState } from '~/app/shared/components/catalog';
import AgentsCatalogSourceLabelSelector from './AgentsCatalogSourceLabelSelector';
import AgentsCatalogAllAgentsView from './AgentsCatalogAllAgentsView';
import AgentsCatalogGalleryView from './AgentsCatalogGalleryView';

const AgentsCatalog: React.FC = () => {
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

  const filtersApplied = hasAgentFiltersApplied(filters, searchQuery);
  const isAllAgentsView = selectedSourceLabel === undefined && !filtersApplied;

  const handleSearch = React.useCallback(
    (term: string) => {
      setSearchQuery(term);
    },
    [setSearchQuery],
  );

  const handleClearSearch = React.useCallback(() => {
    setSearchQuery('');
  }, [setSearchQuery]);

  const handleResetAllFilters = React.useCallback(() => {
    clearAllFilters();
  }, [clearAllFilters]);

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
            title="No agents available"
            headerIcon={SearchIcon}
            description="There are no agent categories available. Configure sources in settings to get started."
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
