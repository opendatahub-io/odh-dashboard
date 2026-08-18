import React from 'react';
import { Button, ButtonVariant, FlexItem, Tooltip } from '@patternfly/react-core';
import { useMLflowStatus } from '@odh-dashboard/internal/concepts/mlflow/hooks/useMLflowStatus';
import useFetchDscStatus from '@odh-dashboard/internal/concepts/areas/useFetchDscStatus';
import type { McpDeploySpec, McpServer } from '~/app/types/mcpCatalogTypes';
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

const isMcpServerRegisterActionProps = (
  props: Record<string, unknown>,
): props is McpServerRegisterActionProps => {
  const { server } = props;
  return typeof server === 'object' && server !== null && 'loaded' in server && 'data' in server;
};

type OpenRegisterModal = {
  server: McpServer;
  registriesNamespace: string;
  deploySpec?: McpDeploySpec;
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
  const [openModal, setOpenModal] = React.useState<OpenRegisterModal | null>(null);

  const registerButton = (
    <Button
      variant={ButtonVariant.secondary}
      onClick={() => {
        if (buttonState.enabled && server.data) {
          setOpenModal({
            server: server.data,
            registriesNamespace,
            deploySpec: crData?.spec,
          });
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
      {openModal && (
        <McpRegisterModal
          server={openModal.server}
          registriesNamespace={openModal.registriesNamespace}
          deploySpec={openModal.deploySpec}
          onClose={() => setOpenModal(null)}
        />
      )}
    </FlexItem>
  );
};

const McpServerRegisterActionExtension: React.ComponentType<Record<string, unknown>> = (props) => {
  if (!isMcpServerRegisterActionProps(props)) {
    return null;
  }
  return <McpServerRegisterAction {...props} />;
};

export default McpServerRegisterActionExtension;
