/* eslint-disable camelcase */
import * as React from 'react';
import { Button, Drawer, DrawerContent, DrawerContentBody, Tooltip } from '@patternfly/react-core';
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
import { ApplicationsPage } from 'mod-arch-shared';
import { CodeIcon } from '@patternfly/react-icons';
import { useUserContext } from '~/app/context/UserContext';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import ChatbotEmptyState from '~/app/EmptyStates/NoData';
import { ChatbotSourceSettingsModal } from './sourceUpload/ChatbotSourceSettingsModal';
import { ChatbotMessages } from './ChatbotMessagesList';
import { ChatbotSettingsPanel } from './components/ChatbotSettingsPanel';
import useChatbotMessages from './hooks/useChatbotMessages';
import useSourceManagement from './hooks/useSourceManagement';
import useAlertManagement from './hooks/useAlertManagement';
import SourceUploadSuccessAlert from './components/alerts/SourceUploadSuccessAlert';
import SourceUploadErrorAlert from './components/alerts/SourceUploadErrorAlert';
import { DEFAULT_SYSTEM_INSTRUCTIONS } from './const';
import ChatbotHeader from './ChatbotHeader';
import { ViewCodeModal } from './components/ViewCodeModal';

const ChatbotMain: React.FunctionComponent = () => {
  const displayMode = ChatbotDisplayMode.embedded;
  const { models, modelsLoaded, lsdStatus, lsdStatusLoaded, lsdStatusError, modelsError } =
    React.useContext(ChatbotContext);
  const [selectedModel, setSelectedModel] = React.useState<string>('');
  const { username } = useUserContext();
  const modelId = selectedModel || models[0]?.id;
  const [systemInstruction, setSystemInstruction] = React.useState<string>(
    DEFAULT_SYSTEM_INSTRUCTIONS,
  );
  const [isViewCodeModalOpen, setIsViewCodeModalOpen] = React.useState(false);
  const [input, setInput] = React.useState<string>('');
  const [isStreamingEnabled, setIsStreamingEnabled] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (!selectedModel) {
      setSelectedModel(models[0]?.id);
    }
  }, [models, selectedModel]);

  // Custom hooks for managing different aspects of the chatbot
  const alertManagement = useAlertManagement();
  const sourceManagement = useSourceManagement({
    onShowSuccessAlert: alertManagement.onShowSuccessAlert,
    onShowErrorAlert: alertManagement.onShowErrorAlert,
  });

  const isViewCodeDisabled = !input || !modelId;

  // Get disabled reason for popover
  const getDisabledReason = () => {
    if (!input && !modelId) {
      return 'Please input a message and select a model to generate code';
    }
    if (!input) {
      return 'Please input a message to generate code';
    }
    if (!modelId) {
      return 'Please select a model to generate code';
    }
    return '';
  };

  const chatbotMessages = useChatbotMessages({
    modelId,
    selectedSourceSettings: sourceManagement.selectedSourceSettings,
    systemInstruction,
    isRawUploaded: sourceManagement.isRawUploaded,
    username,
    isStreamingEnabled,
  });

  // Create alert components
  const successAlert = (
    <SourceUploadSuccessAlert
      isVisible={alertManagement.showSuccessAlert}
      alertKey={alertManagement.alertKey}
      onClose={alertManagement.onHideSuccessAlert}
    />
  );

  const errorAlert = (
    <SourceUploadErrorAlert
      isVisible={alertManagement.showErrorAlert}
      alertKey={alertManagement.alertKey}
      onClose={alertManagement.onHideErrorAlert}
    />
  );

  // Settings panel content
  const settingsPanelContent = (
    <ChatbotSettingsPanel
      models={models}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      alerts={{ successAlert, errorAlert }}
      sourceManagement={sourceManagement}
      systemInstruction={systemInstruction}
      onSystemInstructionChange={setSystemInstruction}
      isStreamingEnabled={isStreamingEnabled}
      onStreamingToggle={setIsStreamingEnabled}
    />
  );

  return (
    <ApplicationsPage
      title={<ChatbotHeader />}
      loaded={lsdStatusLoaded && modelsLoaded}
      empty={!lsdStatus}
      emptyStatePage={
        <ChatbotEmptyState
          title="Enable Playground"
          description="Create a playground to chat with the generative models deployed in this project. Experiment with model output using a simple RAG simulation, custom prompt and MCP servers."
          actionButtonText="Configure playground"
          handleActionButtonClick={() => {
            // TODO: Implement
          }}
        />
      }
      loadError={lsdStatusError || modelsError}
      headerAction={
        lsdStatus &&
        (isViewCodeDisabled ? (
          <Tooltip content={getDisabledReason()}>
            <Button
              variant="secondary"
              aria-label="View generated code (disabled)"
              icon={<CodeIcon />}
              isAriaDisabled={isViewCodeDisabled}
            >
              View Code
            </Button>
          </Tooltip>
        ) : (
          <Button
            variant="secondary"
            aria-label="View generated code"
            icon={<CodeIcon />}
            onClick={() => setIsViewCodeModalOpen(true)}
          >
            View Code
          </Button>
        ))
      }
    >
      <ChatbotSourceSettingsModal
        isOpen={sourceManagement.isSourceSettingsOpen}
        onToggle={() =>
          sourceManagement.setIsSourceSettingsOpen(!sourceManagement.isSourceSettingsOpen)
        }
        onSubmitSettings={sourceManagement.handleSourceSettingsSubmit}
      />
      <ViewCodeModal
        isOpen={isViewCodeModalOpen}
        onToggle={() => setIsViewCodeModalOpen(!isViewCodeModalOpen)}
        input={input}
        model={modelId}
        systemInstruction={systemInstruction}
      />
      <Drawer isExpanded isInline position="right">
        <DrawerContent panelContent={settingsPanelContent}>
          <DrawerContentBody>
            <Chatbot displayMode={displayMode} data-testid="chatbot">
              <ChatbotContent>
                <MessageBox position="bottom">
                  <ChatbotWelcomePrompt
                    title={username ? `Hello, ${username}` : 'Hello'}
                    description="Welcome to the chat playground"
                  />
                  <ChatbotMessages
                    messageList={chatbotMessages.messages}
                    scrollRef={chatbotMessages.scrollToBottomRef}
                  />
                </MessageBox>
              </ChatbotContent>
              <ChatbotFooter>
                <MessageBar
                  onSendMessage={(message) => {
                    if (typeof message === 'string') {
                      chatbotMessages.handleMessageSend(message);
                      setInput(message);
                    }
                  }}
                  hasAttachButton={false}
                  isSendButtonDisabled={chatbotMessages.isMessageSendButtonDisabled}
                  data-testid="chatbot-message-bar"
                />
                <ChatbotFootnote {...{ label: 'Bot uses AI. Check for mistakes.' }} />
              </ChatbotFooter>
            </Chatbot>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
    </ApplicationsPage>
  );
};

export { ChatbotMain };
