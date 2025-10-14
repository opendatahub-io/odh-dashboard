import * as React from 'react';
import { Divider, Drawer, DrawerContent, DrawerContentBody } from '@patternfly/react-core';
import {
  Chatbot,
  ChatbotContent,
  ChatbotDisplayMode,
  ChatbotFooter,
  ChatbotFootnote,
  ChatbotWelcomePrompt,
  MessageBar,
  MessageBox,
} from '@patternfly/chatbot';
import { useLocation } from 'react-router-dom';
import { useUserContext } from '~/app/context/UserContext';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { DEFAULT_SYSTEM_INSTRUCTIONS, FILE_UPLOAD_CONFIG, ERROR_MESSAGES } from './const';
import { ChatbotSourceSettingsModal } from './sourceUpload/ChatbotSourceSettingsModal';
import useSourceManagement from './hooks/useSourceManagement';
import useAlertManagement from './hooks/useAlertManagement';
import useChatbotMessages from './hooks/useChatbotMessages';
import useFileManagement from './hooks/useFileManagement';
import useDarkMode from './hooks/useDarkMode';
import { ChatbotSettingsPanel } from './components/ChatbotSettingsPanel';
import SourceUploadErrorAlert from './components/alerts/SourceUploadErrorAlert';
import SourceUploadSuccessAlert from './components/alerts/SourceUploadSuccessAlert';
import SourceDeleteSuccessAlert from './components/alerts/SourceDeleteSuccessAlert';
import { ChatbotMessages } from './ChatbotMessagesList';
import ViewCodeModal from './components/ViewCodeModal';

type ChatbotPlaygroundProps = {
  isViewCodeModalOpen: boolean;
  setIsViewCodeModalOpen: (isOpen: boolean) => void;
};

const ChatbotPlayground: React.FC<ChatbotPlaygroundProps> = ({
  isViewCodeModalOpen,
  setIsViewCodeModalOpen,
}) => {
  const { username } = useUserContext();
  const {
    models,
    modelsLoaded,
    aiModels,
    selectedModel,
    setSelectedModel,
    lastInput,
    setLastInput,
  } = React.useContext(ChatbotContext);

  const [systemInstruction, setSystemInstruction] = React.useState<string>(
    DEFAULT_SYSTEM_INSTRUCTIONS,
  );
  const [isStreamingEnabled, setIsStreamingEnabled] = React.useState<boolean>(true);
  const [temperature, setTemperature] = React.useState<number>(0.1);
  const isDarkMode = useDarkMode();

  const location = useLocation();
  const selectedAAModel = location.state?.model;

  React.useEffect(() => {
    if (modelsLoaded && models.length > 0 && !selectedModel) {
      if (selectedAAModel) {
        setSelectedModel(selectedAAModel);
        // Clear the location state after setting the selected model
        // so that when refreshing the page, the selected model is not passed again
        window.history.replaceState({}, '');
      } else {
        setSelectedModel(models[0].id);
      }
    }
  }, [modelsLoaded, models, selectedModel, setSelectedModel, aiModels, selectedAAModel]);

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
  });

  const chatbotMessages = useChatbotMessages({
    modelId: selectedModel,
    selectedSourceSettings: sourceManagement.selectedSourceSettings,
    systemInstruction,
    isRawUploaded: sourceManagement.isRawUploaded,
    username,
    isStreamingEnabled,
    temperature,
    currentVectorStoreId: fileManagement.currentVectorStoreId,
  });

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

  // Settings panel content
  const settingsPanelContent = (
    <ChatbotSettingsPanel
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      alerts={{ uploadSuccessAlert, deleteSuccessAlert, errorAlert }}
      sourceManagement={sourceManagement}
      fileManagement={fileManagement}
      systemInstruction={systemInstruction}
      onSystemInstructionChange={setSystemInstruction}
      isStreamingEnabled={isStreamingEnabled}
      onStreamingToggle={setIsStreamingEnabled}
      temperature={temperature}
      onTemperatureChange={setTemperature}
    />
  );

  return (
    <>
      <ChatbotSourceSettingsModal
        isOpen={sourceManagement.isSourceSettingsOpen}
        onToggle={sourceManagement.handleModalClose}
        onSubmitSettings={sourceManagement.handleSourceSettingsSubmit}
        filename={sourceManagement.currentFileForSettings?.name}
        pendingFiles={sourceManagement.pendingFiles}
        isUploading={sourceManagement.isUploading}
        uploadProgress={sourceManagement.uploadProgress}
      />
      <ViewCodeModal
        isOpen={isViewCodeModalOpen}
        onToggle={() => setIsViewCodeModalOpen(!isViewCodeModalOpen)}
        input={lastInput}
        model={selectedModel}
        systemInstruction={systemInstruction}
      />
      <Drawer isExpanded isInline position="right">
        <Divider />
        <DrawerContent panelContent={settingsPanelContent}>
          <DrawerContentBody>
            <Chatbot displayMode={ChatbotDisplayMode.embedded} data-testid="chatbot">
              <ChatbotContent
                style={{
                  backgroundColor: isDarkMode
                    ? 'var(--pf-t--global--dark--background--color--100)'
                    : 'var(--pf-t--global--background--color--100)',
                }}
              >
                <MessageBox position="bottom">
                  <ChatbotWelcomePrompt
                    title={username ? `Hello, ${username}` : 'Hello'}
                    description="Welcome to the chat playground"
                  />
                  <ChatbotMessages
                    messageList={chatbotMessages.messages}
                    scrollRef={chatbotMessages.scrollToBottomRef}
                    isLoading={chatbotMessages.isLoading}
                    isStreamingWithoutContent={chatbotMessages.isStreamingWithoutContent}
                  />
                </MessageBox>
              </ChatbotContent>
              <ChatbotFooter
                style={{
                  backgroundColor: isDarkMode
                    ? 'var(--pf-t--global--dark--background--color--100)'
                    : 'var(--pf-t--global--background--color--100)',
                  borderTop: '1px solid var(--pf-t--global--border--color--default)',
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
                        chatbotMessages.handleMessageSend(message);
                        setLastInput(message);
                      }
                    }}
                    hasAttachButton={false}
                    isSendButtonDisabled={chatbotMessages.isMessageSendButtonDisabled}
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
                    }}
                  />
                </div>
                <ChatbotFootnote {...{ label: 'Bot uses AI. Check for mistakes.' }} />
              </ChatbotFooter>
            </Chatbot>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default ChatbotPlayground;
