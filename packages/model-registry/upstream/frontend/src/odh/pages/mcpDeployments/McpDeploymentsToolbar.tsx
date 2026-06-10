import * as React from 'react';
import { SearchInput, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';

type McpDeploymentsToolbarProps = {
  filterText: string;
  onFilterChange: (value: string) => void;
  onClearFilters: () => void;
};

const McpDeploymentsToolbar: React.FC<McpDeploymentsToolbarProps> = ({
  filterText,
  onFilterChange,
  onClearFilters,
}) => (
  <Toolbar data-testid="mcp-deployments-table-toolbar" clearAllFilters={onClearFilters}>
    <ToolbarContent>
      <ToolbarItem>
        <SearchInput
          placeholder="Filter by name or MCP server"
          value={filterText}
          onChange={(_event, value) => onFilterChange(value)}
          onClear={() => onClearFilters()}
          data-testid="mcp-deployments-filter-input"
        />
      </ToolbarItem>
    </ToolbarContent>
  </Toolbar>
);

export default McpDeploymentsToolbar;
