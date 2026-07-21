import * as React from 'react';
import { ToolbarFilter, ToolbarLabel, ToolbarLabelGroup } from '@patternfly/react-core';
import { useUserInteraction } from '~/concepts/userInteraction';
import { AgentsCatalogContext } from '~/app/context/agentsCatalog/AgentsCatalogContext';
import type { AgentFilterCategoryKey } from '~/app/pages/agentsCatalog/types/agentsCatalogFilterOptions';
import {
  AGENT_FILTER_KEYS,
  AGENT_FILTER_CATEGORY_NAMES,
  AGENT_LABEL_MAPPINGS,
} from '~/app/pages/agentsCatalog/const';
import {
  AGENT_CATALOG_EVENTS,
  countActiveAgentFilters,
  getAgentFilterDisplayValue,
} from '~/app/pages/agentsCatalog/tracking';

const AgentsCatalogActiveFilters: React.FC = () => {
  const { trackSimpleEvent } = useUserInteraction();
  const { filters, setFilters } = React.useContext(AgentsCatalogContext);

  const handleRemoveFilter = React.useCallback(
    (categoryKey: AgentFilterCategoryKey, valueKey: string) => {
      const current = filters[categoryKey];
      const arr = Array.isArray(current) ? current : [];
      const nextFilters = { ...filters, [categoryKey]: arr.filter((v) => v !== valueKey) };
      setFilters(nextFilters);
      trackSimpleEvent(AGENT_CATALOG_EVENTS.FILTER_APPLIED, {
        filterType: categoryKey,
        filterValue: getAgentFilterDisplayValue(categoryKey, valueKey),
        countActiveFilters: countActiveAgentFilters(nextFilters),
      });
    },
    [filters, setFilters, trackSimpleEvent],
  );

  const handleClearCategory = React.useCallback(
    (categoryKey: AgentFilterCategoryKey) => {
      const current = filters[categoryKey];
      const arr = Array.isArray(current) ? current : [];
      const nextFilters = { ...filters, [categoryKey]: [] };
      setFilters(nextFilters);
      arr.forEach((valueKey) => {
        trackSimpleEvent(AGENT_CATALOG_EVENTS.FILTER_APPLIED, {
          filterType: categoryKey,
          filterValue: getAgentFilterDisplayValue(categoryKey, valueKey),
          countActiveFilters: countActiveAgentFilters(nextFilters),
        });
      });
    },
    [filters, setFilters, trackSimpleEvent],
  );

  return (
    <>
      {AGENT_FILTER_KEYS.map((filterKey) => {
        const filterValue = filters[filterKey];
        const values = Array.isArray(filterValue) ? filterValue : [];
        const hasValue = values.length > 0;
        const labelMapping = AGENT_LABEL_MAPPINGS[filterKey];

        const labels: ToolbarLabel[] = hasValue
          ? values.map((value) => ({
              key: value,
              node: (
                <span data-testid={`agent-filter-chip-${filterKey}-${value}`}>
                  {labelMapping[value] || value}
                </span>
              ),
            }))
          : [];

        const categoryLabelGroup: ToolbarLabelGroup = {
          key: filterKey,
          name: AGENT_FILTER_CATEGORY_NAMES[filterKey],
        };

        return (
          <ToolbarFilter
            key={filterKey}
            categoryName={categoryLabelGroup}
            labels={labels}
            deleteLabel={(_, label) => {
              const labelKey = typeof label === 'string' ? label : label.key;
              handleRemoveFilter(filterKey, labelKey);
            }}
            deleteLabelGroup={() => handleClearCategory(filterKey)}
            data-testid={`agent-filter-container-${filterKey}`}
          >
            {null}
          </ToolbarFilter>
        );
      })}
    </>
  );
};

export default AgentsCatalogActiveFilters;
