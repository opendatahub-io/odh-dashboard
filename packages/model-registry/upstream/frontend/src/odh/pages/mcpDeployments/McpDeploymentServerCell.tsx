import * as React from 'react';
import { Truncate } from '@patternfly/react-core';
import { McpDeployment } from '~/odh/types/mcpDeploymentTypes';
import useMcpDeploymentCatalogServer from './useMcpDeploymentCatalogServer';

type McpDeploymentServerCellProps = {
  deployment: McpDeployment;
};

/** Renders the "MCP server" column as plain text: the resolved registry display
 * name, or the catalog display name, or the raw name/'-' as a fallback. */
const McpDeploymentServerCell: React.FC<McpDeploymentServerCellProps> = ({ deployment }) => {
  const { registryServer, registryServerDisplayName, serverName, namespace } = deployment;

  const [catalogServer] = useMcpDeploymentCatalogServer(
    registryServer ? undefined : serverName,
    namespace,
  );

  if (registryServer) {
    return (
      <Truncate
        content={registryServerDisplayName || registryServer}
        data-testid="mcp-deployment-server-registry"
      />
    );
  }

  if (serverName) {
    return (
      <Truncate
        content={catalogServer?.displayName || serverName}
        data-testid="mcp-deployment-server-catalog"
      />
    );
  }

  return <span data-testid="mcp-deployment-server-none">-</span>;
};

export default McpDeploymentServerCell;
