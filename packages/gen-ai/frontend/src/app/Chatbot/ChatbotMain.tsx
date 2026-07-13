/* eslint-disable camelcase */
import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState, EmptyStateVariant, Spinner, Content } from '@patternfly/react-core';
import { ApplicationsPage } from 'mod-arch-shared';
import {
  fireMiscTrackingEvent,
  fireSimpleTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import ChatbotEmptyState from '~/app/EmptyStates/NoData';
import { GenAiContext } from '~/app/context/GenAiContext';
import { isLlamaModelEnabled } from '~/app/utilities';
import useFetchBFFConfig from '~/app/hooks/useFetchBFFConfig';
import useFetchAAEVectorStores from '~/app/hooks/useFetchAAEVectorStores';
import useFetchVectorStores from '~/app/hooks/useFetchVectorStores';
import ChatbotConfigurationModal from '~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationModal';
import DeletePlaygroundModal from '~/app/Chatbot/components/DeletePlaygroundModal';
import ChatModal from '~/app/Chatbot/components/ChatModal';
import useFetchMCPServers from '~/app/hooks/useFetchMCPServers';
import useAgentProfileUrlParam from '~/app/agentProfile/useAgentProfileUrlParam';
import useIsProfileDirty from '~/app/agentProfile/useIsProfileDirty';
import SafeNavigationBlocker from '~/app/components/SafeNavigationBlocker';
import { useSafeBrowserUnloadBlocker } from '~/app/hooks/useSafeBrowserUnloadBlocker';
import ChatbotHeader from './ChatbotHeader';
import ChatbotPlayground from './ChatbotPlayground';
import ChatbotHeaderActions from './ChatbotHeaderActions';
import SaveAgentProfileModal from './components/SaveAgentProfileModal';
import LoadAgentProfileModal from './components/LoadAgentProfileModal';
import {
  useChatbotConfigStore,
  selectConfigIds,
  selectSelectedModel,
  DEFAULT_CONFIG_ID,
} from './store';
import { usePlaygroundStore } from './store/usePlaygroundStore';
import PromptManagementModal from './components/promptManagementModal';

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
    maasModelsError,
    models,
    modelsLoaded,
    modelsError,
  } = React.useContext(ChatbotContext);
  const { namespace } = React.useContext(GenAiContext);
  const {
    data: mcpServers = [],
    configMapName: mcpConfigMapName,
    loaded: mcpServersLoaded,
  } = useFetchMCPServers();
  const { data: bffConfig } = useFetchBFFConfig();
  const { data: allCollections, loaded: collectionsLoaded } = useFetchAAEVectorStores();
  const [existingCollections] = useFetchVectorStores();

  const [isViewCodeModalOpen, setIsViewCodeModalOpen] = React.useState(false);
  const [configurationModalOpen, setConfigurationModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = React.useState(false);
  const [isCompareChatModalOpen, setIsCompareChatModalOpen] = React.useState(false);
  const { isPromptManagementModalOpen } = usePlaygroundStore();
  // Track which pane's settings are active in compare mode
  const [activePaneConfigId, setActivePaneConfigId] = React.useState<string>(DEFAULT_CONFIG_ID);
  const [isDrawerExpanded, setIsDrawerExpanded] = React.useState(true);

  // Ref to clear all chat messages (will be set by ChatbotPlayground)
  const clearAllMessagesRef = React.useRef<(() => void) | null>(null);
  // Ref to check whether any pane has user messages (beyond the initial welcome)
  const hasConversationMessagesRef = React.useRef<(() => boolean) | null>(null);

  // Derive compare mode from Zustand store (configIds.length > 1)
  const [searchParams, setSearchParams] = useSearchParams();
  const agentProfileId = searchParams.get('agentProfileId');

  // Load agent profile from URL param — lives here so the ApplicationsPage spinner covers the fetch
  const { loading: profileLoading, error: profileLoadError } = useAgentProfileUrlParam({
    mcpServers,
    mcpServersLoaded,
  });
  const profileApplied = useChatbotConfigStore((s) => s.profileApplied);
  const loadedProfileId = useChatbotConfigStore((s) => s.loadedProfileId);
  // Ready when: no profile to load, fetch errored, or profile fully applied (async assets settled)
  const profileReady =
    !agentProfileId ||
    !!profileLoadError ||
    (profileApplied && loadedProfileId === agentProfileId && !profileLoading);
  const configIds = useChatbotConfigStore(selectConfigIds);
  const isCompareMode = configIds.length > 1;
  const primaryConfigId = configIds[0] || DEFAULT_CONFIG_ID;

  const isProfileDirty = useIsProfileDirty(primaryConfigId);
  useSafeBrowserUnloadBlocker(isProfileDirty);
  const selectedModel = useChatbotConfigStore(selectSelectedModel(primaryConfigId));

  // Check if there are any models available (either AI assets or MaaS models)
  const hasModels = aiModels.length > 0 || maasModels.length > 0;

  // Handle closing a pane - set active pane to the remaining config
  const handleClosePane = React.useCallback((configIdToClose: string) => {
    const currentConfigIds = useChatbotConfigStore.getState().configIds;
    const remainingConfigId = currentConfigIds.find((id) => id !== configIdToClose);
    useChatbotConfigStore.getState().removeConfiguration(configIdToClose);
    // Set active pane to the remaining config (or default if somehow none remain)
    setActivePaneConfigId(remainingConfigId || DEFAULT_CONFIG_ID);
    fireMiscTrackingEvent('Playground Compare Mode Exited', { success: true });
  }, []);

  const [saveModalMode, setSaveModalMode] = React.useState<'save' | 'save-as' | null>(null);
  const [loadModalOpen, setLoadModalOpen] = React.useState(false);

  const handleOpenSave = React.useCallback(() => setSaveModalMode('save'), []);
  const handleOpenSaveAs = React.useCallback(() => setSaveModalMode('save-as'), []);
  const handleCloseSaveModal = React.useCallback(() => setSaveModalMode(null), []);
  const handleOpenLoad = React.useCallback(() => setLoadModalOpen(true), []);

  const handleNewAgentConfiguration = React.useCallback(() => {
    useChatbotConfigStore.getState().resetConfiguration();
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('agentProfileId');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const handleProfileSelected = React.useCallback(
    (profileId: string) => {
      setLoadModalOpen(false);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('agentProfileId', profileId);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleProfileSaved = React.useCallback(
    (profileId: string, displayName: string, description: string) => {
      const currentConfig = useChatbotConfigStore.getState().configurations[primaryConfigId];
      if (!currentConfig) {
        return;
      }
      useChatbotConfigStore
        .getState()
        .applyAgentProfile(currentConfig, profileId, displayName, description);
      // Keep the URL in sync so a page refresh reloads the saved profile
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('agentProfileId', profileId);
          return next;
        },
        { replace: true },
      );
    },
    [primaryConfigId, setSearchParams],
  );

  // Handle compare chat confirmation - clears messages and enters compare mode
  const handleCompareConfirm = React.useCallback(() => {
    // Clear all chat messages
    if (clearAllMessagesRef.current) {
      clearAllMessagesRef.current();
    }
    // Enter compare mode by duplicating the first config
    const firstConfigId = useChatbotConfigStore.getState().configIds[0] || DEFAULT_CONFIG_ID;
    useChatbotConfigStore.getState().duplicateConfiguration(firstConfigId);
    fireMiscTrackingEvent('Playground Compare Mode Entered', { success: true });
  }, []);

  // Check if there are any models in the project or if no model is selected
  const hasNoModels = models.length === 0;
  const isSelectedModelDisabled = selectedModel
    ? !isLlamaModelEnabled(selectedModel, aiModels, maasModels, bffConfig?.isCustomLSD ?? false)
    : false;

  const hasNoModelsOrSelectedModelDisabled = hasNoModels || isSelectedModelDisabled;

  return (
    <>
      <ApplicationsPage
        title={<ChatbotHeader />}
        loaded={
          lsdStatusLoaded &&
          (aiModelsLoaded || !!aiModelsError) &&
          (maasModelsLoaded || !!maasModelsError) &&
          (lsdStatus?.phase !== 'Ready' || !!modelsLoaded || !!modelsError) &&
          profileReady
        }
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
              actionButtonHref={`/ai-hub/deployments/${namespace?.name ?? ''}`}
            />
          ) : (
            <ChatbotEmptyState
              data-testid="create-playground-empty-state"
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
        loadError={lsdStatusError || aiModelsError || profileLoadError}
        headerAction={
          hasNoModelsOrSelectedModelDisabled ? undefined : (
            <ChatbotHeaderActions
              onSave={handleOpenSave}
              onSaveAs={handleOpenSaveAs}
              onLoad={handleOpenLoad}
              onNew={handleNewAgentConfiguration}
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
                const hasMessages = hasConversationMessagesRef.current?.();
                if (hasMessages) {
                  setIsCompareChatModalOpen(true);
                } else {
                  handleCompareConfirm();
                }
              }}
              onSettingsClick={() => setIsDrawerExpanded((prev) => !prev)}
              isSettingsOpen={isDrawerExpanded}
              isCompareMode={isCompareMode}
            />
          )
        }
      >
        {lsdStatus?.phase === 'Ready' ? (
          hasNoModelsOrSelectedModelDisabled ? (
            <ChatbotEmptyState
              title="You need at least one model"
              data-testid="no-models-empty-state"
              description={
                <Content
                  style={{
                    textAlign: 'left',
                  }}
                >
                  <Content component="p">
                    Looks like your project is missing at least one model to use the playground.
                    <br />
                    Follow the steps below to deploy and make a model available.
                  </Content>
                  <Content component="ol">
                    <Content component="li">
                      Go to your <b>Model Deployments </b> page and identify an LLM model
                    </Content>
                    <Content component="li">
                      Select <b>&apos;Edit&apos;</b> to update your deployment
                    </Content>
                    <Content component="li">
                      Check the box:{' '}
                      <b>&apos;Make this deployment available as an AI asset&apos;</b>
                    </Content>
                  </Content>
                </Content>
              }
              actionButtonText={
                <>
                  Go to <b>Model deployments</b>
                </>
              }
              actionButtonHref={`/ai-hub/deployments/${namespace?.name ?? ''}`}
            />
          ) : (
            <ChatbotPlayground
              isViewCodeModalOpen={isViewCodeModalOpen}
              setIsViewCodeModalOpen={setIsViewCodeModalOpen}
              isNewChatModalOpen={isNewChatModalOpen}
              setIsNewChatModalOpen={setIsNewChatModalOpen}
              activePaneConfigId={activePaneConfigId}
              setActivePaneConfigId={setActivePaneConfigId}
              onClosePane={handleClosePane}
              clearAllMessagesRef={clearAllMessagesRef}
              hasConversationMessagesRef={hasConversationMessagesRef}
              isDrawerExpanded={isDrawerExpanded}
              setIsDrawerExpanded={setIsDrawerExpanded}
              onOpenLoad={handleOpenLoad}
              onOpenSave={handleOpenSave}
              onOpenSaveAs={handleOpenSaveAs}
            />
          )
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
          allCollections={allCollections}
          collectionsLoaded={collectionsLoaded}
          existingCollections={existingCollections}
        />
      )}
      {deleteModalOpen && (
        <DeletePlaygroundModal
          onCancel={() => {
            setDeleteModalOpen(false);
          }}
        />
      )}
      <ChatModal
        isOpen={isCompareChatModalOpen}
        onClose={() => setIsCompareChatModalOpen(false)}
        onConfirm={handleCompareConfirm}
        variant="compare"
      />
      {isPromptManagementModalOpen && <PromptManagementModal />}
      {saveModalMode && (
        <SaveAgentProfileModal
          mode={saveModalMode}
          mcpServers={mcpServers}
          mcpConfigMapName={mcpConfigMapName}
          onClose={handleCloseSaveModal}
          onSaved={handleProfileSaved}
        />
      )}
      {loadModalOpen && (
        <LoadAgentProfileModal
          onClose={() => setLoadModalOpen(false)}
          onSelect={handleProfileSelected}
        />
      )}
      {isProfileDirty && <SafeNavigationBlocker hasUnsavedChanges={isProfileDirty} />}
    </>
  );
};

export { ChatbotMain };
