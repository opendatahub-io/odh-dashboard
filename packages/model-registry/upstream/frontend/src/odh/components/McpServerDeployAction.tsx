import React from 'react';
import { useParams } from 'react-router';
import { Button, ButtonVariant, Flex, FlexItem, Tooltip } from '@patternfly/react-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import type { McpServer } from '~/app/mcpServerCatalogTypes';
import useMcpServerDeployAvailable from '~/odh/hooks/useMcpServerDeployAvailable';
import useMcpServerConverter from '~/odh/hooks/useMcpServerConverter';
import useMcpServerDeployReadiness from '~/odh/hooks/useMcpServerDeployReadiness';
import { mcpServerCRToYaml } from '~/odh/utils/mcpServerYaml';
import { McpDeployModalData, McpDeployReadinessReason } from '~/odh/types/mcpDeploymentTypes';
import McpDeployModal from '~/odh/components/McpDeployModal';
import ExternalLink from '~/app/shared/components/ExternalLink';
import { MCP_GATEWAY_SETUP_DOCS_URL } from '~/odh/const';

const READINESS_TOOLTIPS: Record<McpDeployReadinessReason, string> = {
  [McpDeployReadinessReason.NO_GATEWAY_AVAILABLE]:
    'This MCP server requires an MCP gateway, and none is available. Ask your cluster administrator to set up an MCP gateway.',
  [McpDeployReadinessReason.OPERATOR_NOT_READY]:
    'This MCP server requires an MCP gateway, but the MCP lifecycle operator is not ready. Try again later or contact your cluster administrator.',
  [McpDeployReadinessReason.GATEWAY_STATUS_UNAVAILABLE]:
    'This MCP server requires an MCP gateway, but MCP gateway availability could not be determined. Try again later or contact your cluster administrator.',
};
// The reason comes from the BFF as JSON; fall back for values this UI doesn't know yet.
const isReadinessReason = (reason?: string): reason is McpDeployReadinessReason =>
  !!reason && Object.values<string>(McpDeployReadinessReason).includes(reason);

const getReadinessTooltip = (reason?: string): string =>
  isReadinessReason(reason)
    ? READINESS_TOOLTIPS[reason]
    : READINESS_TOOLTIPS[McpDeployReadinessReason.GATEWAY_STATUS_UNAVAILABLE];

type DeployButtonState = {
  enabled: boolean;
  loading: boolean;
  tooltip?: string;
  showGatewayDocs?: boolean;
};

const READINESS_ERROR_TOOLTIP =
  'Unable to check the deployment prerequisites for this MCP server. Try again later.';

const McpServerDeployAction: React.FC<{
  server: {
    data: McpServer | null;
  };
}> = ({ server }) => {
  const { serverId = '' } = useParams<{ serverId: string }>();
  const { available, loaded } = useMcpServerDeployAvailable();
  const [crData, crLoaded, crError] = useMcpServerConverter(serverId);
  const [readiness, readinessLoaded, readinessError] = useMcpServerDeployReadiness(serverId);
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
      return { enabled: false, loading: true, tooltip: 'Checking MCP server availability...' };
    }
    if (!available) {
      return {
        enabled: false,
        loading: false,
        tooltip: 'MCP Lifecycle is not available in this cluster.',
      };
    }
    if (readinessError) {
      return { enabled: false, loading: false, tooltip: READINESS_ERROR_TOOLTIP };
    }
    if (!readinessLoaded || !readiness) {
      return { enabled: false, loading: true, tooltip: 'Checking MCP server availability...' };
    }
    if (!readiness.deployable) {
      return {
        enabled: false,
        loading: false,
        tooltip: getReadinessTooltip(readiness.reason),
        showGatewayDocs: readiness.gatewayRequired,
      };
    }
    return { enabled: true, loading: false };
  }, [available, loaded, readiness, readinessLoaded, readinessError]);

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
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
        <FlexItem>
          {buttonState.tooltip ? (
            <Tooltip content={buttonState.tooltip}>{deployButton}</Tooltip>
          ) : (
            deployButton
          )}
        </FlexItem>
        {buttonState.showGatewayDocs ? (
          <FlexItem>
            <ExternalLink
              text="How to set up an MCP gateway"
              to={MCP_GATEWAY_SETUP_DOCS_URL}
              testId="mcp-deploy-gateway-docs-link"
            />
          </FlexItem>
        ) : null}
      </Flex>
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
