import * as React from 'react';
import { SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/internal/components/FilterToolbar';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/internal/components/SimpleSelect';
import DeployAgentButton from '~/app/components/DeployAgentButton';
import {
  agentRuntimeStatusFilterOptions,
  AgentRuntimesFilterData,
  AgentRuntimesFilterOption,
  agentRuntimesFilterOptions,
} from './const';

type AgentRuntimesToolbarProps = {
  namespace?: string;
  filterData: AgentRuntimesFilterData;
  onFilterUpdate: (
    key: AgentRuntimesFilterOption,
    value?: string | { label: string; value: string },
  ) => void;
  onDeployAgent: () => void;
};

const statusSelectOptions: SimpleSelectOption[] = agentRuntimeStatusFilterOptions.map(
  (status): SimpleSelectOption => ({
    key: status,
    label: status,
  }),
);

const AgentRuntimesToolbar: React.FC<AgentRuntimesToolbarProps> = ({
  namespace,
  filterData,
  onFilterUpdate,
  onDeployAgent,
}) => (
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
      [AgentRuntimesFilterOption.Project]: ({ onChange, value, ...props }) => (
        <SearchInput
          {...props}
          placeholder="Filter by project"
          value={value ?? ''}
          onChange={(_event, v) => onChange(v)}
          onClear={() => onChange('')}
          aria-label="Filter by project"
          data-testid="agent-runtimes-filter-project-input"
        />
      ),
      [AgentRuntimesFilterOption.Status]: ({ value, onChange }) => (
        <SimpleSelect
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
    onFilterUpdate={onFilterUpdate}
  >
    <ToolbarGroup>
      <ToolbarItem>
        <DeployAgentButton namespace={namespace} onDeployAgent={onDeployAgent} />
      </ToolbarItem>
    </ToolbarGroup>
  </FilterToolbar>
);

export default AgentRuntimesToolbar;
