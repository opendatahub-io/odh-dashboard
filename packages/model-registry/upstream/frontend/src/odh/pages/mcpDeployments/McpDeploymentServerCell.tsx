import * as React from 'react';
import { Truncate } from '@patternfly/react-core';
import { McpDeployment } from '~/odh/types/mcpDeploymentTypes';

type McpDeploymentServerCellProps = {
  deployment: McpDeployment;
};

/** Renders the "MCP server" column as plain text: the registry display name,
 * the catalog display name stored in the annotation, or '-' as a fallback. */
const McpDeploymentServerCell: React.FC<McpDeploymentServerCellProps> = ({ deployment }) => {
  const { registryServer, registryServerDisplayName, serverName } = deployment;

  if (registryServer) {
    return (
      <Truncate
        content={registryServerDisplayName || registryServer}
        data-testid="mcp-deployment-server-registry"
      />
    );
  }

  if (serverName) {
    return <Truncate content={serverName} data-testid="mcp-deployment-server-catalog" />;
  }

  return <span data-testid="mcp-deployment-server-none">-</span>;
};

export default McpDeploymentServerCell;
