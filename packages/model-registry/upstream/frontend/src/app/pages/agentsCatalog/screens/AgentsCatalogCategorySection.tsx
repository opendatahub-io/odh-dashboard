import * as React from 'react';
import { useAgentsBySourceLabelWithAPI } from '~/app/hooks/agentsCatalog/useAgentsBySourceLabel';
import useReportCategoryEmpty from '~/app/hooks/useReportCategoryEmpty';
import {
  getLabelDescription,
  getLabelDisplayName,
  CatalogCategorySection,
} from '~/app/shared/components/catalog';
import { AgentsCatalogContext } from '~/app/context/agentsCatalog/AgentsCatalogContext';
import {
  AGENTS_CATALOG_GRID_SPAN,
  OTHER_AGENTS_DISPLAY_NAME,
} from '~/app/pages/agentsCatalog/const';
import AgentsCatalogCard from '~/app/pages/agentsCatalog/components/AgentsCatalogCard';
import { buildAgentDetailsNavigationState } from '~/app/pages/agentsCatalog/tracking';

type AgentsCatalogCategorySectionProps = {
  label: string;
  searchTerm: string;
  pageSize: number;
  onShowMore: (label: string) => void;
};

const AgentsCatalogCategorySection: React.FC<AgentsCatalogCategorySectionProps> = ({
  label,
  searchTerm,
  pageSize,
  onShowMore,
}) => {
  const { agentApiState, catalogLabels, reportCategoryEmpty, filters } =
    React.useContext(AgentsCatalogContext);
  const { agents, agentsLoaded, agentsLoadError } = useAgentsBySourceLabelWithAPI(agentApiState, {
    sourceLabel: label,
    pageSize,
    searchQuery: searchTerm,
  });

  const categoryTitle = getLabelDisplayName(
    label,
    catalogLabels,
    OTHER_AGENTS_DISPLAY_NAME,
    'agents',
  );
  const categoryDescription = getLabelDescription(label, catalogLabels);
  const labelSlug = label.toLowerCase().replace(/\s+/g, '-');

  useReportCategoryEmpty(
    reportCategoryEmpty,
    label,
    agentsLoaded,
    agents.items.length,
    searchTerm,
    agentsLoadError,
  );

  if (agentsLoaded && agents.items.length === 0 && !searchTerm) {
    return null;
  }

  return (
    <CatalogCategorySection
      label={label}
      categoryTitle={categoryTitle}
      categoryDescription={categoryDescription}
      items={agents.items}
      loaded={agentsLoaded}
      loadError={agentsLoadError}
      pageSize={pageSize}
      onShowMore={onShowMore}
      renderCard={(agent, index) => (
        <AgentsCatalogCard
          agent={agent}
          detailsNavigationState={buildAgentDetailsNavigationState(
            index,
            filters,
            searchTerm,
            agents.size,
          )}
        />
      )}
      getItemKey={(agent) => agent.id}
      gridSpans={AGENTS_CATALOG_GRID_SPAN}
      loadingScreenReaderText={`Loading ${label} agents`}
      testIds={{
        title: `agents-category-title-${label}`,
        showMore: `agents-show-all-${labelSlug}`,
        error: `agents-error-state-${label}`,
        skeleton: (index) => `agents-category-skeleton-${labelSlug}-${index}`,
        empty: `empty-agents-catalog-state-${label}`,
      }}
    />
  );
};
export default AgentsCatalogCategorySection;
