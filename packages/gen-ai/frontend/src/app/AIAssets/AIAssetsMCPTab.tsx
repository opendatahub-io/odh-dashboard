import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  Bullseye,
  Button,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { CubesIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { DashboardConfigContext } from '@odh-dashboard/plugin-core';
import useFetchMCPServers from '~/app/hooks/useFetchMCPServers';
import useMCPServerStatuses from '~/app/hooks/useMCPServerStatuses';
import MCPServersTable from '~/app/AIAssets/components/mcp/MCPServersTable';
import NoData from '~/app/EmptyStates/NoData';

/**
 * MCP tab component using hooks directly.
 * Loads MCP servers and checks their statuses when the tab is accessed.
 */
const AIAssetsMCPTab: React.FC = () => {
  const dashboardConfig = React.useContext(DashboardConfigContext);
  const mcpRegistryEnabled = dashboardConfig?.dashboardConfig.mcpRegistry ?? false;
  const { data: servers = [], registryAvailable, loaded, error, refetch } = useFetchMCPServers();
  const [isRegistryBannerDismissed, setIsRegistryBannerDismissed] = React.useState(false);
  const { serverStatuses, statusesLoading } = useMCPServerStatuses(servers, loaded);
  let errorIcon, errorTitle, errorDescription;
  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (error) {
    errorTitle = 'Unable to load MCP servers';
    errorDescription = 'An error occurred while loading MCP servers. Try refreshing the page.';
    errorIcon = ExclamationCircleIcon;
  } else if (servers.length === 0 && !registryAvailable) {
    errorTitle = 'Unable to load MCP servers';
    errorDescription =
      'The MCP registry is unavailable and no manually configured servers exist in this project.';
    errorIcon = ExclamationCircleIcon;
  } else if (servers.length === 0) {
    errorTitle = 'No MCP servers available';
    errorDescription = 'No MCP servers are configured for this project.';
    errorIcon = CubesIcon;
  }

  return (
    <Stack hasGutter>
      {mcpRegistryEnabled && !registryAvailable && !isRegistryBannerDismissed && (
        <StackItem>
          <Alert
            variant="warning"
            isInline
            title="MCP registry unavailable"
            actionClose={
              <AlertActionCloseButton onClose={() => setIsRegistryBannerDismissed(true)} />
            }
          >
            Only manually configured servers are shown. Registered servers from your
            organization&apos;s registry could not be loaded.
            <br />
            <Button
              variant="link"
              isInline
              onClick={() => {
                setIsRegistryBannerDismissed(false);
                refetch();
              }}
            >
              Retry connection
            </Button>
          </Alert>
        </StackItem>
      )}
      <StackItem isFilled>
        {errorTitle ? (
          <NoData icon={errorIcon} title={errorTitle} description={errorDescription} />
        ) : (
          <MCPServersTable
            servers={servers}
            serverStatuses={serverStatuses}
            statusesLoading={statusesLoading}
          />
        )}
      </StackItem>
    </Stack>
  );
};

export default AIAssetsMCPTab;
