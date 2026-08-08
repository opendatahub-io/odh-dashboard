import React from 'react';
import { Button, ButtonVariant, FlexItem, Tooltip } from '@patternfly/react-core';
import useMcpServerDeployAvailable from '~/odh/hooks/useMcpServerDeployAvailable';
import { mcpServerCRToYaml } from '~/odh/utils/mcpServerYaml';
import { resolveActionButtonState } from '~/odh/utils/registerUtils';
import { McpDeployModalData, MCPServerCR } from '~/odh/types/mcpDeploymentTypes';
import McpDeployModal from '~/odh/components/McpDeployModal';

type McpServerDeployActionProps = {
  crData: MCPServerCR | null;
  crLoaded: boolean;
  crError?: Error;
};

const McpServerDeployAction: React.FC<McpServerDeployActionProps> = ({
  crData,
  crLoaded,
  crError,
}) => {
  const { available, loaded } = useMcpServerDeployAvailable();
  const [openModal, setOpenModal] = React.useState(false);

  const prefillData: McpDeployModalData | undefined = React.useMemo(
    () =>
      crData
        ? {
            serverName: crData.metadata.name,
            image: crData.spec.source.containerImage?.ref ?? '',
            yaml: mcpServerCRToYaml(crData),
          }
        : undefined,
    [crData],
  );

  const buttonState = React.useMemo(
    () =>
      resolveActionButtonState([
        { when: !loaded, loading: true, tooltip: 'Checking MCP server availability...' },
        {
          when: !available,
          loading: false,
          tooltip: 'MCP Lifecycle is not available in this cluster.',
        },
      ]),
    [available, loaded],
  );

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
