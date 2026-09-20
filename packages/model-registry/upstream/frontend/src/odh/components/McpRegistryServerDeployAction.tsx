import React from 'react';
import { Button, ButtonVariant, FlexItem, Tooltip } from '@patternfly/react-core';
import useMcpServerDeployAvailable from '~/odh/hooks/useMcpServerDeployAvailable';
import type { McpDeployModalData, McpDeployment } from '~/odh/types/mcpDeploymentTypes';
import McpDeployModal from '~/odh/components/McpDeployModal';

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
 */
const McpRegistryServerDeployAction: React.FC<McpRegistryServerDeployActionProps> = ({
  deployData,
  disabledReason,
  onDeployed,
}) => {
  const { available, loaded } = useMcpServerDeployAvailable();
  const [openModal, setOpenModal] = React.useState(false);

  const effectiveDisabledReason = React.useMemo(() => {
    if (disabledReason) {
      return disabledReason;
    }
    if (!loaded) {
      return 'Checking deploy availability...';
    }
    if (!available) {
      return 'MCP Lifecycle is not available in this cluster.';
    }
    return undefined;
  }, [disabledReason, loaded, available]);

  const canDeploy = !effectiveDisabledReason && !!deployData;

  const deployButton = (
    <Button
      variant={ButtonVariant.primary}
      onClick={() => {
        if (canDeploy) {
          setOpenModal(true);
        }
      }}
      isAriaDisabled={!canDeploy}
      isLoading={!loaded && !disabledReason}
      data-testid="mcp-registry-deploy-action-button"
    >
      Deploy
    </Button>
  );

  return (
    <FlexItem>
      {effectiveDisabledReason ? (
        <Tooltip content={effectiveDisabledReason}>{deployButton}</Tooltip>
      ) : (
        deployButton
      )}
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
