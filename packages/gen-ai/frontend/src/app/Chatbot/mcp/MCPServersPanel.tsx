import * as React from 'react';
import { EmptyState, Spinner, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
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
}) => {
  const { api, apiAvailable } = useGenAiAPI();

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
            const tokenInfo = tokenManagement.getToken(server.connectionUrl);
            const isAuthenticated = tokenInfo?.authenticated || tokenInfo?.autoConnected || false;
            const isChecking = validation.checkingServers.has(server.connectionUrl);
            const toolsCount = toolsManagement.serverToolsCount.get(server.connectionUrl);
            const isFetchingTools = toolsManagement.fetchingToolsServers.has(server.connectionUrl);

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
      {successModal.selectedItem && (
        <MCPServerSuccessModal
          isOpen={successModal.isOpen}
          onClose={handleSuccessModalClose}
          server={successModal.selectedItem}
          toolsCount={toolsManagement.serverToolsCount.get(successModal.selectedItem.connectionUrl)}
          onEditTools={() => handleEditToolsFromSuccess(successModal.selectedItem!)}
          onDisconnect={() => handleDisconnect(successModal.selectedItem!.connectionUrl)}
        />
      )}
    </>
  );
};

export default MCPServersPanel;
