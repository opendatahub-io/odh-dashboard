import * as React from 'react';
import { Link } from 'react-router-dom';
import { Truncate } from '@patternfly/react-core';
import { McpDeployment } from '~/odh/types/mcpDeploymentTypes';
import { mcpRegistryServerDetailUrl } from '~/app/routes/mcpCatalog/mcpCatalog';

type McpDeploymentRegisteredVersionCellProps = {
  deployment: McpDeployment;
};

/** Renders the "Registered version" column: a link to the deployment's exact MCP
 * Registry version, or '-' for catalog-sourced deployments. */
const McpDeploymentRegisteredVersionCell: React.FC<McpDeploymentRegisteredVersionCellProps> = ({
  deployment,
}) => {
  const { registryServer, registryVersion, namespace } = deployment;

  if (!registryServer) {
    return <span data-testid="mcp-deployment-registered-version-none">-</span>;
  }

  return (
    <Link
      to={mcpRegistryServerDetailUrl(registryServer, namespace, registryVersion)}
      data-testid="mcp-deployment-registered-version-link"
    >
      <Truncate content={registryVersion || registryServer} />
    </Link>
  );
};

export default McpDeploymentRegisteredVersionCell;
