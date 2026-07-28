import React from 'react';
import { AgentsCatalogContext } from '~/app/context/agentsCatalog/AgentsCatalogContext';
import { CatalogAllItemsView } from '~/app/shared/components/catalog';
import AgentsCatalogCategorySection from './AgentsCatalogCategorySection';

type AgentsCatalogAllAgentsViewProps = {
  searchTerm: string;
};

const AgentsCatalogAllAgentsView: React.FC<AgentsCatalogAllAgentsViewProps> = ({ searchTerm }) => {
  const { catalogSources, catalogLabels, setSelectedSourceLabel } =
    React.useContext(AgentsCatalogContext);

  const handleShowMoreCategory = React.useCallback(
    (categoryLabel: string) => {
      setSelectedSourceLabel(categoryLabel);
    },
    [setSelectedSourceLabel],
  );

  return (
    <CatalogAllItemsView
      searchTerm={searchTerm}
      catalogSources={catalogSources}
      catalogLabels={catalogLabels}
      pageSize={4}
      otherSectionKey="other-agents"
      onShowMore={handleShowMoreCategory}
      renderCategorySection={(label, term, pageSize, onShowMore) => (
        <AgentsCatalogCategorySection
          label={label}
          searchTerm={term}
          pageSize={pageSize}
          onShowMore={onShowMore}
        />
      )}
    />
  );
};

export default AgentsCatalogAllAgentsView;
