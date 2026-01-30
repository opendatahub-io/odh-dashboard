import * as React from 'react';
import {
  Divider,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  DropEvent,
} from '@patternfly/react-core';
import { Chatbot, ChatbotContent, ChatbotDisplayMode } from '@patternfly/chatbot';
import { useLocation } from 'react-router-dom';
import { useUserContext } from '~/app/context/UserContext';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { GenAiContext } from '~/app/context/GenAiContext';
import useFetchBFFConfig from '~/app/hooks/useFetchBFFConfig';
import useFetchGuardrailModels from '~/app/hooks/useFetchGuardrailModels';
import { isLlamaModelEnabled } from '~/app/utilities';
import { TokenInfo } from '~/app/types';
import useFetchMCPServers from '~/app/hooks/useFetchMCPServers';
import useMCPServerStatuses from '~/app/hooks/useMCPServerStatuses';
import { ChatbotSourceSettingsModal } from './sourceUpload/ChatbotSourceSettingsModal';
import useSourceManagement from './hooks/useSourceManagement';
import useAlertManagement from './hooks/useAlertManagement';
import { UseChatbotMessagesReturn } from './hooks/useChatbotMessages';
import { ChatbotConfigInstance } from './ChatbotConfigInstance';
import useFileManagement from './hooks/useFileManagement';
import useDarkMode from './hooks/useDarkMode';
import { ChatbotSettingsPanel } from './components/ChatbotSettingsPanel';
import ChatbotPaneHeader from './components/ChatbotPaneHeader';
import ChatbotMessageInput from './components/ChatbotMessageInput';
import SourceUploadErrorAlert from './components/alerts/SourceUploadErrorAlert';
import SourceUploadSuccessAlert from './components/alerts/SourceUploadSuccessAlert';
import SourceDeleteSuccessAlert from './components/alerts/SourceDeleteSuccessAlert';
import ViewCodeModal from './components/ViewCodeModal';
import NewChatModal from './components/NewChatModal';
import ChatbotPane from './ChatbotPane';
import {
  useChatbotConfigStore,
  selectSelectedModel,
  selectConfigIds,
  selectGuardrail,
  DEFAULT_CONFIG_ID,
  getConfigDisplayLabel,
} from './store';

/**
 * Wrapper for compare mode panes that subscribes to Zustand store for reactive model updates.
 */
interface ComparePaneWrapperProps {
  configId: string;
  displayLabel: string;
  onModelChange: (model: string) => void;
  onSettingsClick: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

const ComparePaneWrapper: React.FC<ComparePaneWrapperProps> = ({
  configId,
  displayLabel,
  onModelChange,
  onSettingsClick,
  onClose,
  children,
}) => {
  const selectedModel = useChatbotConfigStore(selectSelectedModel(configId));

  return (
    <ChatbotPane
      configId={configId}
      displayLabel={displayLabel}
      selectedModel={selectedModel}
      onModelChange={onModelChange}
      onSettingsClick={onSettingsClick}
      onClose={onClose}
    >
      {children}
    </ChatbotPane>
  );
};

type ChatbotPlaygroundProps = {
  isViewCodeModalOpen: boolean;
  setIsViewCodeModalOpen: (isOpen: boolean) => void;
  isNewChatModalOpen: boolean;
  setIsNewChatModalOpen: (isOpen: boolean) => void;
  activePaneConfigId?: string;
  setActivePaneConfigId?: (configId: string) => void;
  onClosePane?: (configId: string) => void;
  clearAllMessagesRef?: React.MutableRefObject<(() => void) | null>;
};

const ChatbotPlayground: React.FC<ChatbotPlaygroundProps> = ({
  isViewCodeModalOpen,
  setIsViewCodeModalOpen,
  isNewChatModalOpen,
  setIsNewChatModalOpen,
  activePaneConfigId = DEFAULT_CONFIG_ID,
  setActivePaneConfigId,
  onClosePane,
  clearAllMessagesRef,
}) => {
  const { username } = useUserContext();
  const { namespace } = React.useContext(GenAiContext);
  const { models, modelsLoaded, aiModels, maasModels, lastInput, setLastInput } =
    React.useContext(ChatbotContext);

  const { data: bffConfig } = useFetchBFFConfig();
  const isDarkMode = useDarkMode();

  // Store state
  const configIds = useChatbotConfigStore(selectConfigIds);
  const isCompareMode = configIds.length > 1;
  const primaryConfigId = configIds[0] || DEFAULT_CONFIG_ID;
  const primarySelectedModel = useChatbotConfigStore(selectSelectedModel(primaryConfigId));
  const guardrail = useChatbotConfigStore(selectGuardrail(primaryConfigId));

  // Guardrails
  const {
    data: guardrailModelConfigs,
    modelNames: guardrailModelNames,
    loaded: guardrailModelsLoaded,
  } = useFetchGuardrailModels();

  // Router state
  const location = useLocation();
  const selectedAAModel = location.state?.model;
  const mcpServersFromRoute = React.useMemo(() => {
    const servers = location.state?.mcpServers;
    return Array.isArray(servers) ? servers : [];
  }, [location.state?.mcpServers]);
  const mcpServerStatusesFromRoute = React.useMemo(() => {
    const statuses = location.state?.mcpServerStatuses;
    return statuses ? new Map(Object.entries(statuses)) : new Map();
  }, [location.state?.mcpServerStatuses]);

  // MCP hooks
  const {
    data: mcpServers = [],
    loaded: mcpServersLoaded,
    error: mcpServersLoadError,
  } = useFetchMCPServers();
  const { serverStatuses: mcpServerStatuses, checkServerStatus: checkMcpServerStatus } =
    useMCPServerStatuses(mcpServers, mcpServersLoaded);
  const [mcpServerTokens, setMcpServerTokens] = React.useState<Map<string, TokenInfo>>(new Map());

  // UI state
  const [isDrawerExpanded, setIsDrawerExpanded] = React.useState(true);

  // Custom hooks
  const alertManagement = useAlertManagement();
  const fileManagement = useFileManagement({
    onShowDeleteSuccessAlert: alertManagement.onShowDeleteSuccessAlert,
    onShowErrorAlert: alertManagement.onShowErrorAlert,
  });
  const sourceManagement = useSourceManagement({
    onShowSuccessAlert: alertManagement.onShowUploadSuccessAlert,
    onShowErrorAlert: alertManagement.onShowErrorAlert,
    onFileUploadComplete: fileManagement.refreshFiles,
    uploadedFiles: fileManagement.files,
    isFilesLoading: fileManagement.isLoading,
  });

  // Message hooks tracking
  const messageHooksRef = React.useRef<Map<string, UseChatbotMessagesReturn>>(new Map());
  const [loadingStates, setLoadingStates] = React.useState<Map<string, boolean>>(new Map());
  const [disabledStates, setDisabledStates] = React.useState<Map<string, boolean>>(new Map());

  // Callbacks
  const setSelectedModel = React.useCallback(
    (model: string) => {
      useChatbotConfigStore.getState().updateSelectedModel(primaryConfigId, model);
    },
    [primaryConfigId],
  );

  const handleMessagesHookReady = React.useCallback(
    (configIdParam: string, hook: UseChatbotMessagesReturn) => {
      messageHooksRef.current.set(configIdParam, hook);
      setLoadingStates((prev) => {
        if (prev.get(configIdParam) === hook.isLoading) {
          return prev;
        }
        const next = new Map(prev);
        next.set(configIdParam, hook.isLoading);
        return next;
      });
      setDisabledStates((prev) => {
        if (prev.get(configIdParam) === hook.isMessageSendButtonDisabled) {
          return prev;
        }
        const next = new Map(prev);
        next.set(configIdParam, hook.isMessageSendButtonDisabled);
        return next;
      });
    },
    [],
  );

  const getHookReadyCallback = React.useCallback(
    (configId: string) => (hook: UseChatbotMessagesReturn) =>
      handleMessagesHookReady(configId, hook),
    [handleMessagesHookReady],
  );

  const handleModelChange = React.useCallback(
    (configId: string) => (model: string) => {
      useChatbotConfigStore.getState().updateSelectedModel(configId, model);
    },
    [],
  );

  const handlePaneSettingsClick = React.useCallback(
    (configId: string) => {
      setActivePaneConfigId?.(configId);
      setIsDrawerExpanded(true);
    },
    [setActivePaneConfigId],
  );

  const handleSendMessage = React.useCallback(
    (message: string) => {
      messageHooksRef.current.forEach((hook) => hook.handleMessageSend(message));
      setLastInput(message);
    },
    [setLastInput],
  );

  const handleStopStreaming = React.useCallback(() => {
    messageHooksRef.current.forEach((hook) => hook.handleStopStreaming());
  }, []);

  const handleAttach = React.useCallback(
    <T extends File>(acceptedFiles: T[], _fileRejections: unknown, event: DropEvent) => {
      sourceManagement.handleSourceDrop(event, acceptedFiles).catch((error) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        alertManagement.onShowErrorAlert(
          `Failed to process files: ${errorMessage}`,
          'File Upload Error',
        );
      });
    },
    [sourceManagement, alertManagement],
  );

  // Effects
  React.useEffect(() => {
    useChatbotConfigStore.getState().resetConfiguration({
      selectedMcpServerIds: mcpServersFromRoute,
    });
    return () => {
      useChatbotConfigStore.getState().resetConfiguration();
    };
  }, [mcpServersFromRoute, selectedAAModel]);

  React.useEffect(() => {
    const shouldClear = Boolean(
      location.state?.mcpServers || location.state?.model || location.state?.mcpServerStatuses,
    );
    if (shouldClear) {
      const timeoutId = setTimeout(() => window.history.replaceState({}, ''), 100);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [location.state]);

  React.useEffect(() => {
    if (modelsLoaded && models.length > 0 && !primarySelectedModel) {
      if (selectedAAModel) {
        setSelectedModel(selectedAAModel);
      } else {
        const availableModels = models.filter((model) =>
          isLlamaModelEnabled(model.id, aiModels, maasModels, bffConfig?.isCustomLSD ?? false),
        );
        if (availableModels.length > 0) {
          setSelectedModel(availableModels[0].id);
        }
      }
    }
  }, [
    modelsLoaded,
    models,
    primarySelectedModel,
    setSelectedModel,
    aiModels,
    maasModels,
    bffConfig,
    selectedAAModel,
  ]);

  React.useEffect(() => {
    if (guardrailModelsLoaded && guardrailModelNames.length > 0 && !guardrail) {
      useChatbotConfigStore.getState().updateGuardrail(primaryConfigId, guardrailModelNames[0]);
    }
  }, [guardrailModelsLoaded, guardrailModelNames, guardrail, primaryConfigId]);

  // Cleanup stale message hooks
  React.useEffect(() => {
    const staleKeys = Array.from(messageHooksRef.current.keys()).filter(
      (key) => !configIds.includes(key),
    );
    if (staleKeys.length > 0) {
      staleKeys.forEach((key) => messageHooksRef.current.delete(key));
      setLoadingStates((prev) => {
        const next = new Map(prev);
        staleKeys.forEach((key) => next.delete(key));
        return next;
      });
      setDisabledStates((prev) => {
        const next = new Map(prev);
        staleKeys.forEach((key) => next.delete(key));
        return next;
      });
    }
  }, [configIds]);

  // Expose clearAllMessages to parent
  React.useEffect(() => {
    const ref = clearAllMessagesRef;
    if (ref) {
      ref.current = () => {
        messageHooksRef.current.forEach((hook) => hook.clearConversation());
      };
    }
    return () => {
      if (ref) {
        ref.current = null;
      }
    };
  }, [clearAllMessagesRef]);

  // Alerts
  const alerts = {
    uploadSuccessAlert: (
      <SourceUploadSuccessAlert
        isVisible={alertManagement.showUploadSuccessAlert}
        alertKey={alertManagement.uploadAlertKey}
        onClose={alertManagement.onHideUploadSuccessAlert}
      />
    ),
    deleteSuccessAlert: (
      <SourceDeleteSuccessAlert
        isVisible={alertManagement.showDeleteSuccessAlert}
        alertKey={alertManagement.deleteAlertKey}
        onClose={alertManagement.onHideDeleteSuccessAlert}
      />
    ),
    errorAlert: (
      <SourceUploadErrorAlert
        isVisible={alertManagement.showErrorAlert}
        alertKey={alertManagement.errorAlertKey}
        onClose={alertManagement.onHideErrorAlert}
        errorMessage={alertManagement.errorMessage}
        title={alertManagement.errorTitle}
      />
    ),
  };

  // Settings panel header label
  const settingsHeaderLabel = isCompareMode
    ? `Configure ${getConfigDisplayLabel(configIds.indexOf(activePaneConfigId))}`
    : 'Configure';

  // Render chatbot content for a config
  const renderChatbotContent = (configId: string) => (
    <Chatbot
      displayMode={ChatbotDisplayMode.embedded}
      data-testid={isCompareMode ? `chatbot-${configId}` : 'chatbot'}
    >
      <ChatbotContent
        style={{
          backgroundColor: isDarkMode
            ? 'var(--pf-t--global--dark--background--color--100)'
            : 'var(--pf-t--global--background--color--100)',
        }}
      >
        <ChatbotConfigInstance
          key={`${configId}-chatbot-instance`}
          configId={configId}
          username={username}
          selectedSourceSettings={sourceManagement.selectedSourceSettings}
          currentVectorStoreId={fileManagement.currentVectorStoreId}
          mcpServers={mcpServers}
          mcpServerStatuses={mcpServerStatuses}
          mcpServerTokens={mcpServerTokens}
          namespace={namespace?.name}
          showWelcomePrompt
          welcomeDescription={isCompareMode ? 'Send a message to compare models' : undefined}
          onMessagesHookReady={getHookReadyCallback(configId)}
          guardrailModelConfigs={guardrailModelConfigs}
        />
      </ChatbotContent>
    </Chatbot>
  );

  return (
    <>
      {/* Modals */}
      <ChatbotSourceSettingsModal
        isOpen={sourceManagement.isSourceSettingsOpen}
        onToggle={sourceManagement.handleModalClose}
        onSubmitSettings={sourceManagement.handleSourceSettingsSubmit}
        pendingFiles={sourceManagement.pendingFiles}
        isUploading={sourceManagement.isUploading}
        uploadProgress={sourceManagement.uploadProgress}
      />
      <ViewCodeModal
        isOpen={isViewCodeModalOpen}
        onToggle={() => setIsViewCodeModalOpen(!isViewCodeModalOpen)}
        configId={primaryConfigId}
        input={lastInput}
        files={fileManagement.files}
        mcpServers={mcpServers}
        mcpServerTokens={mcpServerTokens}
        namespace={namespace?.name}
      />
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onConfirm={() => {
          messageHooksRef.current.forEach((hook) => hook.clearConversation());
          setIsNewChatModalOpen(false);
        }}
      />

      {/* Main layout */}
      <Drawer isExpanded={isDrawerExpanded} isInline={!isCompareMode} position="left">
        <Divider />
        <DrawerContent
          panelContent={
            <ChatbotSettingsPanel
              key={`settings-panel-${activePaneConfigId}`}
              configId={activePaneConfigId}
              headerLabel={settingsHeaderLabel}
              alerts={alerts}
              sourceManagement={sourceManagement}
              fileManagement={fileManagement}
              initialServerStatuses={mcpServerStatusesFromRoute}
              mcpServers={mcpServers}
              mcpServersLoaded={mcpServersLoaded}
              mcpServersLoadError={mcpServersLoadError}
              mcpServerTokens={mcpServerTokens}
              onMcpServerTokensChange={setMcpServerTokens}
              checkMcpServerStatus={checkMcpServerStatus}
              guardrailModels={guardrailModelNames}
              guardrailModelsLoaded={guardrailModelsLoaded}
              onCloseClick={() => setIsDrawerExpanded(false)}
            />
          }
        >
          <DrawerContentBody style={{ padding: 0, height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Single mode header */}
              {!isCompareMode && (
                <ChatbotPaneHeader
                  selectedModel={primarySelectedModel || ''}
                  onModelChange={setSelectedModel}
                  onSettingsClick={() => setIsDrawerExpanded(!isDrawerExpanded)}
                  hasDivider
                />
              )}

              {/* Chat panes */}
              <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {configIds.map((configId, index) => (
                  <React.Fragment key={configId}>
                    {isCompareMode && index > 0 && (
                      <Divider orientation={{ default: 'vertical' }} />
                    )}
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                      }}
                    >
                      {isCompareMode ? (
                        <ComparePaneWrapper
                          configId={configId}
                          displayLabel={getConfigDisplayLabel(index)}
                          onModelChange={handleModelChange(configId)}
                          onSettingsClick={() => handlePaneSettingsClick(configId)}
                          onClose={() => onClosePane?.(configId)}
                        >
                          {renderChatbotContent(configId)}
                        </ComparePaneWrapper>
                      ) : (
                        renderChatbotContent(configId)
                      )}
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {/* Message input */}
              <ChatbotMessageInput
                onSendMessage={handleSendMessage}
                onStopStreaming={handleStopStreaming}
                isLoading={Array.from(loadingStates.values()).some(Boolean)}
                isSendDisabled={
                  !modelsLoaded ||
                  !primarySelectedModel ||
                  Array.from(disabledStates.values()).some(Boolean)
                }
                showAttachButton={!isCompareMode}
                onAttach={handleAttach}
                onShowErrorAlert={alertManagement.onShowErrorAlert}
                isDarkMode={isDarkMode}
              />
            </div>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default ChatbotPlayground;
