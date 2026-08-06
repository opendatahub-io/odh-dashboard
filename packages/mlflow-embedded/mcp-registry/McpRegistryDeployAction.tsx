import React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { useNotification } from '@odh-dashboard/ui-core/contexts/NotificationContext';
import type { McpDeployment } from '@odh-dashboard/model-registry/types/mcpDeploymentTypes';
import { isMcpCatalogDeployModalExtension } from './extension-points';
import { createMcpAccessEndpoint } from './api';
import { buildMcpAccessEndpointUrl } from './buildMcpAccessEndpointUrl';
import { registryVersionToDeployData } from './registryVersionToDeployData';
import { DEFAULT_MCP_PATH } from './const';
import { MCPServer, MCPServerVersion } from './types';

type McpRegistryDeployActionProps = {
  server: MCPServer;
  version?: MCPServerVersion;
  namespace: string; // MCP Registry's project
};

// Deploy button for MCP Registry detail page. Creates MCPServer CR, then registers MCPAccessEndpoint.
const McpRegistryDeployAction: React.FC<McpRegistryDeployActionProps> = ({
  server,
  version,
  namespace,
}) => {
  const [extensions, extensionsLoaded] = useResolvedExtensions(isMcpCatalogDeployModalExtension);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const notification = useNotification();

  const deployData = React.useMemo(
    () => (version ? { ...registryVersionToDeployData(server, version), namespace } : undefined),
    [server, version, namespace],
  );

  const isAvailable = extensionsLoaded && extensions.length > 0;

  const handleDeployed = React.useCallback(
    async (deployment: McpDeployment) => {
      if (!deployData) {
        return;
      }
      try {
        /* eslint-disable camelcase */
        await createMcpAccessEndpoint(deployData.registryServer, deployment.namespace)(
          {},
          {
            // Use deployment's actual applied config, not registry metadata
            endpoint_url: buildMcpAccessEndpointUrl(
              deployment.name,
              deployment.namespace,
              deployment.port,
              deployment.path || DEFAULT_MCP_PATH,
            ),
            transport_type: deployData.transportType,
            // server_alias is mutually exclusive with server_version in mlflow BFF
            server_version: deployData.registryVersion,
          },
        );
        /* eslint-enable camelcase */
        notification.success('Deployed and registered');
      } catch (endpointError) {
        notification.warning(
          'Deployed, but registration failed',
          (endpointError instanceof Error && endpointError.message) ||
            'Failed to register the MCP access endpoint.',
        );
      }
    },
    [deployData, notification],
  );

  const button = (
    <Button
      variant="primary"
      onClick={() => setIsModalOpen(true)}
      isAriaDisabled={!version || !isAvailable || !namespace}
      data-testid="mcp-registry-deploy-action-button"
    >
      Deploy
    </Button>
  );

  const modals =
    isModalOpen && version && deployData
      ? extensions.map((extension) => (
          <extension.properties.modalComponent
            key={extension.uid}
            data={deployData}
            onClose={() => setIsModalOpen(false)}
            onDeployed={handleDeployed}
          />
        ))
      : null;

  return (
    <>
      {version ? button : <Tooltip content="Select a server version to deploy">{button}</Tooltip>}
      {modals}
    </>
  );
};

export default McpRegistryDeployAction;
