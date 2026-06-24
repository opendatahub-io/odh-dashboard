import * as React from 'react';
import { Button, SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/internal/components/FilterToolbar';

export enum AgentRuntimesFilterOption {
  Name = 'name',
}

export const agentRuntimesFilterOptions: Record<AgentRuntimesFilterOption, string> = {
  [AgentRuntimesFilterOption.Name]: 'Name',
};

type AgentRuntimesToolbarProps = {
  filterText: string;
  onFilterChange: (value: string) => void;
};

const AgentRuntimesToolbar: React.FC<AgentRuntimesToolbarProps> = ({
  filterText,
  onFilterChange,
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
        {/* Deploy agent - functionality to be implemented */}
        <Button variant="primary" data-testid="deploy-agent-button" isDisabled>
          Deploy agent
        </Button>
      </ToolbarItem>
    </ToolbarGroup>
  </FilterToolbar>
);

export default AgentRuntimesToolbar;
