import * as React from 'react';
import { useUserInteraction } from '~/concepts/userInteraction';
import { AgentsCatalogContext } from '~/app/context/agentsCatalog/AgentsCatalogContext';
import { CatalogFilterPanel, useCatalogFilterConfigs } from '~/app/shared/components/catalog';
import {
  AGENT_FILTER_KEYS,
  AGENT_FILTER_CATEGORY_NAMES,
  AGENT_LABEL_MAPPINGS,
} from '~/app/pages/agentsCatalog/const';
import {
  AGENT_CATALOG_EVENTS,
  countActiveAgentFilters,
  getAgentFilterDisplayValue,
  getToggledFilterValue,
} from '~/app/pages/agentsCatalog/tracking';

const AgentsCatalogFilters: React.FC = () => {
  const { trackSimpleEvent } = useUserInteraction();
  const { filters, setFilters, filterOptions, filterOptionsLoaded, filterOptionsLoadError } =
    React.useContext(AgentsCatalogContext);

  const onFilterChange = React.useCallback(
    (key: string, values: string[]) => {
      const matchedKey = AGENT_FILTER_KEYS.find((filterKey) => filterKey === key);
      const previousValues = matchedKey ? filters[matchedKey] : undefined;
      const toggledValue = getToggledFilterValue(previousValues, values);
      const nextFilters = { ...filters, [key]: values };

      setFilters(nextFilters);

      if (toggledValue) {
        trackSimpleEvent(AGENT_CATALOG_EVENTS.FILTER_APPLIED, {
          filterType: key,
          filterValue: getAgentFilterDisplayValue(key, toggledValue),
          countActiveFilters: countActiveAgentFilters(nextFilters),
        });
      }
    },
    [filters, setFilters, trackSimpleEvent],
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
