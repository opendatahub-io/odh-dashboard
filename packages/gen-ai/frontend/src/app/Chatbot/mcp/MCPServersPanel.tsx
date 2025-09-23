import * as React from 'react';
import { EmptyState, Spinner, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
import { CubesIcon, UnknownIcon } from '@patternfly/react-icons';
import { useCheckboxTableBase, Table } from 'mod-arch-shared';
import { useMCPServers } from '~/app/hooks/useMCPServers';
import { getMCPServerStatus } from '~/app/services/llamaStackService';
import { MCPServer } from '~/app/types';
import { useMCPContext } from '~/app/context/MCPContext';
import { transformMCPServerData } from '~/app/utilities/mcp';
import { GenAiContext } from '~/app/context/GenAiContext';
import MCPPanelColumns from './MCPPanelColumns';
import MCPServerPanelRow from './MCPServerPanelRow';
import MCPServerConfigModal from './MCPServerConfigModal';
import MCPServerToolsModal from './MCPServerToolsModal';

interface MCPServersPanelProps {
  onSelectionChange?: (selectedServers: string[]) => void;
}

const MCPServersPanel: React.FC<MCPServersPanelProps> = ({ onSelectionChange }) => {
  const { namespace } = React.useContext(GenAiContext);
  const selectedProject = namespace?.name;
  const {
    playgroundSelectedServerIds,
    setSelectedServersCount,
    serverTokens,
    setServerTokens,
    checkServerStatus,
  } = useMCPContext();
  const {
    servers: apiServers,
    serversLoaded,
    serversLoadError,
    statusesLoading,
  } = useMCPServers(selectedProject || '', { autoCheckStatuses: false });

  const transformedServers = React.useMemo(
    () => apiServers.map(transformMCPServerData),
    [apiServers],
  );

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

  const [validationErrors, setValidationErrors] = React.useState<Map<string, string>>(new Map());
  const [validatingServers, setValidatingServers] = React.useState<Set<string>>(new Set());

  const [checkingServers, setCheckingServers] = React.useState<Set<string>>(new Set());

  const [selectedServers, setSelectedServers] = React.useState<MCPServer[]>([]);

  const { selections, tableProps, isSelected, toggleSelection } = useCheckboxTableBase(
    transformedServers,
    selectedServers,
    setSelectedServers,
    React.useCallback((server: MCPServer) => server.id, []),

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
    { selectAll: { tooltip: 'Select all MCP servers' } as any },
  );

  React.useEffect(() => {
    if (transformedServers.length > 0 && playgroundSelectedServerIds.length > 0) {
      const serversToSelect = transformedServers.filter((server) =>
        playgroundSelectedServerIds.includes(server.id),
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transformedServers, playgroundSelectedServerIds]);

  React.useEffect(() => {
    const selectedConnectionUrls = selectedServers.map((server) => server.id);
    setSelectedServersCount(selectedConnectionUrls.length);

    if (transformedServers.length > 0) {
      onSelectionChange?.(selectedConnectionUrls);
    }
  }, [
    selectedServers,
    onSelectionChange,
    setSelectedServersCount,
    selections,
    transformedServers.length,
  ]);

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
          setServerTokens((prev) =>
            new Map(prev).set(serverUrl, {
              token,
              authenticated: true,
              autoConnected: false,
            }),
          );
          setValidationErrors((prev) => {
            const newMap = new Map(prev);
            newMap.delete(serverUrl);
            return newMap;
          });

          return { success: true };
        }
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
    [selectedProject, setServerTokens],
  );

  const handleLockClick = React.useCallback(
    async (server: MCPServer) => {
      setCheckingServers((prev) => new Set(prev).add(server.connectionUrl));

      try {
        const statusInfo = await checkServerStatus(server.connectionUrl);

        if (statusInfo.status === 'connected') {
          setServerTokens((prev) =>
            new Map(prev).set(server.connectionUrl, {
              token: '',
              authenticated: true,
              autoConnected: true,
            }),
          );

          setSelectedServerForConfig(server);
          setIsSelectedServerAlreadyConnected(true);
          setConfigModalOpen(true);
        } else {
          setSelectedServerForConfig(server);
          setIsSelectedServerAlreadyConnected(false);
          setConfigModalOpen(true);
        }
      } catch {
        setSelectedServerForConfig(server);
        setIsSelectedServerAlreadyConnected(false);
        setConfigModalOpen(true);
      } finally {
        setCheckingServers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(server.connectionUrl);
          return newSet;
        });
      }
    },
    [checkServerStatus, setServerTokens],
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
      <div className="mcp-servers-panel pf-v6-u-py-sm">
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
            const isChecking = checkingServers.has(server.connectionUrl);

            return (
              <MCPServerPanelRow
                key={server.id}
                server={server}
                isChecked={isSelected(server)}
                onToggleCheck={() => toggleSelection(server)}
                onLockClick={() => handleLockClick(server)}
                onToolsClick={() => handleToolsClick(server)}
                isLoading={validatingServers.has(server.connectionUrl) || isChecking}
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
