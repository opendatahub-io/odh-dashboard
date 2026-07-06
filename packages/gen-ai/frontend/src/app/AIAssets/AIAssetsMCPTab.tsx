import * as React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import useFetchMCPServers from '~/app/hooks/useFetchMCPServers';
import useMCPServerStatuses from '~/app/hooks/useMCPServerStatuses';
import MCPServersTable from '~/app/AIAssets/components/mcp/MCPServersTable';
import NoData from '~/app/EmptyStates/NoData';

/**
 * MCP tab component using hooks directly.
 * Loads MCP servers and checks their statuses when the tab is accessed.
 */
const AIAssetsMCPTab: React.FC = () => {
  const { data: servers = [], loaded, error } = useFetchMCPServers();
  const { serverStatuses, statusesLoading } = useMCPServerStatuses(servers, loaded);

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (error) {
    return (
      <NoData
        title="No MCP configuration found"
        description="This playground does not have an MCP configuration. Contact your cluster administrator to add MCP servers."
      />
    );
  }

  if (servers.length === 0) {
    return (
      <NoData
        title="No valid MCP servers available"
        description="An MCP configuration exists, but no valid servers were found. Contact your cluster administrator to update the configuration."
      />
    );
  }

  return (
    <MCPServersTable
      servers={servers}
      serverStatuses={serverStatuses}
      statusesLoading={statusesLoading}
    />
  );
};

export default AIAssetsMCPTab;
