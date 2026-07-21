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
      let toggledValue: string | undefined;
      let countActiveFilters = 0;

      setFilters((prev) => {
        const matchedKey = AGENT_FILTER_KEYS.find((filterKey) => filterKey === key);
        const previousValues = matchedKey ? prev[matchedKey] : undefined;
        const previousList = Array.isArray(previousValues) ? previousValues : undefined;
        toggledValue = getToggledFilterValue(previousList, values);
        const nextFilters = { ...prev, [key]: values };
        countActiveFilters = countActiveAgentFilters(nextFilters);
        return nextFilters;
      });

      // Sidebar checkbox toggle only — chip clear / reset are not FILTER_APPLIED.
      if (toggledValue) {
        trackSimpleEvent(AGENT_CATALOG_EVENTS.FILTER_APPLIED, {
          filterType: key,
          filterValue: getAgentFilterDisplayValue(key, toggledValue),
          countActiveFilters,
        });
      }
    },
    [setFilters, trackSimpleEvent],
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
