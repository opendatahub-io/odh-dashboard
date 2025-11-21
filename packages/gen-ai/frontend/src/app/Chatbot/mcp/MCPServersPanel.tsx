import * as React from 'react';
import { EmptyState, Spinner, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
import { CubesIcon, UnknownIcon } from '@patternfly/react-icons';
import { useCheckboxTableBase, Table } from 'mod-arch-shared';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import { MCPServer, MCPServerFromAPI, TokenInfo } from '~/app/types';
import { transformMCPServerData, shouldTriggerAutoUnlock } from '~/app/utilities/mcp';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { ServerStatusInfo } from '~/app/hooks/useMCPServerStatuses';
import MCPPanelColumns from './MCPPanelColumns';
import MCPServerPanelRow from './MCPServerPanelRow';
import MCPServerConfigModal from './MCPServerConfigModal';
import MCPServerToolsModal from './MCPServerToolsModal';
import MCPServerSuccessModal from './MCPServerSuccessModal';

interface MCPServersPanelProps {
  // Data props (instead of contexts)
  servers: MCPServerFromAPI[];
  serversLoaded: boolean;
  serversLoadError?: Error | null;
  serverTokens: Map<string, TokenInfo>;
  onServerTokensChange: (tokens: Map<string, TokenInfo>) => void;
  checkServerStatus: (serverUrl: string, mcpBearerToken?: string) => Promise<ServerStatusInfo>;
  // Existing props
  onSelectionChange?: (selectedServers: string[]) => void;
  initialSelectedServerIds?: string[];
  initialServerStatuses?: Map<string, ServerStatusInfo>;
}

const MCP_AUTH_EVENT_NAME = 'Playground MCP Auth';

const MCPServersPanel: React.FC<MCPServersPanelProps> = ({
  servers: apiServers,
  serversLoaded,
  serversLoadError = null,
  serverTokens,
  onServerTokensChange: setServerTokens,
  checkServerStatus,
  onSelectionChange,
  initialSelectedServerIds,
  initialServerStatuses,
}) => {
  const { api, apiAvailable } = useGenAiAPI();

  // Compute statusesLoading from the received data
  const statusesLoading = React.useMemo(() => new Set<string>(), []);

  const transformedServers = React.useMemo(
    () => apiServers.map(transformMCPServerData),
    [apiServers],
  );

  const [configModalOpen, setConfigModalOpen] = React.useState(false);
  const [selectedServerForConfig, setSelectedServerForConfig] = React.useState<MCPServer | null>(
    null,
  );
  const [successModalOpen, setSuccessModalOpen] = React.useState(false);
  const [selectedServerForSuccess, setSelectedServerForSuccess] = React.useState<MCPServer | null>(
    null,
  );
  const [toolsModalOpen, setToolsModalOpen] = React.useState(false);
  const [selectedServerForTools, setSelectedServerForTools] = React.useState<MCPServer | null>(
    null,
  );

  const [validationErrors, setValidationErrors] = React.useState<Map<string, string>>(new Map());
  const [validatingServers, setValidatingServers] = React.useState<Set<string>>(new Set());

  const [checkingServers, setCheckingServers] = React.useState<Set<string>>(new Set());

  const [selectedServers, setSelectedServers] = React.useState<MCPServer[]>([]);

  // Track tools count per server (serverUrl -> count)
  const [serverToolsCount, setServerToolsCount] = React.useState<Map<string, number>>(new Map());

  // Track which servers are currently fetching tools
  const [fetchingToolsServers, setFetchingToolsServers] = React.useState<Set<string>>(new Set());

  // Track if initial load from route state is complete to prevent auto-unlock on mount
  const [isInitialLoadComplete, setIsInitialLoadComplete] = React.useState(false);

  // Track servers being auto-unlocked
  const [autoUnlockingServers, setAutoUnlockingServers] = React.useState<Set<string>>(new Set());

  const { selections, isSelected, toggleSelection } = useCheckboxTableBase(
    transformedServers,
    selectedServers,
    setSelectedServers,
    React.useCallback((server: MCPServer) => server.id, []),
  );

  // Sync selected servers from initialSelectedServerIds prop on initial load
  React.useEffect(() => {
    if (
      transformedServers.length > 0 &&
      initialSelectedServerIds &&
      initialSelectedServerIds.length > 0
    ) {
      const serversToSelect = transformedServers.filter((server) =>
        initialSelectedServerIds.includes(server.id),
      );

      if (serversToSelect.length > 0) {
        const currentSelectedIds = new Set(selectedServers.map((s) => s.id));
        const newSelectedIds = new Set(serversToSelect.map((s) => s.id));

        const isDifferent =
          currentSelectedIds.size !== newSelectedIds.size ||
          [...currentSelectedIds].some((id) => !newSelectedIds.has(id));

        if (isDifferent) {
          setSelectedServers(serversToSelect);
        }
      }
      // Mark initial load as complete after processing route state
      setIsInitialLoadComplete(true);
    } else if (transformedServers.length > 0) {
      // If no initial selected servers, mark load complete immediately
      setIsInitialLoadComplete(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transformedServers, initialSelectedServerIds]);

  // Auto-unlock servers that don't require tokens when coming from AI Assets
  React.useEffect(() => {
    if (
      isInitialLoadComplete &&
      initialServerStatuses &&
      initialServerStatuses.size > 0 &&
      selectedServers.length > 0
    ) {
      // Find servers that were selected from route and have 'connected' status
      const serversToAutoUnlock = selectedServers.filter((server) => {
        const statusInfo = initialServerStatuses.get(server.connectionUrl);
        const tokenInfo = serverTokens.get(server.connectionUrl);

        return (
          statusInfo?.status === 'connected' &&
          !tokenInfo?.authenticated &&
          !autoUnlockingServers.has(server.connectionUrl)
        );
      });

      // Auto-unlock each server without showing modal
      serversToAutoUnlock.forEach((server) => {
        handleAutoUnlock(server);
      });
    }
    // Only run when initial load completes and servers are selected
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialLoadComplete, initialServerStatuses, selectedServers.length]);

  React.useEffect(() => {
    const selectedConnectionUrls = selectedServers.map((server) => server.id);

    if (transformedServers.length > 0) {
      onSelectionChange?.(selectedConnectionUrls);
    }
  }, [selectedServers, onSelectionChange, selections, transformedServers.length]);

  // Function to fetch tools count for a server
  const fetchToolsCount = React.useCallback(
    async (serverUrl: string, token?: string) => {
      if (!apiAvailable) {
        return;
      }

      // Mark this server as fetching
      setFetchingToolsServers((prev) => new Set(prev).add(serverUrl));

      try {
        const headers: Record<string, string> = {};
        if (token && token.trim() !== '') {
          const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          headers['X-MCP-Bearer'] = bearerToken;
        }

        const response = await api.getMCPServerTools(
          {
            // eslint-disable-next-line camelcase
            server_url: serverUrl,
          },
          { headers },
        );

        if (response.status === 'success' && response.tools_count !== undefined) {
          setServerToolsCount((prev) => new Map(prev).set(serverUrl, response.tools_count || 0));
        }
      } catch (error) {
        // Silently fail - keep the count at 0
        // eslint-disable-next-line no-console
        console.error(`Failed to fetch tools count for ${serverUrl}:`, error);
      } finally {
        // Remove from fetching set
        setFetchingToolsServers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(serverUrl);
          return newSet;
        });
      }
    },
    [api, apiAvailable],
  );

  // Function to auto-unlock servers without showing confirmation modal
  const handleAutoUnlock = React.useCallback(
    async (server: MCPServer) => {
      setAutoUnlockingServers((prev) => new Set(prev).add(server.connectionUrl));

      try {
        const statusInfo = await checkServerStatus(server.connectionUrl);

        if (statusInfo.status === 'connected') {
          const newTokens = new Map(serverTokens);
          newTokens.set(server.connectionUrl, {
            token: '',
            authenticated: true,
            autoConnected: true,
          });
          setServerTokens(newTokens);

          // Fetch tools count for auto-connected server (silently)
          fetchToolsCount(server.connectionUrl, '');
        }
      } catch {
        // Silently fail - user can manually unlock later
      } finally {
        setAutoUnlockingServers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(server.connectionUrl);
          return newSet;
        });
      }
    },
    [checkServerStatus, setServerTokens, fetchToolsCount, serverTokens],
  );

  const validateServerToken = React.useCallback(
    async (serverUrl: string, token: string) => {
      if (!apiAvailable) {
        return { success: false, error: 'API is not available' };
      }

      setValidatingServers((prev) => new Set(prev).add(serverUrl));
      setValidationErrors((prev) => {
        const newMap = new Map(prev);
        newMap.delete(serverUrl);
        return newMap;
      });

      try {
        // Ensure token has Bearer prefix
        const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

        const status = await api.getMCPServerStatus(
          {
            // eslint-disable-next-line camelcase
            server_url: serverUrl,
          },
          {
            headers: {
              'X-MCP-Bearer': bearerToken,
            },
          },
        );

        if (status.status === 'connected') {
          const newTokens = new Map(serverTokens);
          newTokens.set(serverUrl, {
            token,
            authenticated: true,
            autoConnected: false,
          });
          setServerTokens(newTokens);
          setValidationErrors((prev) => {
            const newMap = new Map(prev);
            newMap.delete(serverUrl);
            return newMap;
          });

          fireFormTrackingEvent(MCP_AUTH_EVENT_NAME, {
            outcome: TrackingOutcome.submit,
            success: true,
          });

          // Fetch tools count after successful authentication
          fetchToolsCount(serverUrl, bearerToken);

          // Close config modal and open success modal
          setConfigModalOpen(false);
          const server = transformedServers.find((s) => s.connectionUrl === serverUrl);
          if (server) {
            setSelectedServerForSuccess(server);
            setSuccessModalOpen(true);
          }

          return { success: true };
        }
        const newTokens2 = new Map(serverTokens);
        newTokens2.set(serverUrl, {
          token,
          authenticated: false,
          autoConnected: false,
        });
        setServerTokens(newTokens2);
        const errorMsg = status.error_details?.raw_error || status.message || 'Connection failed';
        setValidationErrors((prev) => new Map(prev).set(serverUrl, errorMsg));
        fireFormTrackingEvent(MCP_AUTH_EVENT_NAME, {
          outcome: TrackingOutcome.submit,
          success: false,
          error: errorMsg,
        });
        return { success: false, error: errorMsg };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Validation failed';
        setValidationErrors((prev) => new Map(prev).set(serverUrl, errorMsg));
        fireFormTrackingEvent(MCP_AUTH_EVENT_NAME, {
          outcome: TrackingOutcome.submit,
          success: false,
          error: errorMsg,
        });
        return { success: false, error: errorMsg };
      } finally {
        setValidatingServers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(serverUrl);
          return newSet;
        });
      }
    },
    [api, apiAvailable, setServerTokens, fetchToolsCount, transformedServers, serverTokens],
  );

  const handleLockClick = React.useCallback(
    async (server: MCPServer) => {
      // Check if already authenticated
      const tokenInfo = serverTokens.get(server.connectionUrl);
      if (tokenInfo?.authenticated || tokenInfo?.autoConnected) {
        // Server is already authenticated, show success modal
        setSelectedServerForSuccess(server);
        setSuccessModalOpen(true);
        return;
      }

      setCheckingServers((prev) => new Set(prev).add(server.connectionUrl));
      fireMiscTrackingEvent('Playground MCP Start Auth', {
        mcpServerName: server.name,
      });

      try {
        const statusInfo = await checkServerStatus(server.connectionUrl);

        if (statusInfo.status === 'connected') {
          const newTokens3 = new Map(serverTokens);
          newTokens3.set(server.connectionUrl, {
            token: '',
            authenticated: true,
            autoConnected: true,
          });
          setServerTokens(newTokens3);

          // Fetch tools count for auto-connected server
          fetchToolsCount(server.connectionUrl, '');

          // Open success modal for auto-connected server
          setSelectedServerForSuccess(server);
          setSuccessModalOpen(true);
        } else {
          setSelectedServerForConfig(server);
          setConfigModalOpen(true);
        }
      } catch {
        setSelectedServerForConfig(server);
        setConfigModalOpen(true);
      } finally {
        setCheckingServers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(server.connectionUrl);
          return newSet;
        });
      }
    },
    [checkServerStatus, setServerTokens, fetchToolsCount, serverTokens],
  );

  const handleToolsClick = React.useCallback((server: MCPServer) => {
    setSelectedServerForTools(server);
    setToolsModalOpen(true);
    fireMiscTrackingEvent('Playground MCP View Tools', {
      mcpServerName: server.name,
    });
  }, []);

  const handleConfigModalClose = React.useCallback(() => {
    setConfigModalOpen(false);
    setSelectedServerForConfig(null);
    fireFormTrackingEvent(MCP_AUTH_EVENT_NAME, {
      outcome: TrackingOutcome.cancel,
    });
  }, []);

  const handleToolsModalClose = React.useCallback(() => {
    setToolsModalOpen(false);
    setSelectedServerForTools(null);
  }, []);

  const handleSuccessModalClose = React.useCallback(() => {
    setSuccessModalOpen(false);
    setSelectedServerForSuccess(null);
  }, []);

  const handleDisconnect = React.useCallback(
    (serverUrl: string) => {
      // Remove server from tokens map
      const newTokens = new Map(serverTokens);
      newTokens.delete(serverUrl);
      setServerTokens(newTokens);

      // Clear validation errors
      setValidationErrors((prev) => {
        const newMap = new Map(prev);
        newMap.delete(serverUrl);
        return newMap;
      });

      // Close success modal
      setSuccessModalOpen(false);
      setSelectedServerForSuccess(null);
    },
    [serverTokens, setServerTokens],
  );

  const handleEditToolsFromSuccess = React.useCallback((server: MCPServer) => {
    // Close success modal first
    setSuccessModalOpen(false);
    setSelectedServerForSuccess(null);

    // Then open tools modal
    setSelectedServerForTools(server);
    setToolsModalOpen(true);
  }, []);

  if (!serversLoaded) {
    return <EmptyState titleText="Loading" headingLevel="h4" icon={Spinner} />;
  }

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

  if (transformedServers.length === 0) {
    return (
      <EmptyState
        variant={EmptyStateVariant.xs}
        data-testid="ai-assets-empty-state"
        icon={UnknownIcon}
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
      <div className="mcp-servers-panel">
        <Table
          data={transformedServers}
          columns={MCPPanelColumns}
          defaultSortColumn={0}
          enablePagination={false}
          rowRenderer={(server: MCPServer) => {
            const tokenInfo = serverTokens.get(server.connectionUrl);
            // Server is authenticated if it's either token-authenticated or auto-connected
            const isAuthenticated = tokenInfo?.authenticated || tokenInfo?.autoConnected || false;
            const isChecking = checkingServers.has(server.connectionUrl);
            const toolsCount = serverToolsCount.get(server.connectionUrl);
            const isFetchingTools = fetchingToolsServers.has(server.connectionUrl);

            return (
              <MCPServerPanelRow
                key={server.id}
                server={server}
                isChecked={isSelected(server)}
                onToggleCheck={() => {
                  const wasSelected = isSelected(server);
                  toggleSelection(server);
                  fireMiscTrackingEvent('Playground MCP Select', {
                    mcpServerName: server.name,
                    isSelected: !wasSelected,
                  });

                  // Check if auto-unlock should be triggered using utility function
                  if (
                    shouldTriggerAutoUnlock({
                      isInitialLoadComplete,
                      wasSelected,
                      isAuthenticated,
                      isChecking,
                      isValidating: validatingServers.has(server.connectionUrl),
                    })
                  ) {
                    // Trigger the unlock flow automatically
                    handleLockClick(server);
                  }
                }}
                onLockClick={() => handleLockClick(server)}
                onToolsClick={() => handleToolsClick(server)}
                isLoading={validatingServers.has(server.connectionUrl) || isChecking}
                isStatusLoading={statusesLoading.has(server.connectionUrl)}
                isAuthenticated={isAuthenticated}
                toolsCount={toolsCount}
                isFetchingTools={isFetchingTools}
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
      {selectedServerForSuccess && (
        <MCPServerSuccessModal
          isOpen={successModalOpen}
          onClose={handleSuccessModalClose}
          server={selectedServerForSuccess}
          toolsCount={serverToolsCount.get(selectedServerForSuccess.connectionUrl)}
          onEditTools={() => handleEditToolsFromSuccess(selectedServerForSuccess)}
          onDisconnect={() => handleDisconnect(selectedServerForSuccess.connectionUrl)}
        />
      )}
    </>
  );
};

export default MCPServersPanel;
