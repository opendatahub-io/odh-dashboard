import React from 'react';
import { Button, ButtonVariant, FlexItem, Tooltip } from '@patternfly/react-core';
import useMcpServerDeployAvailable from '~/odh/hooks/useMcpServerDeployAvailable';
import useMcpImageDeployReadiness from '~/odh/hooks/useMcpImageDeployReadiness';
import type { McpDeployModalData, McpDeployment } from '~/odh/types/mcpDeploymentTypes';
import McpDeployModal from '~/odh/components/McpDeployModal';
import McpGatewayRequiredPopover, {
  MCP_GATEWAY_POPOVER_BODY_ID,
} from '~/odh/components/McpGatewayRequiredPopover';
import { getMcpDeployReadinessBlock } from '~/odh/utils/mcpDeployReadiness';

type DeployButtonState = {
  enabled: boolean;
  loading: boolean;
  tooltip?: string;
  showGatewayDocs?: boolean;
};

type McpRegistryServerDeployActionProps = {
  deployData?: McpDeployModalData;
  disabledReason?: string;
  onDeployed?: (deployment: McpDeployment) => void | Promise<void>;
};

const isMcpRegistryServerDeployActionProps = (
  props: Record<string, unknown>,
): props is McpRegistryServerDeployActionProps =>
  !props.deployData || typeof props.deployData === 'object';

/**
 * Deploy action for MCP servers prefilled from an external MCP Registry.
 *
 * Registered as a `core.action` extension so host pages (e.g. the mlflow
 * MCP Registry detail page) can render it through `ExtensibleActions`
 * without importing deploy logic directly.
 *
 * Unlike `McpServerDeployAction` (which derives deploy data from a catalog
 * server via hooks and route params), this component accepts pre-computed
 * `McpDeployModalData` — the caller handles registry-to-modal data
 * conversion and provides an optional post-deploy callback.
 *
 * Deploy also waits for the deploy readiness of the prefilled image, so servers that
 * require an MCP gateway (the MCP server for Red Hat OpenShift) stay blocked without one.
 * Without a prefilled image the user enters one in the deploy modal, and the BFF checks it
 * when creating the deployment.
 */
const McpRegistryServerDeployAction: React.FC<McpRegistryServerDeployActionProps> = ({
  deployData,
  disabledReason,
  onDeployed,
}) => {
  const { available, loaded } = useMcpServerDeployAvailable();
  const [readiness, readinessLoaded, readinessError] = useMcpImageDeployReadiness(
    deployData?.namespace,
    deployData?.image,
  );
  const [openModal, setOpenModal] = React.useState(false);
  const deployButtonRef = React.useRef<HTMLButtonElement>(null);

  const buttonState = React.useMemo<DeployButtonState>(() => {
    if (disabledReason) {
      return { enabled: false, loading: false, tooltip: disabledReason };
    }
    if (!loaded) {
      return { enabled: false, loading: true, tooltip: 'Checking deploy availability...' };
    }
    if (!available) {
      return {
        enabled: false,
        loading: false,
        tooltip: 'MCP Lifecycle is not available in this cluster.',
      };
    }
    if (!deployData) {
      return { enabled: false, loading: false };
    }
    if (deployData.image) {
      const readinessBlock = getMcpDeployReadinessBlock(readiness, readinessLoaded, readinessError);
      if (readinessBlock) {
        return { enabled: false, ...readinessBlock };
      }
    }
    return { enabled: true, loading: false };
  }, [disabledReason, loaded, available, deployData, readiness, readinessLoaded, readinessError]);

  const showGatewayPopover = !!buttonState.showGatewayDocs && !!buttonState.tooltip;

  const deployButton = (
    <Button
      ref={deployButtonRef}
      variant={ButtonVariant.primary}
      onClick={() => {
        if (buttonState.enabled) {
          setOpenModal(true);
        }
      }}
      isAriaDisabled={!buttonState.enabled}
      isLoading={buttonState.loading}
      aria-describedby={showGatewayPopover ? MCP_GATEWAY_POPOVER_BODY_ID : undefined}
      data-testid="mcp-registry-deploy-action-button"
    >
      Deploy
    </Button>
  );

  const renderDeployButton = () => {
    if (!buttonState.tooltip) {
      return deployButton;
    }
    // A popover instead of a tooltip so the docs link can be reached with the mouse or the
    // keyboard; the host page header has no room for the link next to its own actions.
    if (showGatewayPopover) {
      return (
        <McpGatewayRequiredPopover explanation={buttonState.tooltip} triggerRef={deployButtonRef}>
          {deployButton}
        </McpGatewayRequiredPopover>
      );
    }
    return <Tooltip content={buttonState.tooltip}>{deployButton}</Tooltip>;
  };

  return (
    <FlexItem>
      {renderDeployButton()}
      {openModal && deployData && (
        <McpDeployModal
          data={deployData}
          onClose={() => setOpenModal(false)}
          onDeployed={onDeployed}
        />
      )}
    </FlexItem>
  );
};

const McpRegistryServerDeployActionExtension: React.ComponentType<Record<string, unknown>> = (
  props,
) => {
  if (!isMcpRegistryServerDeployActionProps(props)) {
    return null;
  }
  return <McpRegistryServerDeployAction {...props} />;
};

export default McpRegistryServerDeployActionExtension;
