import * as React from 'react';
import {
  Alert,
  Dropdown,
  DropdownItem,
  DropdownList,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  ExpandableSection,
  ExpandableSectionToggle,
  Flex,
  FlexItem,
  Label,
  MenuToggle,
  Spinner,
} from '@patternfly/react-core';
import { CubesIcon, EllipsisVIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import { useCheckboxTableBase, Table } from 'mod-arch-shared';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import SupportIconDark from '~/app/bgimages/support-icon-dark.svg';
import SupportIconLight from '~/app/bgimages/support-icon-light.svg';
import { MCPServer, MCPServerFromAPI } from '~/app/types';
import { transformMCPServerData, shouldTriggerAutoUnlock } from '~/app/utilities/mcp';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { GenAiContext } from '~/app/context/GenAiContext';
import { ServerStatusInfo } from '~/app/hooks/useMCPServerStatuses';
import { useChatbotConfigStore, selectSelectedMcpServerIds } from '~/app/Chatbot/store';
import useDarkMode from '~/app/Chatbot/hooks/useDarkMode';
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
  configId: string;
  servers: MCPServerFromAPI[];
  serversLoaded: boolean;
  serversLoadError?: Error | null;
  registryAvailable?: boolean;
  serverTokens: Map<string, import('~/app/types').TokenInfo>;
  onServerTokensChange: (tokens: Map<string, import('~/app/types').TokenInfo>) => void;
  checkServerStatus: (serverUrl: string, mcpBearerToken?: string) => Promise<ServerStatusInfo>;
  initialServerStatuses?: Map<string, ServerStatusInfo>;
  onToolsWarningChange?: (showWarning: boolean) => void;
  onActiveToolsCountChange?: (count: number) => void;
}

const MCP_AUTH_EVENT_NAME = 'Playground MCP Auth';
const MCP_CATALOG_URL = '/ai-hub/mcp-servers?tab=catalog';

const MCPServersPanel: React.FC<MCPServersPanelProps> = ({
  configId,
  servers: apiServers,
  serversLoaded,
  serversLoadError = null,
  registryAvailable = false,
  serverTokens: initialServerTokens,
  onServerTokensChange,
  checkServerStatus,
  initialServerStatuses,
  onToolsWarningChange,
  onActiveToolsCountChange,
}) => {
  const isDarkMode = useDarkMode();
  const { api, apiAvailable } = useGenAiAPI();
  const { namespace } = React.useContext(GenAiContext);

  const initialSelectedServerIds = useChatbotConfigStore(selectSelectedMcpServerIds(configId));

  const getToolSelections = React.useCallback(
    (namespaceName: string, serverUrl: string) =>
      useChatbotConfigStore.getState().getToolSelections(configId, namespaceName, serverUrl),
    [configId],
  );

  const statusesLoading = React.useMemo(() => new Set<string>(), []);

  const transformedServers = React.useMemo(
    () => apiServers.map(transformMCPServerData),
    [apiServers],
  );

  // Split servers by source for grouped rendering
  const registeredServers = React.useMemo(
    () => transformedServers.filter((s) => s.source === 'registry'),
    [transformedServers],
  );

  const manualServers = React.useMemo(
    () => transformedServers.filter((s) => s.source !== 'registry'),
    [transformedServers],
  );

  const showRegisteredSection = registryAvailable && registeredServers.length > 0;

  // Section expand/collapse state
  const [isRegisteredExpanded, setIsRegisteredExpanded] = React.useState(true);
  const [isManualExpanded, setIsManualExpanded] = React.useState(true);
  const [isKebabOpen, setIsKebabOpen] = React.useState(false);

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
  const onSelectionChange = React.useCallback(
    (serverIds: string[]) => {
      useChatbotConfigStore.getState().updateSelectedMcpServerIds(configId, serverIds);
    },
    [configId],
  );

  const selection = useServerSelection({
    transformedServers,
    initialSelectedServerIds,
    onSelectionChange,
  });

  const selectedRegisteredCount = React.useMemo(
    () => selection.selectedServers.filter((s) => s.source === 'registry').length,
    [selection.selectedServers],
  );

  // Auto-unlock
  const { autoUnlockingServers } = useAutoUnlock({
    checkServerStatus,
    selectedServers: selection.selectedServers,
    isInitialLoadComplete: selection.isInitialLoadComplete,
    initialServerStatuses,
    getToken: tokenManagement.getToken,
    onTokenUpdate: tokenManagement.updateToken,
    onFetchTools: toolsManagement.fetchToolsCount,
  });

  // Table integration (checkboxes for selecting servers)
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

  const showAuthRequiredBanner =
    selection.isInitialLoadComplete &&
    selection.selectedServers.some((server) => {
      const tokenInfo = tokenManagement.getToken(server.connectionUrl);
      const isAuthenticated = tokenInfo?.authenticated || tokenInfo?.autoConnected || false;
      const isServerLoading =
        validation.validatingServers.has(server.connectionUrl) ||
        validation.checkingServers.has(server.connectionUrl) ||
        autoUnlockingServers.has(server.connectionUrl);
      return !isAuthenticated && !isServerLoading;
    });

  React.useEffect(() => {
    onToolsWarningChange?.(showToolsWarning);
  }, [showToolsWarning, onToolsWarningChange]);

  React.useEffect(() => {
    onActiveToolsCountChange?.(totalActiveTools);
  }, [totalActiveTools, onActiveToolsCountChange]);

  const handleConfigModalClose = React.useCallback(() => {
    if (configModal.selectedItem) {
      const serverToDeselect = transformedServers.find(
        (server) => server.id === configModal.selectedItem!.id,
      );
      if (serverToDeselect && isSelected(serverToDeselect)) {
        const tokenInfo = tokenManagement.getToken(serverToDeselect.connectionUrl);
        const isAuthenticated = tokenInfo?.authenticated || tokenInfo?.autoConnected || false;
        if (!isAuthenticated) {
          toggleSelection(serverToDeselect);
        }
      }
    }
    configModal.closeModal();
    fireFormTrackingEvent(MCP_AUTH_EVENT_NAME, {
      outcome: TrackingOutcome.cancel,
    });
  }, [configModal, transformedServers, isSelected, toggleSelection, tokenManagement]);

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

  const renderServerRow = (server: MCPServer) => {
    const tokenInfo = tokenManagement.getToken(server.connectionUrl);
    const isAuthenticated = tokenInfo?.authenticated || tokenInfo?.autoConnected || false;
    const isChecking = validation.checkingServers.has(server.connectionUrl);
    const isFetchingTools = toolsManagement.fetchingToolsServers.has(server.connectionUrl);
    const isServerLoading = validation.validatingServers.has(server.connectionUrl) || isChecking;
    const needsAuthorization =
      selection.isInitialLoadComplete &&
      isSelected(server) &&
      !isAuthenticated &&
      !isServerLoading &&
      !autoUnlockingServers.has(server.connectionUrl);

    const { selectedToolsCount: toolsCount } = getToolCounts(server.connectionUrl);

    return (
      <MCPServerPanelRow
        key={server.id}
        server={server}
        isChecked={isSelected(server)}
        isDisabled={false}
        needsAuthorization={needsAuthorization}
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
  };

  if (!serversLoaded) {
    return <EmptyState titleText="Loading" headingLevel="h4" icon={Spinner} />;
  }

  if (serversLoadError) {
    return (
      <EmptyState
        variant={EmptyStateVariant.xs}
        data-testid="mcp-servers-load-error"
        icon={() => (
          <img
            src={isDarkMode ? SupportIconLight : SupportIconDark}
            alt="Support icon"
            style={{ width: '56px', height: '56px' }}
          />
        )}
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

  const renderServerTable = (servers: MCPServer[], tableTestId: string) => (
    <Table
      data={servers}
      columns={MCPPanelColumns}
      defaultSortColumn={0}
      enablePagination={false}
      rowRenderer={renderServerRow}
      data-testid={tableTestId}
    />
  );

  const alerts = (
    <>
      {showAuthRequiredBanner && (
        <Alert
          variant="warning"
          isInline
          title="Authorization needed for selected MCPs"
          className="pf-v6-u-mb-md"
          data-testid="mcp-auth-required-alert"
        />
      )}
      {showToolsWarning && (
        <Alert
          variant="warning"
          isInline
          title="Performance may be degraded with more than 40 active tools."
          className="pf-v6-u-mb-md"
          data-testid="mcp-tools-warning-alert"
        />
      )}
    </>
  );

  const modals = (
    <>
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
          configId={configId}
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

  // Grouped layout: show Registered + Manual Connection sections
  if (showRegisteredSection) {
    return (
      <>
        <div className="mcp-servers-panel">
          {alerts}

          {/* Registered section */}
          <div className="pf-v6-u-mb-md" data-testid="mcp-registered-section">
            <Flex
              justifyContent={{ default: 'justifyContentSpaceBetween' }}
              alignItems={{ default: 'alignItemsCenter' }}
              className="pf-v6-u-mb-sm"
            >
              <FlexItem>
                <Flex
                  alignItems={{ default: 'alignItemsCenter' }}
                  gap={{ default: 'gapSm' }}
                  flexWrap={{ default: 'nowrap' }}
                >
                  <FlexItem>
                    <ExpandableSectionToggle
                      toggleId="mcp-registered-section-toggle"
                      isExpanded={isRegisteredExpanded}
                      onToggle={() => setIsRegisteredExpanded((prev) => !prev)}
                      contentId="mcp-registered-content"
                      data-testid="mcp-registered-toggle"
                    >
                      Registered
                    </ExpandableSectionToggle>
                  </FlexItem>
                  <FlexItem>
                    <Label variant="outline" data-testid="mcp-registered-count-badge">
                      {selectedRegisteredCount} of {registeredServers.length} servers on
                    </Label>
                  </FlexItem>
                </Flex>
              </FlexItem>
              <FlexItem>
                <Dropdown
                  isOpen={isKebabOpen}
                  onSelect={() => setIsKebabOpen(false)}
                  onOpenChange={setIsKebabOpen}
                  toggle={(toggleRef) => (
                    <MenuToggle
                      ref={toggleRef}
                      variant="plain"
                      onClick={() => setIsKebabOpen((prev) => !prev)}
                      isExpanded={isKebabOpen}
                      aria-label="Registered servers actions"
                      data-testid="mcp-registered-kebab"
                    >
                      <EllipsisVIcon />
                    </MenuToggle>
                  )}
                  popperProps={{ position: 'right' }}
                >
                  <DropdownList>
                    <DropdownItem
                      key="manage-servers"
                      icon={<ExternalLinkAltIcon />}
                      onClick={() => window.open(MCP_CATALOG_URL, '_blank', 'noopener,noreferrer')}
                      data-testid="mcp-manage-servers-link"
                    >
                      Manage servers in AI Hub
                    </DropdownItem>
                  </DropdownList>
                </Dropdown>
              </FlexItem>
            </Flex>
            <ExpandableSection
              isExpanded={isRegisteredExpanded}
              isDetached
              contentId="mcp-registered-content"
              toggleId="mcp-registered-section-toggle"
            >
              {renderServerTable(registeredServers, 'mcp-registered-servers-table')}
            </ExpandableSection>
          </div>

          {/* Manual Connection section */}
          <div data-testid="mcp-manual-section">
            <div className="pf-v6-u-mb-sm">
              <ExpandableSectionToggle
                toggleId="mcp-manual-section-toggle"
                isExpanded={isManualExpanded}
                onToggle={() => setIsManualExpanded((prev) => !prev)}
                contentId="mcp-manual-content"
                data-testid="mcp-manual-toggle"
              >
                Manual Connection
              </ExpandableSectionToggle>
            </div>
            <ExpandableSection
              isExpanded={isManualExpanded}
              isDetached
              contentId="mcp-manual-content"
              toggleId="mcp-manual-section-toggle"
            >
              {manualServers.length === 0 ? (
                <EmptyState
                  variant={EmptyStateVariant.xs}
                  icon={CubesIcon}
                  headingLevel="h6"
                  titleText="No manual servers configured"
                  data-testid="mcp-manual-empty-state"
                >
                  <EmptyStateBody>
                    Manual servers are configured directly in this workspace. Registered servers
                    from your organization&rsquo;s MCP registry appear above.
                  </EmptyStateBody>
                </EmptyState>
              ) : (
                renderServerTable(manualServers, 'mcp-manual-servers-table')
              )}
            </ExpandableSection>
          </div>
        </div>
        {modals}
      </>
    );
  }

  // Flat layout: no registry, show Manual Connection section only
  return (
    <>
      <div className="mcp-servers-panel">
        {alerts}
        <div data-testid="mcp-manual-section">
          <div className="pf-v6-u-mb-sm">
            <ExpandableSectionToggle
              toggleId="mcp-manual-section-toggle"
              isExpanded={isManualExpanded}
              onToggle={() => setIsManualExpanded((prev) => !prev)}
              contentId="mcp-manual-content"
              data-testid="mcp-manual-toggle"
            >
              Manual Connection
            </ExpandableSectionToggle>
          </div>
          <ExpandableSection
            isExpanded={isManualExpanded}
            isDetached
            contentId="mcp-manual-content"
            toggleId="mcp-manual-section-toggle"
          >
            {manualServers.length === 0 ? (
              <EmptyState
                variant={EmptyStateVariant.xs}
                icon={CubesIcon}
                headingLevel="h6"
                titleText="No manual servers configured"
                data-testid="mcp-manual-empty-state"
              >
                <EmptyStateBody>
                  Manual servers are configured directly in this workspace.
                </EmptyStateBody>
              </EmptyState>
            ) : (
              renderServerTable(manualServers, 'mcp-manual-servers-table')
            )}
          </ExpandableSection>
        </div>
      </div>
      {modals}
    </>
  );
};

export default MCPServersPanel;
