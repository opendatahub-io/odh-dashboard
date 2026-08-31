import * as React from 'react';
import { SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/ui-core/components/FilterToolbar';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';
import DeployAgentButton from '~/app/components/DeployAgentButton';
import {
  agentRuntimeStatusFilterOptions,
  AgentRuntimeStatusFilter,
  AgentRuntimeStatusFilterOption,
  AgentRuntimesFilterData,
  AgentRuntimesFilterOption,
  agentRuntimesFilterOptions,
} from './const';

const isAgentRuntimeStatusFilter = (value: string): value is AgentRuntimeStatusFilter => {
  switch (value) {
    case AgentRuntimeStatusFilter.Ready:
    case AgentRuntimeStatusFilter.Pending:
    case AgentRuntimeStatusFilter.Failed:
      return true;
    default:
      return false;
  }
};

type AgentRuntimesToolbarProps = {
  namespace?: string;
  scopeSelector?: React.ReactNode;
  filterData: AgentRuntimesFilterData;
  onFilterUpdate: (
    key: AgentRuntimesFilterOption,
    value?: string | AgentRuntimeStatusFilterOption,
  ) => void;
  onDeployAgent: () => void;
  deployMode?: boolean;
  deployActionLabel?: string;
  compactNameFilter?: boolean;
};

const adaptFilterUpdateValue = (
  key: AgentRuntimesFilterOption,
  value?: string | { label: string; value: string },
): string | AgentRuntimeStatusFilterOption | undefined => {
  if (typeof value === 'string') {
    return value || undefined;
  }
  if (key !== AgentRuntimesFilterOption.Status || !value?.value) {
    return undefined;
  }
  const status = value.value;
  if (!isAgentRuntimeStatusFilter(status)) {
    return undefined;
  }
  return { label: status, value: status };
};

const statusSelectOptions: SimpleSelectOption[] = agentRuntimeStatusFilterOptions.map(
  (status): SimpleSelectOption => ({
    key: status,
    label: status,
  }),
);

const AgentRuntimesToolbar: React.FC<AgentRuntimesToolbarProps> = ({
  namespace,
  scopeSelector,
  filterData,
  onFilterUpdate,
  onDeployAgent,
  deployMode = false,
  deployActionLabel,
  compactNameFilter = false,
}) => (
  <>
    {scopeSelector && (
      <ToolbarGroup>
        <ToolbarItem>{scopeSelector}</ToolbarItem>
      </ToolbarGroup>
    )}
    {compactNameFilter ? (
      <ToolbarGroup data-testid="agent-runtimes-table-toolbar">
        <ToolbarItem>
          <SearchInput
            placeholder="Filter by name"
            value={filterData[AgentRuntimesFilterOption.Name] ?? ''}
            onChange={(_event, value) =>
              onFilterUpdate(AgentRuntimesFilterOption.Name, value || undefined)
            }
            onClear={() => onFilterUpdate(AgentRuntimesFilterOption.Name, undefined)}
            aria-label="Filter by name"
            data-testid="agent-runtimes-filter-input"
          />
        </ToolbarItem>
      </ToolbarGroup>
    ) : (
      <FilterToolbar<AgentRuntimesFilterOption>
        data-testid="agent-runtimes-table-toolbar"
        filterOptions={agentRuntimesFilterOptions}
        filterOptionRenders={{
          [AgentRuntimesFilterOption.Name]: ({ onChange, value, ...props }) => (
            <SearchInput
              {...props}
              placeholder="Filter by name"
              value={value ?? ''}
              onChange={(_event, v) => onChange(v)}
              onClear={() => onChange('')}
              aria-label="Filter by name"
              data-testid="agent-runtimes-filter-input"
            />
          ),
          [AgentRuntimesFilterOption.Status]: ({ onChange, value, ...props }) => (
            <SimpleSelect
              {...props}
              value={value ?? ''}
              aria-label="Filter by status"
              placeholder="Select a status"
              options={statusSelectOptions}
              onChange={(selectedValue) => {
                const selectedOption = statusSelectOptions.find(
                  (option) => option.key === selectedValue,
                );
                if (selectedOption) {
                  onChange(selectedValue, selectedOption.label);
                }
              }}
              dataTestId="agent-runtimes-filter-status"
              popperProps={{ maxWidth: undefined }}
            />
          ),
        }}
        filterData={filterData}
        onFilterUpdate={(filterType, value) =>
          onFilterUpdate(filterType, adaptFilterUpdateValue(filterType, value))
        }
      />
    )}
    {deployMode && (
      <ToolbarGroup align={{ default: 'alignEnd' }}>
        <ToolbarItem>
          <DeployAgentButton
            namespace={namespace}
            onDeployAgent={onDeployAgent}
            label={deployActionLabel}
          />
        </ToolbarItem>
      </ToolbarGroup>
    )}
  </>
);

export default AgentRuntimesToolbar;
