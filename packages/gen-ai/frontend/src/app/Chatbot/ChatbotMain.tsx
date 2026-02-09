/* eslint-disable camelcase */
import * as React from 'react';
import { EmptyState, EmptyStateVariant, Spinner, Content } from '@patternfly/react-core';
import { ApplicationsPage } from 'mod-arch-shared';
import { useNavigate } from 'react-router-dom';
import {
  fireMiscTrackingEvent,
  fireSimpleTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import ChatbotEmptyState from '~/app/EmptyStates/NoData';
import { GenAiContext } from '~/app/context/GenAiContext';
import ChatbotConfigurationModal from '~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationModal';
import DeletePlaygroundModal from '~/app/Chatbot/components/DeletePlaygroundModal';
import CompareChatModal from '~/app/Chatbot/components/CompareChatModal';
import ChatbotHeader from './ChatbotHeader';
import ChatbotPlayground from './ChatbotPlayground';
import ChatbotHeaderActions from './ChatbotHeaderActions';
import { useChatbotConfigStore, selectConfigIds, DEFAULT_CONFIG_ID } from './store';

const ChatbotMain: React.FunctionComponent = () => {
  const {
    lsdStatus,
    lsdStatusLoaded,
    lsdStatusError,
    refresh,
    aiModels,
    aiModelsLoaded,
    aiModelsError,
    maasModels,
    maasModelsLoaded,
    models,
  } = React.useContext(ChatbotContext);
  const { namespace } = React.useContext(GenAiContext);

  const navigate = useNavigate();

  const [isViewCodeModalOpen, setIsViewCodeModalOpen] = React.useState(false);
  const [configurationModalOpen, setConfigurationModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = React.useState(false);
  const [isCompareChatModalOpen, setIsCompareChatModalOpen] = React.useState(false);
  // Track which pane's settings are active in compare mode
  const [activePaneConfigId, setActivePaneConfigId] = React.useState<string>(DEFAULT_CONFIG_ID);

  // Ref to clear all chat messages (will be set by ChatbotPlayground)
  const clearAllMessagesRef = React.useRef<(() => void) | null>(null);

  // Derive compare mode from Zustand store (configIds.length > 1)
  const configIds = useChatbotConfigStore(selectConfigIds);
  const isCompareMode = configIds.length > 1;

  // Check if there are any models available (either AI assets or MaaS models)
  const hasModels = aiModels.length > 0 || maasModels.length > 0;

  // Handle closing a pane - set active pane to the remaining config
  const handleClosePane = React.useCallback((configIdToClose: string) => {
    const currentConfigIds = useChatbotConfigStore.getState().configIds;
    const remainingConfigId = currentConfigIds.find((id) => id !== configIdToClose);
    useChatbotConfigStore.getState().removeConfiguration(configIdToClose);
    // Set active pane to the remaining config (or default if somehow none remain)
    setActivePaneConfigId(remainingConfigId || DEFAULT_CONFIG_ID);
    fireSimpleTrackingEvent('Playground Compare Mode Exited');
  }, []);

  // Handle compare chat confirmation - clears messages and enters compare mode
  const handleCompareConfirm = React.useCallback(() => {
    // Clear all chat messages
    if (clearAllMessagesRef.current) {
      clearAllMessagesRef.current();
    }
    // Enter compare mode by duplicating the first config
    const firstConfigId = useChatbotConfigStore.getState().configIds[0] || DEFAULT_CONFIG_ID;
    useChatbotConfigStore.getState().duplicateConfiguration(firstConfigId);
    fireSimpleTrackingEvent('Playground Compare Mode Entered');
  }, []);

  return (
    <>
      <ApplicationsPage
        title={<ChatbotHeader />}
        loaded={lsdStatusLoaded && (aiModelsLoaded || maasModelsLoaded)}
        empty={!lsdStatus}
        emptyStatePage={
          !hasModels ? (
            <ChatbotEmptyState
              title="No available model deployments"
              description={
                <Content
                  style={{
                    textAlign: 'left',
                  }}
                >
                  <Content component="p">
                    Model deployments must be added as AI asset endpoints to be available for
                    testing in this model playground.
                  </Content>
                  <Content component="p">To enable a deployment:</Content>
                  <Content component="ol">
                    <Content component="li">
                      Deploy a new model or edit an existing deployment.
                    </Content>
                    <Content component="li">
                      In the deployment configuration, check the <b>Add as AI asset endpoint</b> box
                    </Content>
                  </Content>
                </Content>
              }
              actionButtonText={
                <>
                  Go to <b>Model deployments</b>
                </>
              }
              handleActionButtonClick={() => {
                navigate(`/ai-hub/deployments/${namespace?.name}`);
              }}
            />
          ) : (
            <ChatbotEmptyState
              title="Create your playground"
              description="Create a playground to interact with and test available generative models in this project."
              actionButtonText="Create playground"
              handleActionButtonClick={() => {
                setConfigurationModalOpen(true);
                fireMiscTrackingEvent('Playground Setup Initiated', {
                  source: 'Playground',
                });
              }}
            />
          )
        }
        loadError={lsdStatusError || aiModelsError}
        headerAction={
          <ChatbotHeaderActions
            onViewCode={() => {
              setIsViewCodeModalOpen(true);
              fireSimpleTrackingEvent('Playground View Code Selected');
            }}
            onConfigurePlayground={() => setConfigurationModalOpen(true)}
            onDeletePlayground={() => setDeleteModalOpen(true)}
            onNewChat={() => {
              setIsNewChatModalOpen(true);
              fireSimpleTrackingEvent('Playground New Chat Selected');
            }}
            onCompareChat={() => {
              setIsCompareChatModalOpen(true);
              fireSimpleTrackingEvent('Playground Compare Chat Selected');
            }}
            isCompareMode={isCompareMode}
          />
        }
      >
        {lsdStatus?.phase === 'Ready' ? (
          <ChatbotPlayground
            isViewCodeModalOpen={isViewCodeModalOpen}
            setIsViewCodeModalOpen={setIsViewCodeModalOpen}
            isNewChatModalOpen={isNewChatModalOpen}
            setIsNewChatModalOpen={setIsNewChatModalOpen}
            activePaneConfigId={activePaneConfigId}
            setActivePaneConfigId={setActivePaneConfigId}
            onClosePane={handleClosePane}
            clearAllMessagesRef={clearAllMessagesRef}
          />
        ) : lsdStatus?.phase === 'Failed' ? (
          <EmptyState
            headingLevel="h4"
            titleText="Playground creation failed"
            variant={EmptyStateVariant.lg}
            status="danger"
          />
        ) : (
          <EmptyState headingLevel="h4" titleText="Creating playground" icon={Spinner} />
        )}
      </ApplicationsPage>
      {configurationModalOpen && (
        <ChatbotConfigurationModal
          onClose={() => {
            setConfigurationModalOpen(false);
            refresh();
          }}
          aiModels={aiModels}
          lsdStatus={lsdStatus}
          existingModels={models}
          maasModels={maasModels}
        />
      )}
      {deleteModalOpen && (
        <DeletePlaygroundModal
          onCancel={() => {
            setDeleteModalOpen(false);
          }}
        />
      )}
      <CompareChatModal
        isOpen={isCompareChatModalOpen}
        onClose={() => setIsCompareChatModalOpen(false)}
        onConfirm={handleCompareConfirm}
      />
    </>
  );
};

export { ChatbotMain };
