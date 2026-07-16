import * as React from 'react';
import { AgentsCatalogContext } from '~/app/context/agentsCatalog/AgentsCatalogContext';
import { CatalogSourceLabelToggle, getLabelDisplayName } from '~/app/shared/components/catalog';
import { OTHER_AGENTS_DISPLAY_NAME } from '~/app/pages/agentsCatalog/const';

const ALL_AGENTS_LABEL = 'All agents';

const AgentsCatalogSourceLabelBlocks: React.FC = () => {
  const {
    catalogSources,
    catalogLabels,
    selectedSourceLabel,
    setSelectedSourceLabel,
    emptyCategoryLabels,
    categoriesResolved,
  } = React.useContext(AgentsCatalogContext);

  const getLabelDisplayNameForAgents = React.useCallback(
    (label: string) =>
      getLabelDisplayName(label, catalogLabels, OTHER_AGENTS_DISPLAY_NAME, 'agents'),
    [catalogLabels],
  );

  if (!categoriesResolved) {
    return null;
  }

  return (
    <CatalogSourceLabelToggle
      catalogSources={catalogSources}
      catalogLabels={catalogLabels}
      selectedSourceLabel={selectedSourceLabel}
      onSelectSourceLabel={setSelectedSourceLabel}
      allBlockLabel={undefined}
      allBlockDisplayName={ALL_AGENTS_LABEL}
      emptyCategoryLabels={emptyCategoryLabels}
      testId="agents-catalog-category-toggle"
      ariaLabel="Agent category selection"
      hideWhenSingleCategory
      getLabelDisplayNameOverride={getLabelDisplayNameForAgents}
      getTestId={(blockId) => `agents-category-${blockId}`}
    />
  );
};

export default AgentsCatalogSourceLabelBlocks;
