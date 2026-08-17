import React from 'react';
import { Button, ButtonVariant, FlexItem, Tooltip } from '@patternfly/react-core';
import { useMLflowStatus } from '@odh-dashboard/internal/concepts/mlflow/hooks/useMLflowStatus';
import useFetchDscStatus from '@odh-dashboard/internal/concepts/areas/useFetchDscStatus';
import type { McpServer } from '~/app/types/mcpCatalogTypes';
import { useMcpServerConverter } from '~/app/hooks/useMcpServerCatalog';
import { getRegisterButtonState } from '~/odh/utils';
import McpRegisterModal from '~/odh/components/McpRegisterModal';

type McpServerRegisterActionProps = {
  server: {
    data: McpServer | null;
    loaded: boolean;
    error?: Error;
  };
};

const McpServerRegisterAction: React.FC<McpServerRegisterActionProps> = ({ server }) => {
  const mlflowStatus = useMLflowStatus(true);
  const [dscStatus, dscLoaded, dscError] = useFetchDscStatus();
  const registriesNamespace = dscStatus?.components?.modelregistry?.registriesNamespace || '';
  const [crData, crLoaded, crError] = useMcpServerConverter(
    server.data?.id || '',
    registriesNamespace,
  );
  const buttonState = getRegisterButtonState({
    serverSettled: server.loaded || !!server.error,
    hasServerData: !!server.data,
    dscSettled: dscLoaded || !!dscError,
    registriesNamespace,
    mlflowLoaded: mlflowStatus.loaded,
    mlflowUnreachable: mlflowStatus.error,
    mlflowConfigured: mlflowStatus.configured,
    converterSettled: crLoaded || !!crError,
  });
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const registerButton = (
    <Button
      variant={ButtonVariant.secondary}
      onClick={() => {
        if (buttonState.enabled) {
          setIsModalOpen(true);
        }
      }}
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
      {isModalOpen && buttonState.enabled && server.data && (
        <McpRegisterModal
          server={server.data}
          registriesNamespace={registriesNamespace}
          deploySpec={crData?.spec}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </FlexItem>
  );
};

export default McpServerRegisterAction;
