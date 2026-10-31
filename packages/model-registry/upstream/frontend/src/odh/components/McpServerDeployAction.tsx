import React from 'react';
import { FlexItem } from '@patternfly/react-core';
import type { McpServer } from '~/app/mcpServerCatalogTypes';
import useMcpServerDeployAvailable from '~/odh/hooks/useMcpServerDeployAvailable';
import McpServerInstallModal from '~/odh/components/McpServerInstallModal';
import McpDeployButton from '~/odh/components/McpDeployButton';
import {
  DeployButtonState,
  MCP_DEPLOY_READINESS_LOADING_TOOLTIP,
} from '~/odh/utils/mcpDeployReadiness';

const McpServerDeployAction: React.FC<{
  server: {
    data: McpServer | null;
  };
}> = ({ server }) => {
  const { available, loaded } = useMcpServerDeployAvailable();
  const [openModal, setOpenModal] = React.useState(false);
  const hasDeployableArtifact = !!server.data?.artifacts?.some((a) => a.uri);

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
    return { enabled: true, loading: false };
  }, [available, loaded]);

  if (!hasDeployableArtifact || !server.data) {
    return null;
  }

  return (
    <FlexItem>
      <McpDeployButton
        state={buttonState}
        onDeploy={() => setOpenModal(true)}
        id="mcp-deploy-button"
        ariaLabel="Install MCP server"
        testId="mcp-deploy-button"
      >
        Install MCP server
      </McpDeployButton>
      {openModal && (
        <McpServerInstallModal
          server={server.data}
          lifecycleAvailable={available}
          lifecycleLoaded={loaded}
          onClose={() => setOpenModal(false)}
        />
      )}
    </FlexItem>
  );
};

export default McpServerDeployAction;
