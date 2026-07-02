import React from 'react';
import { useParams } from 'react-router';
import { Button, ButtonVariant, FlexItem, Tooltip } from '@patternfly/react-core';
import useMcpServerDeployAvailable from '~/odh/hooks/useMcpServerDeployAvailable';
import useMcpServerConverter from '~/odh/hooks/useMcpServerConverter';
import { mcpServerCRToYaml } from '~/odh/utils/mcpServerYaml';
import { McpDeployModalData } from '~/odh/types/mcpDeploymentTypes';
import McpDeployModal from '~/odh/components/McpDeployModal';

const McpServerDeployAction: React.FC = () => {
  const { serverId = '' } = useParams<{ serverId: string }>();
  const { available, loaded } = useMcpServerDeployAvailable();
  const [crData, crLoaded, crError] = useMcpServerConverter(serverId);
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

  const buttonState = React.useMemo(() => {
    if (!loaded || !crLoaded) {
      return { enabled: false, loading: true, tooltip: 'Checking MCP server availability...' };
    }
    if (!available) {
      return {
        enabled: false,
        loading: false,
        tooltip: 'MCP server CRD is not available on this cluster',
      };
    }
    if (!prefillData) {
      return {
        enabled: false,
        loading: false,
        tooltip: crError
          ? `Failed to load MCP server configuration: ${crError.message}`
          : 'Failed to load MCP server configuration',
      };
    }
    return { enabled: true, loading: false };
  }, [available, loaded, crLoaded, prefillData, crError]);

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
      {openModal && <McpDeployModal data={prefillData} onClose={() => setOpenModal(false)} />}
    </FlexItem>
  );
};

export default McpServerDeployAction;
