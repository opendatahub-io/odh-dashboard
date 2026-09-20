import React from 'react';
import { useParams } from 'react-router';
import { Button, ButtonVariant, FlexItem, Tooltip } from '@patternfly/react-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import type { McpServer } from '~/app/mcpServerCatalogTypes';
import useMcpServerDeployAvailable from '~/odh/hooks/useMcpServerDeployAvailable';
import useMcpServerConverter from '~/odh/hooks/useMcpServerConverter';
import { mcpServerCRToYaml } from '~/odh/utils/mcpServerYaml';
import { McpDeployModalData } from '~/odh/types/mcpDeploymentTypes';
import McpDeployModal from '~/odh/components/McpDeployModal';

const McpServerDeployAction: React.FC<{
  server: {
    data: McpServer | null;
  };
}> = ({ server }) => {
  const { serverId = '' } = useParams<{ serverId: string }>();
  const { available, loaded } = useMcpServerDeployAvailable();
  const [crData, crLoaded, crError] = useMcpServerConverter(serverId);
  const [openModal, setOpenModal] = React.useState(false);
  const hasDeployableArtifact = !!server.data?.artifacts?.some((a) => a.uri);

  const prefillData: McpDeployModalData | undefined = React.useMemo(
    () =>
      crData
        ? {
            serverName: getDisplayNameFromK8sResource(crData),
            image: crData.spec.source.containerImage?.ref ?? '',
            yaml: mcpServerCRToYaml(crData),
          }
        : undefined,
    [crData],
  );

  const buttonState = React.useMemo(() => {
    if (!loaded) {
      return { enabled: false, loading: true, tooltip: 'Checking MCP server availability...' };
    }
    if (!available) {
      return {
        enabled: false,
        loading: false,
        tooltip: 'MCP Lifecycle is not available in this cluster.',
      };
    }
    return { enabled: true, loading: false };
  }, [available, loaded]);

  if (!hasDeployableArtifact) {
    return null;
  }

  const deployButton = (
    <Button
      id="mcp-deploy-button"
      aria-label="Deploy MCP server"
      variant={ButtonVariant.primary}
      onClick={() => setOpenModal(true)}
      isAriaDisabled={!buttonState.enabled}
      isLoading={buttonState.loading}
      data-testid="mcp-deploy-button"
    >
      Deploy MCP server
    </Button>
  );

  return (
    <FlexItem>
      {buttonState.tooltip ? (
        <Tooltip content={buttonState.tooltip}>{deployButton}</Tooltip>
      ) : (
        deployButton
      )}
      {openModal && (
        <McpDeployModal
          data={prefillData}
          isLoading={!crLoaded && !crError}
          loadError={crError}
          onClose={() => setOpenModal(false)}
        />
      )}
    </FlexItem>
  );
};

export default McpServerDeployAction;
