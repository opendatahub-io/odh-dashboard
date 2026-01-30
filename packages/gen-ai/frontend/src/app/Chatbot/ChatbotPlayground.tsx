import * as React from 'react';
import { Button, Divider, Drawer, DrawerContent, DrawerContentBody } from '@patternfly/react-core';
import {
  Chatbot,
  ChatbotContent,
  ChatbotDisplayMode,
  ChatbotFootnote,
  ChatbotHeaderMain,
  MessageBar,
} from '@patternfly/chatbot';
import { CogIcon } from '@patternfly/react-icons';
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
import { FILE_UPLOAD_CONFIG, ERROR_MESSAGES } from './const';
import { ChatbotSourceSettingsModal } from './sourceUpload/ChatbotSourceSettingsModal';
import useSourceManagement from './hooks/useSourceManagement';
import useAlertManagement from './hooks/useAlertManagement';
import { UseChatbotMessagesReturn } from './hooks/useChatbotMessages';
import { ChatbotConfigInstance } from './ChatbotConfigInstance';
import useFileManagement from './hooks/useFileManagement';
import useDarkMode from './hooks/useDarkMode';
import { ChatbotSettingsPanel } from './components/ChatbotSettingsPanel';
import ModelDetailsDropdown from './components/ModelDetailsDropdown';
import {
  useChatbotConfigStore,
  selectSelectedModel,
  selectConfigIds,
  selectGuardrail,
  MODEL_1_CONFIG_ID,
} from './store';
import SourceUploadErrorAlert from './components/alerts/SourceUploadErrorAlert';
import SourceUploadSuccessAlert from './components/alerts/SourceUploadSuccessAlert';
import SourceDeleteSuccessAlert from './components/alerts/SourceDeleteSuccessAlert';
import ViewCodeModal from './components/ViewCodeModal';
import NewChatModal from './components/NewChatModal';
import ChatbotPane from './ChatbotPane';

/**
 * Wrapper component for compare mode panes that properly subscribes to Zustand store
 * for reactive model updates. This is needed because using getState() inside a map
 * doesn't create a subscription to store changes.
 */
interface ComparePaneWrapperProps {
  configId: string;
  onModelChange: (model: string) => void;
  onSettingsClick: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

const ComparePaneWrapper: React.FC<ComparePaneWrapperProps> = ({
  configId,
  onModelChange,
  onSettingsClick,
  onClose,
  children,
}) => {
  // Subscribe to model changes for this specific config
  const selectedModel = useChatbotConfigStore(selectSelectedModel(configId));

  return (
    <ChatbotPane
      configId={configId}
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
  /** Active pane configId for compare mode (which pane's settings are shown) */
  activePaneConfigId?: string;
  /** Callback to change active pane */
  setActivePaneConfigId?: (configId: string) => void;
  /** Callback for closing a pane in compare mode */
  onClosePane?: (configId: string) => void;
  /** Ref to expose clear all messages function to parent */
  clearAllMessagesRef?: React.MutableRefObject<(() => void) | null>;
};

const ChatbotPlayground: React.FC<ChatbotPlaygroundProps> = ({
  isViewCodeModalOpen,
  setIsViewCodeModalOpen,
  isNewChatModalOpen,
  setIsNewChatModalOpen,
  activePaneConfigId = MODEL_1_CONFIG_ID,
  setActivePaneConfigId,
  onClosePane,
  clearAllMessagesRef,
}) => {
  const { username } = useUserContext();
  const { namespace } = React.useContext(GenAiContext);
  const { models, modelsLoaded, aiModels, maasModels, lastInput, setLastInput } =
    React.useContext(ChatbotContext);

  const { data: bffConfig } = useFetchBFFConfig();

  const configIds = useChatbotConfigStore(selectConfigIds);
  const isCompareMode = configIds.length > 1;

  // Get primary configuration for initial model selection
  const primaryConfigId = configIds[0] || MODEL_1_CONFIG_ID;
  const primarySelectedModel = useChatbotConfigStore(selectSelectedModel(primaryConfigId));

  const setSelectedModel = React.useCallback(
    (model: string) => {
      useChatbotConfigStore.getState().updateSelectedModel(primaryConfigId, model);
    },
    [primaryConfigId],
  );

  // Guardrails configuration from store (using primaryConfigId for initialization)
  const guardrail = useChatbotConfigStore(selectGuardrail(primaryConfigId));

  const {
    data: guardrailModelConfigs,
    modelNames: guardrailModelNames,
    loaded: guardrailModelsLoaded,
  } = useFetchGuardrailModels();
  const isDarkMode = useDarkMode();

  const location = useLocation();
  const [isDrawerExpanded, setIsDrawerExpanded] = React.useState(true);
  const selectedAAModel = location.state?.model;
  const mcpServersFromRoute = React.useMemo(() => {
    const servers = location.state?.mcpServers;
    return Array.isArray(servers) ? servers : [];
  }, [location.state?.mcpServers]);

  const mcpServerStatusesFromRoute = React.useMemo(() => {
    const statuses = location.state?.mcpServerStatuses;
    return statuses ? new Map(Object.entries(statuses)) : new Map();
  }, [location.state?.mcpServerStatuses]);

  // MCP hooks - fetch servers and manage statuses
  const {
    data: mcpServers = [],
    loaded: mcpServersLoaded,
    error: mcpServersLoadError,
  } = useFetchMCPServers();
  const { serverStatuses: mcpServerStatuses, checkServerStatus: checkMcpServerStatus } =
    useMCPServerStatuses(mcpServers, mcpServersLoaded);

  // Shared MCP server tokens
  const [mcpServerTokens, setMcpServerTokens] = React.useState<Map<string, TokenInfo>>(new Map());

  const shouldClearRouterState = React.useMemo(
    () =>
      Boolean(
        location.state &&
          (location.state.mcpServers || location.state.model || location.state.mcpServerStatuses),
      ),
    [location.state],
  );

  React.useEffect(() => {
    // Reset configuration with initial values from router
    useChatbotConfigStore.getState().resetConfiguration({
      selectedMcpServerIds: mcpServersFromRoute,
    });

    return () => {
      useChatbotConfigStore.getState().resetConfiguration();
    };
  }, [mcpServersFromRoute, selectedAAModel]);

  // Clear router state after a brief delay to ensure child components have consumed it
  React.useEffect(() => {
    if (shouldClearRouterState) {
      const timeoutId = setTimeout(() => {
        window.history.replaceState({}, '');
      }, 100);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [shouldClearRouterState]);

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
    mcpServersFromRoute,
  ]);

  React.useEffect(() => {
    if (guardrailModelsLoaded && guardrailModelNames.length > 0 && !guardrail) {
      useChatbotConfigStore.getState().updateGuardrail(primaryConfigId, guardrailModelNames[0]);
    }
  }, [guardrailModelsLoaded, guardrailModelNames, guardrail, primaryConfigId]);

  // Custom hooks for managing different aspects of the chatbot
  const alertManagement = useAlertManagement();

  // File management hook for displaying uploaded files
  const fileManagement = useFileManagement({
    onShowDeleteSuccessAlert: alertManagement.onShowDeleteSuccessAlert,
    onShowErrorAlert: alertManagement.onShowErrorAlert,
  });

  const sourceManagement = useSourceManagement({
    onShowSuccessAlert: alertManagement.onShowUploadSuccessAlert,
    onShowErrorAlert: alertManagement.onShowErrorAlert,
    onFileUploadComplete: () => {
      // Refresh the uploaded files list when a file upload completes
      fileManagement.refreshFiles();
    },
    uploadedFiles: fileManagement.files,
    isFilesLoading: fileManagement.isLoading,
  });

  // Track message hooks for each config instance
  const messageHooksRef = React.useRef<Map<string, UseChatbotMessagesReturn>>(new Map());

  // Track loading states to trigger re-renders when they change
  const [loadingStates, setLoadingStates] = React.useState<Map<string, boolean>>(new Map());
  const [disabledStates, setDisabledStates] = React.useState<Map<string, boolean>>(new Map());

  const handleMessagesHookReady = React.useCallback(
    (configIdParam: string, hook: UseChatbotMessagesReturn) => {
      messageHooksRef.current.set(configIdParam, hook);
      // Update states only if values actually changed to prevent unnecessary re-renders
      setLoadingStates((prev) => {
        if (prev.get(configIdParam) === hook.isLoading) {
          return prev; // No change, return same reference
        }
        const next = new Map(prev);
        next.set(configIdParam, hook.isLoading);
        return next;
      });
      setDisabledStates((prev) => {
        if (prev.get(configIdParam) === hook.isMessageSendButtonDisabled) {
          return prev; // No change, return same reference
        }
        const next = new Map(prev);
        next.set(configIdParam, hook.isMessageSendButtonDisabled);
        return next;
      });
    },
    [],
  );

  // Create stable callbacks for each config to avoid re-render loops
  const getHookReadyCallback = React.useCallback(
    (configId: string) => (hook: UseChatbotMessagesReturn) =>
      handleMessagesHookReady(configId, hook),
    [handleMessagesHookReady],
  );

  // Cleanup stale entries when configs are removed
  React.useEffect(() => {
    // Remove entries for configs that no longer exist
    const currentKeys = Array.from(messageHooksRef.current.keys());
    const staleKeys = currentKeys.filter((key) => !configIds.includes(key));

    if (staleKeys.length > 0) {
      // Remove from ref
      staleKeys.forEach((key) => {
        messageHooksRef.current.delete(key);
      });

      // Remove from loading states
      setLoadingStates((prev) => {
        const next = new Map(prev);
        staleKeys.forEach((key) => {
          next.delete(key);
        });
        return next;
      });

      // Remove from disabled states
      setDisabledStates((prev) => {
        const next = new Map(prev);
        staleKeys.forEach((key) => {
          next.delete(key);
        });
        return next;
      });
    }
  }, [configIds]);

  // Set up clearAllMessagesRef for parent to use (e.g., for compare mode confirmation)
  React.useEffect(() => {
    const refObj = clearAllMessagesRef;
    if (refObj) {
      refObj.current = () => {
        messageHooksRef.current.forEach((hook) => {
          hook.clearConversation();
        });
      };
    }
    return () => {
      if (refObj) {
        refObj.current = null;
      }
    };
  }, [clearAllMessagesRef]);

  // Create alert components
  const uploadSuccessAlert = (
    <SourceUploadSuccessAlert
      isVisible={alertManagement.showUploadSuccessAlert}
      alertKey={alertManagement.uploadAlertKey}
      onClose={alertManagement.onHideUploadSuccessAlert}
    />
  );

  const deleteSuccessAlert = (
    <SourceDeleteSuccessAlert
      isVisible={alertManagement.showDeleteSuccessAlert}
      alertKey={alertManagement.deleteAlertKey}
      onClose={alertManagement.onHideDeleteSuccessAlert}
    />
  );

  const errorAlert = (
    <SourceUploadErrorAlert
      isVisible={alertManagement.showErrorAlert}
      alertKey={alertManagement.errorAlertKey}
      onClose={alertManagement.onHideErrorAlert}
      errorMessage={alertManagement.errorMessage}
      title={alertManagement.errorTitle}
    />
  );

  // Settings panel - shows active pane's configuration in compare mode
  const settingsPanelContent = (
    <ChatbotSettingsPanel
      key={`settings-panel-${activePaneConfigId}`}
      configId={activePaneConfigId}
      headerLabel={
        isCompareMode
          ? activePaneConfigId === MODEL_1_CONFIG_ID
            ? 'Configure Model 1'
            : 'Configure Model 2'
          : 'Configure'
      }
      alerts={{ uploadSuccessAlert, deleteSuccessAlert, errorAlert }}
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
      onCloseClick={() => {
        setIsDrawerExpanded(false);
      }}
    />
  );

  // Handle model change for a pane
  const handleModelChange = React.useCallback(
    (configId: string) => (model: string) => {
      useChatbotConfigStore.getState().updateSelectedModel(configId, model);
    },
    [],
  );

  // Handle settings click in compare mode
  const handlePaneSettingsClick = React.useCallback(
    (configId: string) => {
      setActivePaneConfigId?.(configId);
      setIsDrawerExpanded(true);
    },
    [setActivePaneConfigId],
  );

  // Handle closing a pane
  const handlePaneClose = React.useCallback(
    (configId: string) => {
      onClosePane?.(configId);
    },
    [onClosePane],
  );

  // Shared message bar for both single and compare modes
  const renderMessageBar = () => (
    <MessageBar
      onSendMessage={(message) => {
        if (typeof message === 'string') {
          // Send to all instances
          messageHooksRef.current.forEach((hook) => hook.handleMessageSend(message));
          setLastInput(message);
        }
      }}
      handleStopButton={() => {
        // Stop all instances
        messageHooksRef.current.forEach((hook) => hook.handleStopStreaming());
      }}
      hasAttachButton={!isCompareMode}
      isSendButtonDisabled={
        !modelsLoaded ||
        !primarySelectedModel ||
        Array.from(disabledStates.values()).some((disabled) => disabled)
      }
      hasStopButton={Array.from(loadingStates.values()).some((loading) => loading)}
      data-testid="chatbot-message-bar"
      onAttach={async (acceptedFiles, fileRejections, event) => {
        try {
          // Use the existing source upload functionality
          await sourceManagement.handleSourceDrop(event, acceptedFiles);
        } catch (error) {
          // Handle any unexpected errors during file processing
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          alertManagement.onShowErrorAlert(
            `Failed to process files: ${errorMessage}`,
            'File Upload Error',
          );
        }
      }}
      onAttachRejected={(fileRejections) => {
        // Handle file rejection errors with specific error types
        const errorMessages = fileRejections
          .map((rejection) => {
            const fileErrors = rejection.errors.map((error) => {
              switch (error.code) {
                case 'file-too-large':
                  return ERROR_MESSAGES.FILE_TOO_LARGE;
                case 'too-many-files':
                  return ERROR_MESSAGES.TOO_MANY_FILES;
                case 'file-invalid-type':
                  return `File type not supported. Accepted types: ${FILE_UPLOAD_CONFIG.ACCEPTED_EXTENSIONS}`;
                default:
                  return error.message;
              }
            });
            return `${rejection.file.name}: ${fileErrors.join(', ')}`;
          })
          .join('; ');

        alertManagement.onShowErrorAlert(
          `${ERROR_MESSAGES.FILE_UPLOAD_REJECTED}: ${errorMessages}`,
          'File Upload Error',
        );
      }}
      allowedFileTypes={FILE_UPLOAD_CONFIG.ALLOWED_FILE_TYPES}
      maxSize={FILE_UPLOAD_CONFIG.MAX_FILE_SIZE}
      maxFiles={FILE_UPLOAD_CONFIG.MAX_FILES_IN_VECTOR_STORE}
      buttonProps={{
        attach: {
          tooltipContent: `Upload files (${FILE_UPLOAD_CONFIG.ACCEPTED_EXTENSIONS}, max ${FILE_UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB)`,
          inputTestId: 'chatbot-attach-input',
        },
        send: {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          props: {
            'data-testid': 'chatbot-send-button',
          } as React.ComponentProps<'button'>,
        },
      }}
    />
  );

  return (
    <>
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
        isRagEnabled={sourceManagement.isRawUploaded}
        mcpServers={mcpServers}
        mcpServerTokens={mcpServerTokens}
        namespace={namespace?.name}
      />
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => {
          setIsNewChatModalOpen(false);
        }}
        onConfirm={() => {
          // Clear all chatbot instances
          messageHooksRef.current.forEach((hook) => {
            hook.clearConversation();
          });
          setIsNewChatModalOpen(false);
        }}
      />
      <Drawer isExpanded={isDrawerExpanded} isInline={!isCompareMode} position="left">
        <Divider />
        <DrawerContent panelContent={settingsPanelContent}>
          <DrawerContentBody style={{ padding: 0, height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Single mode header with model dropdown and settings button */}
              {!isCompareMode && (
                <div
                  style={{
                    backgroundColor: isDarkMode
                      ? 'var(--pf-t--global--dark--background--color--100)'
                      : 'var(--pf-t--global--background--color--100)',
                    paddingLeft: '1.5rem',
                  }}
                >
                  <ChatbotHeaderMain>
                    <ModelDetailsDropdown
                      selectedModel={primarySelectedModel || ''}
                      onModelChange={setSelectedModel}
                    />
                    <Button
                      variant="plain"
                      aria-label={isDrawerExpanded ? 'Close settings panel' : 'Open settings panel'}
                      icon={<CogIcon />}
                      onClick={() => setIsDrawerExpanded(!isDrawerExpanded)}
                      style={{ margin: '0.7rem 0 0 0.5rem' }}
                    />
                  </ChatbotHeaderMain>
                </div>
              )}

              {/* Chat panes - single iteration handles both single and compare modes */}
              <div
                style={{
                  display: 'flex',
                  flex: 1,
                  minHeight: 0,
                  overflow: 'hidden',
                }}
              >
                {configIds.map((configId, index) => {
                  // Chatbot content for this pane
                  const chatbotContent = (
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
                          isRawUploaded={sourceManagement.isRawUploaded}
                          currentVectorStoreId={fileManagement.currentVectorStoreId}
                          mcpServers={mcpServers}
                          mcpServerStatuses={mcpServerStatuses}
                          mcpServerTokens={mcpServerTokens}
                          namespace={namespace?.name}
                          showWelcomePrompt
                          welcomeDescription={
                            isCompareMode ? 'Send a message to compare models' : undefined
                          }
                          onMessagesHookReady={getHookReadyCallback(configId)}
                          guardrailModelConfigs={guardrailModelConfigs}
                        />
                      </ChatbotContent>
                    </Chatbot>
                  );

                  return (
                    <React.Fragment key={configId}>
                      {/* Add vertical divider between panes in compare mode */}
                      {isCompareMode && index > 0 && (
                        <Divider orientation={{ default: 'vertical' }} />
                      )}
                      {isCompareMode ? (
                        // Compare mode: wrap in ComparePaneWrapper with reactive model subscription
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                          }}
                        >
                          <ComparePaneWrapper
                            configId={configId}
                            onModelChange={handleModelChange(configId)}
                            onSettingsClick={() => handlePaneSettingsClick(configId)}
                            onClose={() => handlePaneClose(configId)}
                          >
                            {chatbotContent}
                          </ComparePaneWrapper>
                        </div>
                      ) : (
                        // Single mode: render chatbot directly
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                          }}
                        >
                          {chatbotContent}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Shared Input Box */}
              <div
                style={{
                  flexShrink: 0,
                  padding: '1rem',
                  backgroundColor: isDarkMode
                    ? 'var(--pf-t--global--dark--background--color--100)'
                    : 'var(--pf-t--global--background--color--100)',
                }}
              >
                <div
                  style={{
                    border: isDarkMode
                      ? 'none'
                      : '1px solid var(--pf-t--global--border--color--default)',
                    borderRadius: '2.25rem',
                  }}
                >
                  {renderMessageBar()}
                </div>
                <ChatbotFootnote {...{ label: 'This chatbot uses AI. Check for mistakes.' }} />
              </div>
            </div>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default ChatbotPlayground;
