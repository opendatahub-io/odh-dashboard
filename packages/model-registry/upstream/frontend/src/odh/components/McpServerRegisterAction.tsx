import React from 'react';
import { Button, ButtonVariant, FlexItem, Tooltip } from '@patternfly/react-core';
import { useMLflowStatus } from '@odh-dashboard/internal/concepts/mlflow/hooks/useMLflowStatus';
import type { McpServer } from '~/app/mcpServerCatalogTypes';
import type { MCPServerCR } from '~/odh/types/mcpDeploymentTypes';
import { resolveActionButtonState } from '~/odh/utils/registerUtils';
import McpRegisterModal from '~/odh/components/McpRegisterModal';

type McpServerRegisterActionProps = {
  server: McpServer | null;
  serverLoaded: boolean;
  serverLoadError?: Error;
  crData: MCPServerCR | null;
};

const McpServerRegisterAction: React.FC<McpServerRegisterActionProps> = ({
  server,
  serverLoaded,
  serverLoadError,
  crData,
}) => {
  const { configured, loaded, error } = useMLflowStatus(true);
  const available = loaded && configured && !error;
  const [openModal, setOpenModal] = React.useState(false);

  const buttonState = React.useMemo(
    () =>
      resolveActionButtonState([
        { when: !serverLoaded, loading: true, tooltip: 'Loading MCP server details...' },
        {
          when: !!serverLoadError || !server,
          loading: false,
          tooltip: 'Unable to load MCP server details',
        },
        { when: !loaded, loading: true, tooltip: 'Checking MLflow availability...' },
        { when: !!error, loading: false, tooltip: 'MLflow service could not be reached' },
        {
          when: !available,
          loading: false,
          tooltip: 'MLflow is not available on this cluster',
        },
      ]),
    [serverLoaded, serverLoadError, server, loaded, error, available],
  );

  const registerButton = (
    <Button
      variant={ButtonVariant.secondary}
      onClick={() => setOpenModal(true)}
      isAriaDisabled={!buttonState.enabled}
      isLoading={buttonState.loading}
      data-testid="mcp-register-button"
    >
      Register MCP server
    </Button>
  );

  return (
    <FlexItem>
      {buttonState.tooltip ? (
        <Tooltip content={buttonState.tooltip}>{registerButton}</Tooltip>
      ) : (
        registerButton
      )}
      {openModal && server && (
        <McpRegisterModal
          server={server}
          deploySpec={crData?.spec}
          onClose={() => setOpenModal(false)}
        />
      )}
    </FlexItem>
  );
};

export default McpServerRegisterAction;
