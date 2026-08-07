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
  const canDeploy = Boolean(version) && isAvailable && Boolean(namespace);

  // Surface *why* Deploy is disabled instead of leaving the button greyed out with no
  // explanation. The Registry tab that hosts this button already requires MCP_CATALOG to be
  // enabled (mcp-catalog.server/deploy-modal's own gate), so extensions.length === 0 here means
  // the model-registry remote failed to load, not a disabled feature — reloading should fix it.
  const disabledReason = !version
    ? 'Select a server version to deploy'
    : !namespace
    ? 'Select a project to deploy to'
    : !extensionsLoaded
    ? 'Checking deploy availability...'
    : extensions.length === 0
    ? 'Deploying is temporarily unavailable. Try reloading the page.'
    : undefined;

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
      // isAriaDisabled keeps the button focusable (for the tooltip) but does not
      // block clicks/keyboard activation, so guard the handler with the same condition.
      onClick={() => {
        if (canDeploy) {
          setIsModalOpen(true);
        }
      }}
      isAriaDisabled={!canDeploy}
      data-testid="mcp-registry-deploy-action-button"
    >
      Deploy
    </Button>
  );

  // Render only the first resolved extension (matches NamespaceSelectorFieldWrapper's
  // convention) so a second registered provider can't fire a duplicate deploy from one click.
  let modal: React.ReactNode = null;
  if (isModalOpen && version && deployData && extensions.length > 0) {
    const extension = extensions[0];
    const ModalComponent = extension.properties.modalComponent;
    modal = (
      <ModalComponent
        key={extension.uid}
        data={deployData}
        onClose={() => setIsModalOpen(false)}
        onDeployed={handleDeployed}
      />
    );
  }

  return (
    <>
      {disabledReason ? <Tooltip content={disabledReason}>{button}</Tooltip> : button}
      {modal}
    </>
  );
};

export default McpRegistryDeployAction;
