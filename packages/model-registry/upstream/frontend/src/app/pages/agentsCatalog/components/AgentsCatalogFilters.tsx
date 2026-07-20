import * as React from 'react';
import { AgentsCatalogContext } from '~/app/context/agentsCatalog/AgentsCatalogContext';
import { CatalogFilterPanel, useCatalogFilterConfigs } from '~/app/shared/components/catalog';
import {
  AGENT_FILTER_KEYS,
  AGENT_FILTER_CATEGORY_NAMES,
  AGENT_LABEL_MAPPINGS,
} from '~/app/pages/agentsCatalog/const';

const AgentsCatalogFilters: React.FC = () => {
  const { filters, setFilters, filterOptions, filterOptionsLoaded, filterOptionsLoadError } =
    React.useContext(AgentsCatalogContext);

  const onFilterChange = React.useCallback(
    (key: string, values: string[]) => {
      setFilters((prev) => ({ ...prev, [key]: values }));
    },
    [setFilters],
  );

  const filterPanelItems = useCatalogFilterConfigs({
    filterKeys: AGENT_FILTER_KEYS,
    filterNames: AGENT_FILTER_CATEGORY_NAMES,
    filterOptions: filterOptions?.filters,
    selectedFilters: filters,
    onFilterChange,
    labelMappings: AGENT_LABEL_MAPPINGS,
  });

  return (
    <CatalogFilterPanel
      loaded={filterOptionsLoaded}
      loadError={filterOptionsLoadError}
      filters={filterPanelItems}
      testIdPrefix="agent-filter"
    />
  );
};

export default AgentsCatalogFilters;
