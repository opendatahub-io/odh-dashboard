import * as React from 'react';
import { SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/internal/components/FilterToolbar';
import DeployAgentButton from '~/app/components/DeployAgentButton';

export enum AgentRuntimesFilterOption {
  Name = 'name',
}

export const agentRuntimesFilterOptions: Record<AgentRuntimesFilterOption, string> = {
  [AgentRuntimesFilterOption.Name]: 'Name',
};

type AgentRuntimesToolbarProps = {
  namespace?: string;
  filterText: string;
  onFilterChange: (value: string) => void;
  onDeployAgent: () => void;
};

const AgentRuntimesToolbar: React.FC<AgentRuntimesToolbarProps> = ({
  namespace,
  filterText,
  onFilterChange,
  onDeployAgent,
}) => (
  <FilterToolbar<AgentRuntimesFilterOption>
    data-testid="agent-runtimes-table-toolbar"
    filterOptions={agentRuntimesFilterOptions}
    filterOptionRenders={{
      [AgentRuntimesFilterOption.Name]: ({ onChange, value }) => (
        <SearchInput
          placeholder="Filter by name"
          value={value ?? ''}
          onChange={(_event, v) => onChange(v)}
          onClear={() => onChange('')}
          aria-label="Filter by name"
          data-testid="agent-runtimes-filter-input"
        />
      ),
    }}
    filterData={{
      [AgentRuntimesFilterOption.Name]: filterText || undefined,
    }}
    onFilterUpdate={(_key, value) => {
      const v = typeof value === 'string' ? value : (value?.value ?? '');
      onFilterChange(v);
    }}
  >
    <ToolbarGroup>
      <ToolbarItem>
        <DeployAgentButton namespace={namespace} onDeployAgent={onDeployAgent} />
      </ToolbarItem>
    </ToolbarGroup>
  </FilterToolbar>
);

export default AgentRuntimesToolbar;
