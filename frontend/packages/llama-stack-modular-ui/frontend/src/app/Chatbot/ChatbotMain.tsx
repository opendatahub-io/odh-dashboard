/* eslint-disable camelcase */
import * as React from 'react';
import {
  Alert,
  Bullseye,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Spinner,
  Title,
} from '@patternfly/react-core';
import {
  Chatbot,
  ChatbotContent,
  ChatbotDisplayMode,
  ChatbotFooter,
  ChatbotFootnote,
  ChatbotHeader,
  ChatbotHeaderMain,
  ChatbotHeaderTitle,
  ChatbotWelcomePrompt,
  MessageBar,
  MessageBox,
} from '@patternfly/chatbot';

import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import '@patternfly/chatbot/dist/css/main.css';
import { ChatbotSourceSettingsModal } from './sourceUpload/ChatbotSourceSettingsModal';
import { ChatbotMessages } from './ChatbotMessagesList';
import { ChatbotSettingsPanel } from './components/ChatbotSettingsPanel';
import useChatbotMessages from './hooks/useChatbotMessages';
import useSourceManagement from './hooks/useSourceManagement';
import useAlertManagement from './hooks/useAlertManagement';
import useSystemInstructions from './hooks/useSystemInstructions';
import useAccordionState from './hooks/useAccordionState';
import SourceUploadSuccessAlert from './components/alerts/SourceUploadSuccessAlert';
import SourceUploadErrorAlert from './components/alerts/SourceUploadErrorAlert';

const ChatbotMain: React.FunctionComponent = () => {
  const displayMode = ChatbotDisplayMode.fullscreen;
  const { models, loading, error } = useFetchLlamaModels();
  const [selectedModel, setSelectedModel] = React.useState<string>('');
  const modelId = selectedModel || models[0]?.identifier;

  React.useEffect(() => {
    if (!selectedModel) {
      setSelectedModel(models[0]?.identifier);
    }
  }, [models, selectedModel]);

  // Custom hooks for managing different aspects of the chatbot
  const alertManagement = useAlertManagement();
  const sourceManagement = useSourceManagement({
    onShowSuccessAlert: alertManagement.onShowSuccessAlert,
    onShowErrorAlert: alertManagement.onShowErrorAlert,
  });
  const systemInstructions = useSystemInstructions();
  const accordionState = useAccordionState();
  const chatbotMessages = useChatbotMessages({
    modelId,
    selectedSourceSettings: sourceManagement.selectedSourceSettings,
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

  // Loading and error states
  if (loading) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (error) {
    return (
      <Alert variant="warning" isInline title="Cannot fetch models">
        {error}
      </Alert>
    );
  }

  // Settings panel content
  const settingsPanelContent = (
    <ChatbotSettingsPanel
      accordionState={accordionState}
      models={models}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      systemInstructions={systemInstructions}
      alerts={{ successAlert, errorAlert }}
      sourceManagement={sourceManagement}
    />
  );

  return (
    <>
      {sourceManagement.isSourceSettingsOpen && (
        <ChatbotSourceSettingsModal
          onToggle={() =>
            sourceManagement.setIsSourceSettingsOpen(!sourceManagement.isSourceSettingsOpen)
          }
          onSubmitSettings={sourceManagement.handleSourceSettingsSubmit}
        />
      )}
      <Drawer isExpanded isInline position="right">
        <DrawerContent panelContent={settingsPanelContent}>
          <DrawerContentBody
            style={{ overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            <Chatbot displayMode={displayMode} data-testid="chatbot">
              <ChatbotHeader>
                <ChatbotHeaderMain>
                  <ChatbotHeaderTitle>
                    <Title headingLevel="h1" size="lg">
                      AI playground
                    </Title>
                  </ChatbotHeaderTitle>
                </ChatbotHeaderMain>
              </ChatbotHeader>
              <ChatbotContent>
                <MessageBox position="bottom">
                  <ChatbotWelcomePrompt
                    title="Hello"
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
    </>
  );
};

export { ChatbotMain };
