import * as React from 'react';
import { ToolbarFilter, ToolbarLabel, ToolbarLabelGroup } from '@patternfly/react-core';
import { AgentsCatalogContext } from '~/app/context/agentsCatalog/AgentsCatalogContext';
import type { AgentFilterCategoryKey } from '~/app/pages/agentsCatalog/types/agentsCatalogFilterOptions';
import {
  AGENT_FILTER_KEYS,
  AGENT_FILTER_CATEGORY_NAMES,
  AGENT_LABEL_MAPPINGS,
} from '~/app/pages/agentsCatalog/const';

const AgentsCatalogActiveFilters: React.FC = () => {
  const { filters, setFilters } = React.useContext(AgentsCatalogContext);

  const handleRemoveFilter = React.useCallback(
    (categoryKey: AgentFilterCategoryKey, valueKey: string) => {
      setFilters((prev) => {
        const current = prev[categoryKey];
        const arr = Array.isArray(current) ? current : [];
        const newValues = arr.filter((v) => v !== valueKey);
        return { ...prev, [categoryKey]: newValues };
      });
    },
    [setFilters],
  );

  const handleClearCategory = React.useCallback(
    (categoryKey: AgentFilterCategoryKey) => {
      setFilters((prev) => ({ ...prev, [categoryKey]: [] }));
    },
    [setFilters],
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
