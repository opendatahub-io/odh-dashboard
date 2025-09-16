import * as React from 'react';
import { EmptyState, Spinner, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { useCheckboxTableBase, Table } from 'mod-arch-shared';
import { useMCPServers } from '~/app/hooks/useMCPServers';
import { useProject } from '~/app/context/ProjectContext';
import { getMCPServerStatus } from '~/app/services/llamaStackService';
import { MCPServer, TokenInfo } from '~/app/types';
import { useMCPContext } from '~/app/context/MCPContext';
import { transformMCPServerData } from '~/app/utilities/mcp';
import MCPPanelColumns from './MCPPanelColumns';
import MCPServerPanelRow from './MCPServerPanelRow';
import MCPServerConfigModal from './MCPServerConfigModal';
import MCPServerToolsModal from './MCPServerToolsModal';

interface MCPServersPanelProps {
  onSelectionChange?: (selectedServers: string[]) => void;
}

const MCPServersPanel: React.FC<MCPServersPanelProps> = ({ onSelectionChange }) => {
  const { selectedProject, isLoading: projectLoading } = useProject();
  const { playgroundSelectedServerIds, setSelectedServersCount } = useMCPContext();
  const {
    servers: apiServers,
    serversLoaded,
    serversLoadError,
    serverStatuses,
    statusesLoading,
  } = useMCPServers(selectedProject || '');

  // Transform API data to table format
  const transformedServers = React.useMemo(
    () => apiServers.map(transformMCPServerData),
    [apiServers],
  );

  // Modal state
  const [configModalOpen, setConfigModalOpen] = React.useState(false);
  const [selectedServerForConfig, setSelectedServerForConfig] = React.useState<MCPServer | null>(
    null,
  );
  const [isSelectedServerAlreadyConnected, setIsSelectedServerAlreadyConnected] =
    React.useState(false);
  const [toolsModalOpen, setToolsModalOpen] = React.useState(false);
  const [selectedServerForTools, setSelectedServerForTools] = React.useState<MCPServer | null>(
    null,
  );

  // Token management state
  const [serverTokens, setServerTokens] = React.useState<Map<string, TokenInfo>>(new Map());
  const [validationErrors, setValidationErrors] = React.useState<Map<string, string>>(new Map());
  const [validatingServers, setValidatingServers] = React.useState<Set<string>>(new Set());

  // Use useCheckboxTableBase for proper table selection UI (including select all checkbox)
  const [selectedServers, setSelectedServers] = React.useState<MCPServer[]>([]);

  const { selections, tableProps, isSelected, toggleSelection } = useCheckboxTableBase(
    transformedServers,
    selectedServers,
    setSelectedServers,
    React.useCallback((server: MCPServer) => server.id, []),

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
    { selectAll: { tooltip: 'Select all MCP servers' } as any },
  );

  // Auto-select servers with specified URLs when servers load
  React.useEffect(() => {
    if (transformedServers.length > 0 && selectedServers.length === 0) {
      const serversToSelect = transformedServers.filter((server) =>
        playgroundSelectedServerIds.includes(server.id),
      );
      if (serversToSelect.length > 0) {
        // console.log('Auto-selecting servers with IDs:', playgroundSelectedServerIds);
        setSelectedServers(serversToSelect);
      }
    }
  }, [transformedServers, selectedServers, playgroundSelectedServerIds]);

  // Notify parent of selection changes
  React.useEffect(() => {
    const selectedConnectionUrls = selectedServers.map((server) => server.id);
    setSelectedServersCount(selectedConnectionUrls.length);
    onSelectionChange?.(selectedConnectionUrls);
  }, [selectedServers, onSelectionChange, setSelectedServersCount, selections]);

  // Update authentication status based on server status responses
  React.useEffect(() => {
    serverStatuses.forEach((statusInfo, serverUrl) => {
      const currentTokenInfo = serverTokens.get(serverUrl);

      if (statusInfo.status === 'connected' && !currentTokenInfo) {
        // Server is connected and we have no token info yet
        // This means it's auto-connected (doesn't require authentication)
        setServerTokens((prev) =>
          new Map(prev).set(serverUrl, {
            token: '',
            authenticated: false,
            autoConnected: true,
          }),
        );
      } else if (currentTokenInfo && statusInfo.status !== 'connected') {
        // Server was previously connected but now has issues
        // Only update if it was auto-connected (preserve user tokens)
        if (currentTokenInfo.autoConnected) {
          setServerTokens((prev) =>
            new Map(prev).set(serverUrl, {
              ...currentTokenInfo,
              autoConnected: false, // No longer auto-connected
            }),
          );
        }
      }
    });
  }, [serverStatuses, serverTokens]);

  // Combined validation logic: token authenticated OR auto-connected
  const isServerValidated = React.useCallback(
    (serverUrl: string): boolean => {
      const tokenInfo = serverTokens.get(serverUrl);
      // Server is validated if it's either token-authenticated or auto-connected
      return tokenInfo?.authenticated || tokenInfo?.autoConnected || false;
    },
    [serverTokens],
  );

  // Token validation function
  const validateServerToken = React.useCallback(
    async (serverUrl: string, token: string) => {
      if (!selectedProject) {
        return { success: false, error: 'No project selected' };
      }

      setValidatingServers((prev) => new Set(prev).add(serverUrl));
      setValidationErrors((prev) => {
        const newMap = new Map(prev);
        newMap.delete(serverUrl);
        return newMap;
      });

      try {
        const status = await getMCPServerStatus(selectedProject, serverUrl, token);

        if (status.status === 'connected') {
          // Success - save token and mark as authenticated (not auto-connected)
          setServerTokens((prev) =>
            new Map(prev).set(serverUrl, {
              token,
              authenticated: true,
              autoConnected: false, // User provided token, not auto-connected
            }),
          );
          setValidationErrors((prev) => {
            const newMap = new Map(prev);
            newMap.delete(serverUrl);
            return newMap;
          });
          return { success: true };
        }
        // Error - save token but mark as not authenticated
        setServerTokens((prev) =>
          new Map(prev).set(serverUrl, {
            token,
            authenticated: false,
            autoConnected: false,
          }),
        );
        const errorMsg = status.error_details?.raw_error || status.message || 'Connection failed';
        setValidationErrors((prev) => new Map(prev).set(serverUrl, errorMsg));
        return { success: false, error: errorMsg };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Validation failed';
        setValidationErrors((prev) => new Map(prev).set(serverUrl, errorMsg));
        return { success: false, error: errorMsg };
      } finally {
        setValidatingServers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(serverUrl);
          return newSet;
        });
      }
    },
    [selectedProject],
  );

  const handleLockClick = React.useCallback(
    (server: MCPServer) => {
      const statusInfo = serverStatuses.get(server.connectionUrl);
      const tokenInfo = serverTokens.get(server.connectionUrl);

      // Show success alert if server is connected (either auto-connected or token-authenticated)
      const isAlreadyConnected =
        statusInfo?.status === 'connected' &&
        (tokenInfo?.authenticated || tokenInfo?.autoConnected || false);

      setSelectedServerForConfig(server);
      setIsSelectedServerAlreadyConnected(isAlreadyConnected);
      setConfigModalOpen(true);
    },
    [serverStatuses, serverTokens],
  );

  const handleToolsClick = React.useCallback((server: MCPServer) => {
    setSelectedServerForTools(server);
    setToolsModalOpen(true);
  }, []);

  const handleConfigModalClose = React.useCallback(() => {
    setConfigModalOpen(false);
    setSelectedServerForConfig(null);
    setIsSelectedServerAlreadyConnected(false);
  }, []);

  const handleToolsModalClose = React.useCallback(() => {
    setToolsModalOpen(false);
    setSelectedServerForTools(null);
  }, []);

  // Loading state
  if (projectLoading || !selectedProject || !serversLoaded) {
    return <EmptyState titleText="Loading" headingLevel="h4" icon={Spinner} />;
  }

  // Error state
  if (serversLoadError) {
    return (
      <EmptyState
        variant={EmptyStateVariant.xs}
        data-testid="ai-assets-empty-state"
        icon={CubesIcon}
        headingLevel="h6"
        titleText="No MCP configuration found"
      >
        <EmptyStateBody>
          This playground does not have an MCP configuration. Contact your cluster administrator to
          add MCP servers.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  // Empty state
  if (transformedServers.length === 0) {
    return (
      <EmptyState
        variant={EmptyStateVariant.xs}
        data-testid="ai-assets-empty-state"
        icon={CubesIcon}
        headingLevel="h6"
        titleText="No valid MCP servers available"
      >
        <EmptyStateBody>
          An MCP configuration exists, but no valid servers were found. Contact your cluster
          administrator to update the configuration.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <>
      <div className="mcp-servers-panel pf-v6-u-py-sm">
        <style>
          {`
            /* CSS override required because TableBase renders checkbox headers via special path
               that ignores col.className from column definition and only applies hardcoded styles */
            .mcp-servers-panel .pf-v6-c-table th[aria-label="Select all"] {
              text-align: center !important;
              width: 15% !important;
            }
            .mcp-servers-panel .pf-v6-c-table th[aria-label="Select all"] label {
              justify-content: center !important;
            }
          `}
        </style>
        <Table
          {...tableProps}
          data={transformedServers}
          columns={MCPPanelColumns}
          defaultSortColumn={0}
          enablePagination={false}
          rowRenderer={(server: MCPServer) => {
            const tokenInfo = serverTokens.get(server.connectionUrl);
            // Server is authenticated if it's either token-authenticated or auto-connected
            const isAuthenticated = tokenInfo?.authenticated || tokenInfo?.autoConnected || false;

            return (
              <MCPServerPanelRow
                key={server.id}
                server={server}
                isChecked={isSelected(server)}
                onToggleCheck={() => toggleSelection(server)}
                onLockClick={() => handleLockClick(server)}
                onToolsClick={() => handleToolsClick(server)}
                isValidated={isServerValidated(server.connectionUrl)}
                isLoading={validatingServers.has(server.connectionUrl)}
                isStatusLoading={statusesLoading.has(server.connectionUrl)}
                isAuthenticated={isAuthenticated}
              />
            );
          }}
          data-testid="mcp-servers-panel-table"
        />
      </div>
      {selectedServerForConfig && (
        <MCPServerConfigModal
          isOpen={configModalOpen}
          onClose={handleConfigModalClose}
          server={selectedServerForConfig}
          currentToken={serverTokens.get(selectedServerForConfig.connectionUrl)?.token || ''}
          onTokenSave={validateServerToken}
          isValidating={validatingServers.has(selectedServerForConfig.connectionUrl)}
          validationError={validationErrors.get(selectedServerForConfig.connectionUrl)}
          isAlreadyConnected={isSelectedServerAlreadyConnected}
        />
      )}
      {selectedServerForTools && (
        <MCPServerToolsModal
          isOpen={toolsModalOpen}
          onClose={handleToolsModalClose}
          server={selectedServerForTools}
          mcpBearerToken={serverTokens.get(selectedServerForTools.connectionUrl)?.token}
        />
      )}
    </>
  );
};

export default MCPServersPanel;
