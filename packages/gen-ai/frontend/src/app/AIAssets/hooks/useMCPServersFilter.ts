import * as React from 'react';
import { MCPServer } from '~/app/types';
import { MCPFilterOptions } from '~/app/AIAssets/data/mcpFilterOptions';

type FilterData = Record<string, string | undefined>;

const useMCPServersFilter = (
  servers: MCPServer[],
): {
  filterData: FilterData;
  onFilterUpdate: (filterType: string, value?: string) => void;
  onClearFilters: () => void;
  filteredServers: MCPServer[];
} => {
  const [filterData, setFilterData] = React.useState<FilterData>({
    [MCPFilterOptions.NAME]: undefined,
    [MCPFilterOptions.KEYWORD]: undefined,
    [MCPFilterOptions.DESCRIPTION]: undefined,
  });

  const onFilterUpdate = React.useCallback((filterType: string, value?: string) => {
    setFilterData((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  }, []);

  const onClearFilters = React.useCallback(() => {
    setFilterData({
      [MCPFilterOptions.NAME]: undefined,
      [MCPFilterOptions.KEYWORD]: undefined,
      [MCPFilterOptions.DESCRIPTION]: undefined,
    });
  }, []);

  const filteredServers = React.useMemo(
    () =>
      servers.filter((server) => {
        // Filter by name
        const nameValue = filterData[MCPFilterOptions.NAME];
        if (nameValue) {
          if (!server.name.toLowerCase().includes(nameValue.toLowerCase())) {
            return false;
          }
        }

        // Filter by keyword (searches in name and description)
        const keywordValue = filterData[MCPFilterOptions.KEYWORD];
        if (keywordValue) {
          const searchText = `${server.name} ${server.description}`.toLowerCase();
          if (!searchText.includes(keywordValue.toLowerCase())) {
            return false;
          }
        }

        // Filter by description
        const descriptionValue = filterData[MCPFilterOptions.DESCRIPTION];
        if (descriptionValue) {
          if (!server.description.toLowerCase().includes(descriptionValue.toLowerCase())) {
            return false;
          }
        }

        return true;
      }),
    [servers, filterData],
  );

  return {
    filterData,
    onFilterUpdate,
    onClearFilters,
    filteredServers,
  };
};

export default useMCPServersFilter;
