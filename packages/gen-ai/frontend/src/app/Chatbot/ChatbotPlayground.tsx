import * as React from 'react';
import {
  Button,
  Divider,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import {
  Chatbot,
  ChatbotContent,
  ChatbotDisplayMode,
  ChatbotFooter,
  ChatbotFootnote,
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
import {
  useChatbotConfigStore,
  selectSelectedModel,
  selectConfigIds,
  selectGuardrail,
} from './store';
import SourceUploadErrorAlert from './components/alerts/SourceUploadErrorAlert';
import SourceUploadSuccessAlert from './components/alerts/SourceUploadSuccessAlert';
import SourceDeleteSuccessAlert from './components/alerts/SourceDeleteSuccessAlert';
import ViewCodeModal from './components/ViewCodeModal';
import NewChatModal from './components/NewChatModal';

type ChatbotPlaygroundProps = {
  isViewCodeModalOpen: boolean;
  setIsViewCodeModalOpen: (isOpen: boolean) => void;
  isNewChatModalOpen: boolean;
  setIsNewChatModalOpen: (isOpen: boolean) => void;
};

const ChatbotPlayground: React.FC<ChatbotPlaygroundProps> = ({
  isViewCodeModalOpen,
  setIsViewCodeModalOpen,
  isNewChatModalOpen,
  setIsNewChatModalOpen,
}) => {
  const { username } = useUserContext();
  const { namespace } = React.useContext(GenAiContext);
  const { models, modelsLoaded, aiModels, maasModels, lastInput, setLastInput } =
    React.useContext(ChatbotContext);

  const { data: bffConfig } = useFetchBFFConfig();

  const configIds = useChatbotConfigStore(selectConfigIds);
  // Get primary configuration for initial model selection
  const primaryConfigId = configIds[0];
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
  const drawerRef = React.useRef<HTMLDivElement>(undefined);
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

  // Settings panel content - render one for each config
  // TODO: This will need to be redone for compare MODE
  const settingsPanelContent = (
    <>
      {configIds.map((configId) => (
        <ChatbotSettingsPanel
          key={`${configId}-settings-panel`}
          configId={configId}
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
      ))}
    </>
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
        // This will need to be refactored with compare mode to get all the values for each config in the Modal.
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
      <Drawer
        onExpand={() => drawerRef.current && drawerRef.current.focus()}
        isExpanded={isDrawerExpanded}
        isInline
        position="left"
      >
        <Divider />
        <DrawerContent panelContent={settingsPanelContent}>
          <DrawerContentBody>
            <Toolbar>
              <ToolbarContent>
                <ToolbarGroup>
                  <ToolbarItem>
                    <Button
                      variant="plain"
                      aria-label="edit"
                      icon={<CogIcon />}
                      onClick={() => setIsDrawerExpanded(true)}
                      style={{ marginTop: '0.6rem' }}
                    />
                  </ToolbarItem>
                </ToolbarGroup>
              </ToolbarContent>
            </Toolbar>
            <Chatbot displayMode={ChatbotDisplayMode.embedded} data-testid="chatbot">
              <ChatbotContent
                style={{
                  backgroundColor: isDarkMode
                    ? 'var(--pf-t--global--dark--background--color--100)'
                    : 'var(--pf-t--global--background--color--100)',
                }}
              >
                {configIds.map((configId, index) => (
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
                    showWelcomePrompt={configIds.length === 1 && index === 0}
                    onMessagesHookReady={(hook) => handleMessagesHookReady(configId, hook)}
                    guardrailModelConfigs={guardrailModelConfigs}
                  />
                ))}
              </ChatbotContent>
              <ChatbotFooter
                style={{
                  backgroundColor: isDarkMode
                    ? 'var(--pf-t--global--dark--background--color--100)'
                    : 'var(--pf-t--global--background--color--100)',
                  paddingTop: '1rem',
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
                    hasAttachButton={false}
                    isSendButtonDisabled={Array.from(disabledStates.values()).some(
                      (disabled) => disabled,
                    )}
                    hasStopButton={Array.from(loadingStates.values()).some((loading) => loading)}
                    data-testid="chatbot-message-bar"
                    onAttach={async (acceptedFiles, fileRejections, event) => {
                      try {
                        // Use the existing source upload functionality
                        await sourceManagement.handleSourceDrop(event, acceptedFiles);
                      } catch (error) {
                        // Handle any unexpected errors during file processing
                        const errorMessage =
                          error instanceof Error ? error.message : 'Unknown error occurred';
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
                </div>
                <ChatbotFootnote {...{ label: 'This chatbot uses AI. Check for mistakes.' }} />
              </ChatbotFooter>
            </Chatbot>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default ChatbotPlayground;
