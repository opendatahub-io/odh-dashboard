/* eslint-disable camelcase */
import * as React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Bullseye,
  Spinner,
  Flex,
  Button,
  Popover,
} from '@patternfly/react-core';
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
import { DeploymentMode, useModularArchContext } from 'mod-arch-core';
import { CodeIcon } from '@patternfly/react-icons';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import { ChatbotSourceSettingsModal } from './sourceUpload/ChatbotSourceSettingsModal';
import { ChatbotMessages } from './ChatbotMessagesList';
import { ChatbotSettingsPanel } from './components/ChatbotSettingsPanel';
import useChatbotMessages from './hooks/useChatbotMessages';
import useSourceManagement from './hooks/useSourceManagement';
import useAlertManagement from './hooks/useAlertManagement';
import SourceUploadSuccessAlert from './components/alerts/SourceUploadSuccessAlert';
import SourceUploadErrorAlert from './components/alerts/SourceUploadErrorAlert';
import { DEFAULT_SYSTEM_INSTRUCTIONS } from './const';
import { ViewCodeModal } from './components/ViewCodeModal';

const ChatbotMain: React.FunctionComponent = () => {
  const { config } = useModularArchContext();
  const isStandalone = config.deploymentMode === DeploymentMode.Standalone;
  const displayMode = ChatbotDisplayMode.embedded;
  const { models, loading, error } = useFetchLlamaModels();
  const [selectedModel, setSelectedModel] = React.useState<string>('');
  const [isViewCodeModalOpen, setIsViewCodeModalOpen] = React.useState(false);
  const [input, setInput] = React.useState<string>('');

  const modelId = selectedModel || models[0]?.id;
  const [systemInstruction, setSystemInstruction] = React.useState<string>(
    DEFAULT_SYSTEM_INSTRUCTIONS,
  );

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

  const isViewCodeDisabled = React.useMemo(() => !input || !modelId, [input, modelId]);

  // Get disabled reason for popover
  const getDisabledReason = React.useCallback(() => {
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
  }, [input, modelId]);

  const chatbotMessages = useChatbotMessages({
    modelId,
    selectedSourceSettings: sourceManagement.selectedSourceSettings,
    systemInstruction,
    isRawUploaded: sourceManagement.isRawUploaded,
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
    />
  );

  const applicationsPage = (
    <ApplicationsPage
      title="AI playground"
      loaded={!loading}
      empty={false}
      loadError={error}
      headerAction={
        isViewCodeDisabled ? (
          <Popover
            aria-label="View code disabled popover"
            bodyContent={getDisabledReason()}
            position="bottom"
            enableFlip
          >
            <Button
              variant="secondary"
              aria-label="View generated code (disabled)"
              onClick={() => setIsViewCodeModalOpen(true)}
              icon={<CodeIcon />}
              isDisabled={isViewCodeDisabled}
              style={{ pointerEvents: 'none' }}
            >
              View Code
            </Button>
          </Popover>
        ) : (
          <Button
            variant="secondary"
            aria-label="View generated code"
            onClick={() => setIsViewCodeModalOpen(true)}
            icon={<CodeIcon />}
          >
            View Code
          </Button>
        )
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

  return isStandalone ? (
    applicationsPage
  ) : (
    // In federated mode, DrawerBody is not flex which the Page items expect the parent to be.
    // This is a workaround to make the drawer body flex.
    <Flex
      direction={{ default: 'column' }}
      flexWrap={{ default: 'nowrap' }}
      style={{ height: '100%' }}
    >
      {applicationsPage}
    </Flex>
  );
};

export { ChatbotMain };
