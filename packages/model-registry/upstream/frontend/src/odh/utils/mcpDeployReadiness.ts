import { McpDeployReadinessReason, McpServerDeployReadiness } from '~/odh/types/mcpDeploymentTypes';

const READINESS_TOOLTIPS: Record<McpDeployReadinessReason, string> = {
  [McpDeployReadinessReason.NO_GATEWAY_AVAILABLE]:
    'This MCP server requires an MCP gateway, and none is available. Ask your cluster administrator to set up an MCP gateway.',
  [McpDeployReadinessReason.OPERATOR_NOT_READY]:
    'This MCP server requires an MCP gateway, but the MCP lifecycle operator is not ready. Try again later or contact your cluster administrator.',
  [McpDeployReadinessReason.GATEWAY_STATUS_UNAVAILABLE]:
    'This MCP server requires an MCP gateway, but MCP gateway availability could not be determined. Try again later or contact your cluster administrator.',
};

export const MCP_DEPLOY_READINESS_ERROR_TOOLTIP =
  'Unable to check the deployment prerequisites for this MCP server. Try again later.';

export const MCP_DEPLOY_READINESS_LOADING_TOOLTIP = 'Checking MCP server availability...';

// The reason comes from the BFF as JSON; fall back for values this UI doesn't know yet.
const isReadinessReason = (reason?: string): reason is McpDeployReadinessReason =>
  !!reason && Object.values<string>(McpDeployReadinessReason).includes(reason);

export const getMcpDeployReadinessTooltip = (reason?: string): string =>
  isReadinessReason(reason)
    ? READINESS_TOOLTIPS[reason]
    : READINESS_TOOLTIPS[McpDeployReadinessReason.GATEWAY_STATUS_UNAVAILABLE];

/** What the Deploy button shows: whether it is enabled and, if not, why. */
export type DeployButtonState = {
  enabled: boolean;
  loading: boolean;
  tooltip?: string;
  showGatewayDocs?: boolean;
};

export type McpDeployReadinessBlock = {
  loading: boolean;
  tooltip: string;
  showGatewayDocs: boolean;
};

/**
 * Returns why Deploy must stay disabled for a deploy readiness result, or `undefined` when
 * the readiness check allows deploying.
 */
export const getMcpDeployReadinessBlock = (
  readiness: McpServerDeployReadiness | null,
  loaded: boolean,
  error: Error | undefined,
): McpDeployReadinessBlock | undefined => {
  if (error) {
    return { loading: false, tooltip: MCP_DEPLOY_READINESS_ERROR_TOOLTIP, showGatewayDocs: false };
  }
  if (!loaded || !readiness) {
    return { loading: true, tooltip: MCP_DEPLOY_READINESS_LOADING_TOOLTIP, showGatewayDocs: false };
  }
  if (!readiness.deployable) {
    return {
      loading: false,
      tooltip: getMcpDeployReadinessTooltip(readiness.reason),
      showGatewayDocs: readiness.gatewayRequired,
    };
  }
  return undefined;
};
