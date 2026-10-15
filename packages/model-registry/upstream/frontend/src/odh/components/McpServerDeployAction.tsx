import React from 'react';
import { useParams } from 'react-router';
import { FlexItem } from '@patternfly/react-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import type { McpServer } from '~/app/mcpServerCatalogTypes';
import useMcpServerDeployAvailable from '~/odh/hooks/useMcpServerDeployAvailable';
import useMcpServerConverter from '~/odh/hooks/useMcpServerConverter';
import useMcpServerDeployReadiness from '~/odh/hooks/useMcpServerDeployReadiness';
import { mcpServerCRToYaml } from '~/odh/utils/mcpServerYaml';
import { McpDeployModalData } from '~/odh/types/mcpDeploymentTypes';
import McpDeployModal from '~/odh/components/McpDeployModal';
import McpDeployButton from '~/odh/components/McpDeployButton';
import {
  DeployButtonState,
  getMcpDeployReadinessBlock,
  MCP_DEPLOY_READINESS_LOADING_TOOLTIP,
} from '~/odh/utils/mcpDeployReadiness';

const McpServerDeployAction: React.FC<{
  server: {
    data: McpServer | null;
  };
}> = ({ server }) => {
  const { serverId = '' } = useParams<{ serverId: string }>();
  const { available, loaded } = useMcpServerDeployAvailable();
  const [crData, crLoaded, crError] = useMcpServerConverter(serverId);
  // Without MCP Lifecycle nothing can be deployed, so there is nothing to check (or poll).
  const [readiness, readinessLoaded, readinessError] = useMcpServerDeployReadiness(
    loaded && available ? serverId : '',
  );
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

  const buttonState = React.useMemo<DeployButtonState>(() => {
    if (!loaded) {
      return { enabled: false, loading: true, tooltip: MCP_DEPLOY_READINESS_LOADING_TOOLTIP };
    }
    if (!available) {
      return {
        enabled: false,
        loading: false,
        tooltip: 'MCP Lifecycle is not available in this cluster.',
      };
    }
    const readinessBlock = getMcpDeployReadinessBlock(readiness, readinessLoaded, readinessError);
    if (readinessBlock) {
      return { enabled: false, ...readinessBlock };
    }
    return { enabled: true, loading: false };
  }, [available, loaded, readiness, readinessLoaded, readinessError]);

  if (!hasDeployableArtifact) {
    return null;
  }

  return (
    <FlexItem>
      <McpDeployButton
        state={buttonState}
        onDeploy={() => setOpenModal(true)}
        id="mcp-deploy-button"
        ariaLabel="Deploy MCP server"
        testId="mcp-deploy-button"
      >
        Deploy MCP server
      </McpDeployButton>
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
