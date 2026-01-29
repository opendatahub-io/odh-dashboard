import * as React from 'react';
import {
  Alert,
  EmptyState,
  Spinner,
  EmptyStateBody,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { CubesIcon, UnknownIcon } from '@patternfly/react-icons';
import { useCheckboxTableBase, Table } from 'mod-arch-shared';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import { MCPServer, MCPServerFromAPI } from '~/app/types';
import { transformMCPServerData, shouldTriggerAutoUnlock } from '~/app/utilities/mcp';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { useMCPToolSelections } from '~/app/hooks/useMCPToolSelections';
import { GenAiContext } from '~/app/context/GenAiContext';
import { ServerStatusInfo } from '~/app/hooks/useMCPServerStatuses';
import MCPPanelColumns from './MCPPanelColumns';
import MCPServerPanelRow from './MCPServerPanelRow';
import MCPServerConfigModal from './MCPServerConfigModal';
import MCPServerToolsModal from './MCPServerToolsModal';
import MCPServerSuccessModal from './MCPServerSuccessModal';
import useModalState from './hooks/useModalState';
import useServerTokens from './hooks/useServerTokens';
import useServerTools from './hooks/useServerTools';
import useTokenValidation from './hooks/useTokenValidation';
import useServerSelection from './hooks/useServerSelection';
import useAutoUnlock from './hooks/useAutoUnlock';

interface MCPServersPanelProps {
  servers: MCPServerFromAPI[];
  serversLoaded: boolean;
  serversLoadError?: Error | null;
  serverTokens: Map<string, import('~/app/types').TokenInfo>;
  onServerTokensChange: (tokens: Map<string, import('~/app/types').TokenInfo>) => void;
  checkServerStatus: (serverUrl: string, mcpBearerToken?: string) => Promise<ServerStatusInfo>;
  onSelectionChange?: (selectedServers: string[]) => void;
  initialSelectedServerIds?: string[];
  initialServerStatuses?: Map<string, ServerStatusInfo>;
  onToolsWarningChange?: (showWarning: boolean) => void;
  onActiveToolsCountChange?: (count: number) => void;
}

const MCP_AUTH_EVENT_NAME = 'Playground MCP Auth';

const MCPServersPanel: React.FC<MCPServersPanelProps> = ({
  servers: apiServers,
  serversLoaded,
  serversLoadError = null,
  serverTokens: initialServerTokens,
  onServerTokensChange,
  checkServerStatus,
  onSelectionChange,
  initialSelectedServerIds,
  initialServerStatuses,
  onToolsWarningChange,
  onActiveToolsCountChange,
}) => {
  const { api, apiAvailable } = useGenAiAPI();
  const { namespace } = React.useContext(GenAiContext);
  const { getToolSelections } = useMCPToolSelections();

  const statusesLoading = React.useMemo(() => new Set<string>(), []);

  const transformedServers = React.useMemo(
    () => apiServers.map(transformMCPServerData),
    [apiServers],
  );

  // Token management
  const tokenManagement = useServerTokens({
    onServerTokensChange,
    initialTokens: initialServerTokens,
  });

  // Tools management
  const toolsManagement = useServerTools({ api, apiAvailable });

  // Modals
  const configModal = useModalState<MCPServer>();
  const toolsModal = useModalState<MCPServer>();
  const successModal = useModalState<MCPServer>();

  // Token validation
  const validation = useTokenValidation({
    api,
    apiAvailable,
    transformedServers,
    checkServerStatus,
    onTokenUpdate: tokenManagement.updateToken,
    getToken: tokenManagement.getToken,
    onFetchTools: toolsManagement.fetchToolsCount,
    onConfigModalOpen: configModal.openModal,
    onConfigModalClose: configModal.closeModal,
    onSuccessModalOpen: successModal.openModal,
  });

  // Server selection
  const selection = useServerSelection({
    transformedServers,
    initialSelectedServerIds,
    onSelectionChange,
  });

  // Auto-unlock
  useAutoUnlock({
    checkServerStatus,
    selectedServers: selection.selectedServers,
    isInitialLoadComplete: selection.isInitialLoadComplete,
    initialServerStatuses,
    getToken: tokenManagement.getToken,
    onTokenUpdate: tokenManagement.updateToken,
    onFetchTools: toolsManagement.fetchToolsCount,
  });

  // Table integration
  const { isSelected, toggleSelection } = useCheckboxTableBase(
    transformedServers,
    selection.selectedServers,
    selection.setSelectedServers,
    React.useCallback((server: MCPServer) => server.id, []),
  );

  const getToolCounts = React.useCallback(
    (serverUrl: string) => {
      const namespaceName = namespace?.name;
      const totalToolsCount = toolsManagement.serverToolsCount.get(serverUrl);
      const savedTools = namespaceName ? getToolSelections(namespaceName, serverUrl) : undefined;
      // If savedTools is undefined (never configured), all tools are selected by default
      const selectedToolsCount = savedTools === undefined ? totalToolsCount : savedTools.length;

      return { totalToolsCount, selectedToolsCount };
    },
    [namespace?.name, toolsManagement.serverToolsCount, getToolSelections],
  );

  // Calculate total active tools across all connected AND selected servers
  const totalActiveTools = React.useMemo(() => {
    let total = 0;
    selection.selectedServers.forEach((server) => {
      const tokenInfo = tokenManagement.getToken(server.connectionUrl);
      const isAuthenticated = tokenInfo?.authenticated || tokenInfo?.autoConnected || false;

      if (isAuthenticated) {
        const { selectedToolsCount } = getToolCounts(server.connectionUrl);
        total += selectedToolsCount ?? 0;
      }
    });
    return total;
  }, [selection.selectedServers, tokenManagement, getToolCounts]);

  const showToolsWarning = totalActiveTools > 40;

  // Notify parent when tools warning state changes
  React.useEffect(() => {
    onToolsWarningChange?.(showToolsWarning);
  }, [showToolsWarning, onToolsWarningChange]);

  // Notify parent when active tools count changes
  React.useEffect(() => {
    onActiveToolsCountChange?.(totalActiveTools);
  }, [totalActiveTools, onActiveToolsCountChange]);

  const handleConfigModalClose = React.useCallback(() => {
    configModal.closeModal();
    fireFormTrackingEvent(MCP_AUTH_EVENT_NAME, {
      outcome: TrackingOutcome.cancel,
    });
  }, [configModal]);

  const handleToolsModalClose = React.useCallback(() => {
    toolsModal.closeModal();
  }, [toolsModal]);

  const handleSuccessModalClose = React.useCallback(() => {
    successModal.closeModal();
  }, [successModal]);

  const handleDisconnect = React.useCallback(
    (serverUrl: string) => {
      tokenManagement.removeToken(serverUrl);
      validation.clearValidationError(serverUrl);
      successModal.closeModal();
    },
    [tokenManagement, validation, successModal],
  );

  const handleEditToolsFromSuccess = React.useCallback(
    (server: MCPServer) => {
      successModal.closeModal();
      toolsModal.openModal(server);
    },
    [successModal, toolsModal],
  );

  const handleToolsClick = React.useCallback(
    (server: MCPServer) => {
      toolsModal.openModal(server);
      fireMiscTrackingEvent('Playground MCP View Tools', {
        mcpServerName: server.name,
      });
    },
    [toolsModal],
  );

  const successModalProps = React.useMemo(() => {
    if (!successModal.selectedItem) {
      return null;
    }

    const { totalToolsCount, selectedToolsCount } = getToolCounts(
      successModal.selectedItem.connectionUrl,
    );

    return {
      server: successModal.selectedItem,
      selectedToolsCount,
      totalToolsCount,
      onEditTools: () => handleEditToolsFromSuccess(successModal.selectedItem!),
      onDisconnect: () => handleDisconnect(successModal.selectedItem!.connectionUrl),
    };
  }, [successModal.selectedItem, getToolCounts, handleEditToolsFromSuccess, handleDisconnect]);

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
        titleText="No MCP servers available"
      >
        <EmptyStateBody>
          Contact your cluster administrator to request that MCP servers be configured for use in
          the playground.
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
        {showToolsWarning && (
          <Alert
            variant="warning"
            isInline
            title="Performance may be degraded with more than 40 active tools."
            className="pf-v6-u-mb-md"
            data-testid="mcp-tools-warning-alert"
          />
        )}
        <Table
          data={transformedServers}
          columns={MCPPanelColumns}
          defaultSortColumn={0}
          enablePagination={false}
          rowRenderer={(server: MCPServer) => {
            const tokenInfo = tokenManagement.getToken(server.connectionUrl);
            const isAuthenticated = tokenInfo?.authenticated || tokenInfo?.autoConnected || false;
            const isChecking = validation.checkingServers.has(server.connectionUrl);
            const isFetchingTools = toolsManagement.fetchingToolsServers.has(server.connectionUrl);

            const { selectedToolsCount: toolsCount } = getToolCounts(server.connectionUrl);

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

                  if (
                    shouldTriggerAutoUnlock({
                      isInitialLoadComplete: selection.isInitialLoadComplete,
                      wasSelected,
                      isAuthenticated,
                      isChecking,
                      isValidating: validation.validatingServers.has(server.connectionUrl),
                    })
                  ) {
                    validation.handleLockClick(server);
                  }
                }}
                onLockClick={() => validation.handleLockClick(server)}
                onToolsClick={() => handleToolsClick(server)}
                isLoading={validation.validatingServers.has(server.connectionUrl) || isChecking}
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
      {configModal.selectedItem && (
        <MCPServerConfigModal
          isOpen={configModal.isOpen}
          onClose={handleConfigModalClose}
          server={configModal.selectedItem}
          currentToken={
            tokenManagement.getToken(configModal.selectedItem.connectionUrl)?.token || ''
          }
          onTokenSave={validation.validateServerToken}
          isValidating={validation.validatingServers.has(configModal.selectedItem.connectionUrl)}
          validationError={validation.validationErrors.get(configModal.selectedItem.connectionUrl)}
        />
      )}
      {toolsModal.selectedItem && (
        <MCPServerToolsModal
          isOpen={toolsModal.isOpen}
          onClose={handleToolsModalClose}
          server={toolsModal.selectedItem}
          mcpBearerToken={tokenManagement.getToken(toolsModal.selectedItem.connectionUrl)?.token}
        />
      )}
      {successModalProps && (
        <MCPServerSuccessModal
          isOpen={successModal.isOpen}
          onClose={handleSuccessModalClose}
          {...successModalProps}
        />
      )}
    </>
  );
};

export default MCPServersPanel;
