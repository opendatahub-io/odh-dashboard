import { McpDeployReadinessReason } from '~/odh/types/mcpDeploymentTypes';
import {
  getMcpDeployReadinessBlock,
  getMcpDeployReadinessTooltip,
  MCP_DEPLOY_READINESS_ERROR_TOOLTIP,
  MCP_DEPLOY_READINESS_LOADING_TOOLTIP,
} from '~/odh/utils/mcpDeployReadiness';

describe('getMcpDeployReadinessBlock', () => {
  it('should allow deploying when the readiness check passes', () => {
    expect(
      getMcpDeployReadinessBlock({ gatewayRequired: true, deployable: true }, true, undefined),
    ).toBeUndefined();
    expect(
      getMcpDeployReadinessBlock({ gatewayRequired: false, deployable: true }, true, undefined),
    ).toBeUndefined();
  });

  it('should report loading until readiness is loaded', () => {
    expect(getMcpDeployReadinessBlock(null, false, undefined)).toEqual({
      loading: true,
      tooltip: MCP_DEPLOY_READINESS_LOADING_TOOLTIP,
      showGatewayDocs: false,
    });
  });

  it('should block without the docs link when the check fails', () => {
    expect(
      getMcpDeployReadinessBlock(
        { gatewayRequired: true, deployable: true },
        true,
        new Error('Service Unavailable'),
      ),
    ).toEqual({
      loading: false,
      tooltip: MCP_DEPLOY_READINESS_ERROR_TOOLTIP,
      showGatewayDocs: false,
    });
  });

  it('should block with the reason and docs link when a gateway is required', () => {
    expect(
      getMcpDeployReadinessBlock(
        {
          gatewayRequired: true,
          deployable: false,
          reason: McpDeployReadinessReason.OPERATOR_NOT_READY,
        },
        true,
        undefined,
      ),
    ).toEqual({
      loading: false,
      tooltip: getMcpDeployReadinessTooltip(McpDeployReadinessReason.OPERATOR_NOT_READY),
      showGatewayDocs: true,
    });
  });

  it('should not show the docs link when blocked for another reason', () => {
    expect(
      getMcpDeployReadinessBlock({ gatewayRequired: false, deployable: false }, true, undefined)
        ?.showGatewayDocs,
    ).toBe(false);
  });
});

describe('getMcpDeployReadinessTooltip', () => {
  it('should fall back to the unknown-status explanation for unknown reasons', () => {
    expect(getMcpDeployReadinessTooltip('SOMETHING_NEW')).toBe(
      getMcpDeployReadinessTooltip(McpDeployReadinessReason.GATEWAY_STATUS_UNAVAILABLE),
    );
    expect(getMcpDeployReadinessTooltip(undefined)).toBe(
      getMcpDeployReadinessTooltip(McpDeployReadinessReason.GATEWAY_STATUS_UNAVAILABLE),
    );
  });
});
