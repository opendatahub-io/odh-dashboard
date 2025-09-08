/* eslint-disable camelcase */
import * as React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Bullseye,
  Spinner,
  Flex,
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
import { getCurrentUser } from '~/app/services/userService';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import { ChatbotSourceSettingsModal } from './sourceUpload/ChatbotSourceSettingsModal';
import { ChatbotMessages } from './ChatbotMessagesList';
import { ChatbotSettingsPanel } from './components/ChatbotSettingsPanel';
import ChatbotHeader from './ChatbotHeader';
import useChatbotMessages from './hooks/useChatbotMessages';
import useSourceManagement from './hooks/useSourceManagement';
import useAlertManagement from './hooks/useAlertManagement';
import SourceUploadSuccessAlert from './components/alerts/SourceUploadSuccessAlert';
import SourceUploadErrorAlert from './components/alerts/SourceUploadErrorAlert';
import { DEFAULT_SYSTEM_INSTRUCTIONS } from './const';

const ChatbotMain: React.FunctionComponent = () => {
  const { config } = useModularArchContext();
  const isStandalone = config.deploymentMode === DeploymentMode.Standalone;
  const displayMode = ChatbotDisplayMode.embedded;
  const { models, loading, error } = useFetchLlamaModels();
  const [selectedModel, setSelectedModel] = React.useState<string>('');
  const [availableProjects, setAvailableProjects] = React.useState<string[]>([]);
  const [selectedProject, setSelectedProject] = React.useState<string>('');
  const [username, setUsername] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (!selectedProject && availableProjects.length > 0) {
      setSelectedProject(availableProjects[0]);
    }
  }, [selectedProject, availableProjects]);

  const modelId = selectedModel || models[0]?.id;
  const [systemInstruction, setSystemInstruction] = React.useState<string>(
    DEFAULT_SYSTEM_INSTRUCTIONS,
  );

  const handleProjectChange = (projectName: string) => {
    setSelectedProject(projectName);
  };

  React.useEffect(() => {
    if (!selectedModel) {
      setSelectedModel(models[0]?.id);
    }
  }, [models, selectedModel]);

  React.useEffect(() => {
    getCurrentUser().then((res) => setUsername(res.userId));
  }, []);

  // Custom hooks for managing different aspects of the chatbot
  const alertManagement = useAlertManagement();
  const sourceManagement = useSourceManagement({
    onShowSuccessAlert: alertManagement.onShowSuccessAlert,
    onShowErrorAlert: alertManagement.onShowErrorAlert,
  });

  const chatbotMessages = useChatbotMessages({
    modelId,
    selectedSourceSettings: sourceManagement.selectedSourceSettings,
    systemInstruction,
    isRawUploaded: sourceManagement.isRawUploaded,
    username,
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
      title={
        <ChatbotHeader
          selectedProject={selectedProject}
          onProjectChange={handleProjectChange}
          onProjectsLoaded={setAvailableProjects}
          isLoading={loading}
        />
      }
      loaded={!loading}
      empty={false}
      loadError={error}
    >
      <ChatbotSourceSettingsModal
        isOpen={sourceManagement.isSourceSettingsOpen}
        onToggle={() =>
          sourceManagement.setIsSourceSettingsOpen(!sourceManagement.isSourceSettingsOpen)
        }
        onSubmitSettings={sourceManagement.handleSourceSettingsSubmit}
      />
      <Drawer isExpanded isInline position="right">
        <DrawerContent panelContent={settingsPanelContent}>
          <DrawerContentBody>
            <Chatbot displayMode={displayMode} data-testid="chatbot">
              <ChatbotContent>
                <MessageBox position="bottom">
                  <ChatbotWelcomePrompt
                    title={
                      username
                        ? `Hello, ${username.charAt(0).toUpperCase() + username.slice(1)}`
                        : 'Hello'
                    }
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
