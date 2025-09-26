import * as React from 'react';
import { Drawer, DrawerContent, DrawerContentBody } from '@patternfly/react-core';
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
import { useUserContext } from '~/app/context/UserContext';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { ChatbotSourceSettingsModal } from './sourceUpload/ChatbotSourceSettingsModal';
import useSourceManagement from './hooks/useSourceManagement';
import useAlertManagement from './hooks/useAlertManagement';
import useChatbotMessages from './hooks/useChatbotMessages';
import { ChatbotSettingsPanel } from './components/ChatbotSettingsPanel';
import SourceUploadErrorAlert from './components/alerts/SourceUploadErrorAlert';
import SourceUploadSuccessAlert from './components/alerts/SourceUploadSuccessAlert';
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
  const { models, modelsLoaded, selectedModel, setSelectedModel, lastInput, setLastInput } =
    React.useContext(ChatbotContext);

  const [systemInstruction, setSystemInstruction] = React.useState<string>('');
  const [isStreamingEnabled, setIsStreamingEnabled] = React.useState<boolean>(true);
  const [temperature, setTemperature] = React.useState<number>(0.1);
  const [topP, setTopP] = React.useState<number>(0.1);

  React.useEffect(() => {
    if (modelsLoaded && models.length > 0 && !selectedModel) {
      setSelectedModel(models[0]?.id);
    }
  }, [modelsLoaded, models, selectedModel, setSelectedModel]);

  // Custom hooks for managing different aspects of the chatbot
  const alertManagement = useAlertManagement();
  const sourceManagement = useSourceManagement({
    onShowSuccessAlert: alertManagement.onShowSuccessAlert,
    onShowErrorAlert: alertManagement.onShowErrorAlert,
  });

  const chatbotMessages = useChatbotMessages({
    modelId: selectedModel,
    selectedSourceSettings: sourceManagement.selectedSourceSettings,
    systemInstruction,
    isRawUploaded: sourceManagement.isRawUploaded,
    username,
    isStreamingEnabled,
    temperature,
    topP,
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
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      alerts={{ successAlert, errorAlert }}
      sourceManagement={sourceManagement}
      systemInstruction={systemInstruction}
      onSystemInstructionChange={setSystemInstruction}
      isStreamingEnabled={isStreamingEnabled}
      onStreamingToggle={setIsStreamingEnabled}
      temperature={temperature}
      onTemperatureChange={setTemperature}
      topP={topP}
      onTopPChange={setTopP}
    />
  );

  return (
    <>
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
        input={lastInput}
        model={selectedModel}
        systemInstruction={systemInstruction}
      />
      <Drawer isExpanded isInline position="right">
        <DrawerContent panelContent={settingsPanelContent}>
          <DrawerContentBody>
            <Chatbot displayMode={ChatbotDisplayMode.embedded} data-testid="chatbot">
              <ChatbotContent>
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
              <ChatbotFooter>
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

export default ChatbotPlayground;
