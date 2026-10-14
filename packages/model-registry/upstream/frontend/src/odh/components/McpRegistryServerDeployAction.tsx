import React from 'react';
import { Button, ButtonVariant, Flex, FlexItem, Popover, Tooltip } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import useMcpServerDeployAvailable from '~/odh/hooks/useMcpServerDeployAvailable';
import useMcpImageDeployReadiness from '~/odh/hooks/useMcpImageDeployReadiness';
import type { McpDeployModalData, McpDeployment } from '~/odh/types/mcpDeploymentTypes';
import McpDeployModal from '~/odh/components/McpDeployModal';
import McpGatewayDocsLink from '~/odh/components/McpGatewayDocsLink';
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

  const deployButton = (
    <Button
      variant={ButtonVariant.primary}
      onClick={() => {
        if (buttonState.enabled) {
          setOpenModal(true);
        }
      }}
      isAriaDisabled={!buttonState.enabled}
      isLoading={buttonState.loading}
      data-testid="mcp-registry-deploy-action-button"
    >
      Deploy
    </Button>
  );

  return (
    <FlexItem>
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        spaceItems={{ default: 'spaceItemsXs' }}
        flexWrap={{ default: 'nowrap' }}
      >
        <FlexItem>
          {buttonState.tooltip ? (
            <Tooltip content={buttonState.tooltip}>{deployButton}</Tooltip>
          ) : (
            deployButton
          )}
        </FlexItem>
        {/* The host page header has little width to spare next to its own actions, so the
            docs link lives in a popover instead of inline like on the catalog page. */}
        {buttonState.showGatewayDocs && buttonState.tooltip ? (
          <FlexItem>
            <Popover
              headerContent="MCP gateway required"
              bodyContent={buttonState.tooltip}
              footerContent={<McpGatewayDocsLink />}
            >
              <Button
                icon={<HelpIcon />}
                variant="plain"
                aria-label="Why can't I deploy this MCP server?"
                data-testid="mcp-deploy-gateway-help"
              />
            </Popover>
          </FlexItem>
        ) : null}
      </Flex>
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
