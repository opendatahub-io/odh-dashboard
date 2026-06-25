import React from 'react';
import { Button, ButtonVariant, FlexItem, Tooltip } from '@patternfly/react-core';
import useMcpServerDeployAvailable from '~/odh/hooks/useMcpServerDeployAvailable';
import McpDeployModal from '~/odh/components/McpDeployModal';

const McpServerDeployAction: React.FC = () => {
  const { available, loaded } = useMcpServerDeployAvailable();
  const [openModal, setOpenModal] = React.useState(false);

  const buttonState = React.useMemo(() => {
    if (!loaded) {
      return { enabled: false, loading: true, tooltip: 'Checking MCP server availability...' };
    }
    if (!available) {
      return {
        enabled: false,
        loading: false,
        tooltip: 'MCP server CRD is not available on this cluster',
      };
    }
    return { enabled: true, loading: false };
  }, [available, loaded]);

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
      <McpDeployModal isOpen={openModal} onClose={() => setOpenModal(false)} />
    </FlexItem>
  );
};

export default McpServerDeployAction;
