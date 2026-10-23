/* eslint-disable camelcase */
import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState, EmptyStateVariant, Spinner, Content } from '@patternfly/react-core';
import { ApplicationsPage } from 'mod-arch-shared';
import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import {
  fireMiscTrackingEvent,
  fireSimpleTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { PLAYGROUND_AGENT_EVENTS } from '~/app/tracking/playgroundAgentTrackingConstants';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import ChatbotEmptyState from '~/app/EmptyStates/NoData';
import { GenAiContext } from '~/app/context/GenAiContext';
import {
  convertMaaSModelToAIModel,
  isLlamaModelEnabled,
  resolveAIModelForPlaygroundSelection,
} from '~/app/utilities';
import { filterUnavailableMCPServers } from '~/app/utilities/mcp';
import { serializeToAgentProfileSpec } from '~/app/agentProfile/serialize';
import useFetchBFFConfig from '~/app/hooks/useFetchBFFConfig';
import useFetchAAEVectorStores from '~/app/hooks/useFetchAAEVectorStores';
import useFetchVectorStores from '~/app/hooks/useFetchVectorStores';
import { useNotification } from '~/app/hooks/useNotification';
import { TokenInfo } from '~/app/types';
import { getMCPServerAuth } from '~/app/agentProfile/mcpServerAuth';
import ChatbotConfigurationModal from '~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationModal';
import DeletePlaygroundModal from '~/app/Chatbot/components/DeletePlaygroundModal';
import ChatModal from '~/app/Chatbot/components/ChatModal';
import { getModelSubscriptions } from '~/app/Chatbot/components/SubscriptionDropdown';
import useFetchMCPServers from '~/app/hooks/useFetchMCPServers';
import useMCPServerStatuses from '~/app/hooks/useMCPServerStatuses';
import useAgentProfileUrlParam from '~/app/agentProfile/useAgentProfileUrlParam';
import { deserializeAgentProfile } from '~/app/agentProfile/deserialize';
import useIsProfileDirty from '~/app/agentProfile/useIsProfileDirty';
import { sortDeploymentsByMostRecent } from '~/app/agentProfile/deploymentUtils';
import { AGENT_CONFIG_MANAGEMENT } from '~/odh/extensions';
import SafeNavigationBlocker from '~/app/components/SafeNavigationBlocker';
import { useSafeBrowserUnloadBlocker } from '~/app/hooks/useSafeBrowserUnloadBlocker';
import useFetchAgentDeployments from '~/app/AIAssets/hooks/useFetchAgentDeployments';
import useGenAiAgentDeploymentEnabled from '~/app/hooks/useGenAiAgentDeploymentEnabled';
import ChatbotHeader from './ChatbotHeader';
import ChatbotPlayground from './ChatbotPlayground';
import ChatbotHeaderActions from './ChatbotHeaderActions';
import SaveAgentProfileModal from './components/SaveAgentProfileModal';
import LoadAgentProfileModal from './components/LoadAgentProfileModal';
import DeployAgentModal from './components/DeployAgentModal';
import {
  useChatbotConfigStore,
  selectConfigIds,
  selectSelectedModel,
  DEFAULT_CONFIG_ID,
  DEFAULT_CONFIGURATION,
  ChatbotConfiguration,
  McpToolSelectionsMap,
} from './store';
import { usePlaygroundStore } from './store/usePlaygroundStore';
import PromptManagementModal from './components/promptManagementModal';
import useAgentDeploymentPolling from './hooks/useAgentDeploymentPolling';
import useSaveAgentProfile from './hooks/useSaveAgentProfile';
import AgentDeploymentsModal from './components/AgentDeploymentsModal';

// Canonicalize the nested MCP selections map's keys (namespace, then server) before
// comparison — JSON.stringify walks keys in insertion order, so a server removed and
// re-added with unchanged selections would otherwise read as dirty. Tool arrays keep
// their order: it carries selection semantics.
const canonicalizeMcpToolSelections = (selections: McpToolSelectionsMap): McpToolSelectionsMap =>
  Object.fromEntries(
    Object.entries(selections)
      .toSorted(([a], [b]) => a.localeCompare(b))
      .map(([namespace, serverMap]) => [
        namespace,
        serverMap
          ? Object.fromEntries(Object.entries(serverMap).toSorted(([a], [b]) => a.localeCompare(b)))
          : undefined,
      ]),
  );

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
    registryAvailable: mcpRegistryAvailable,
    loaded: mcpServersLoaded,
    error: mcpServersLoadError,
  } = useFetchMCPServers();
  const {
    serverStatuses: mcpServerStatuses,
    statusesLoading: mcpServerStatusesLoading,
    checkServerStatus: checkMcpServerStatus,
  } = useMCPServerStatuses(mcpServers, mcpServersLoaded);
  const availableMcpServers = React.useMemo(
    () => filterUnavailableMCPServers(mcpServers, mcpServerStatuses),
    [mcpServers, mcpServerStatuses],
  );
  const areMcpServerStatusesResolved =
    mcpServersLoaded &&
    mcpServerStatusesLoading.size === 0 &&
    mcpServers.every((server) => mcpServerStatuses.has(server.url));
  const { data: bffConfig } = useFetchBFFConfig();
  const { data: allCollections, loaded: collectionsLoaded } = useFetchAAEVectorStores();
  const [existingCollections] = useFetchVectorStores();

  const [isViewCodeModalOpen, setIsViewCodeModalOpen] = React.useState(false);
  const [configurationModalOpen, setConfigurationModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  // True from when a playground update is submitted until the restarted
  // playground is ready again — used to show update wording on the page
  // while the service restarts
  const [isPlaygroundUpdateInitiated, setIsPlaygroundUpdateInitiated] = React.useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = React.useState(false);
  const [isCompareChatModalOpen, setIsCompareChatModalOpen] = React.useState(false);
  const { isPromptManagementModalOpen } = usePlaygroundStore();
  // Track which pane's settings are active in compare mode
  const [activePaneConfigId, setActivePaneConfigId] = React.useState<string>(DEFAULT_CONFIG_ID);
  const [isDrawerExpanded, setIsDrawerExpanded] = React.useState(true);

  // Reset the update flag once the restarted playground is ready again
  React.useEffect(() => {
    if (lsdStatus?.phase === 'Ready') {
      setIsPlaygroundUpdateInitiated(false);
    }
  }, [lsdStatus?.phase]);

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
    availableMcpServers,
    mcpServersLoaded,
    mcpServerStatusesResolved: areMcpServerStatusesResolved,
  });
  const profileApplied = useChatbotConfigStore((s) => s.profileApplied);
  const loadedProfileId = useChatbotConfigStore((s) => s.loadedProfileId);
  const loadedProfileSpec = useChatbotConfigStore((s) => s.loadedProfileSpec);
  const { enabled: agentDeploymentsEnabled } = useGenAiAgentDeploymentEnabled();
  const [agentConfigManagementEnabled] = useFeatureFlag(AGENT_CONFIG_MANAGEMENT);
  const { data: deployments = [], refresh: refreshDeployments } = useFetchAgentDeployments(
    agentDeploymentsEnabled ? (loadedProfileId ?? undefined) : undefined,
  );
  const { data: allDeployments = [], refresh: refreshAllDeployments } = useFetchAgentDeployments(
    undefined,
    { includeAll: agentDeploymentsEnabled && profileApplied },
  );
  const sortedDeployments = React.useMemo(
    () => sortDeploymentsByMostRecent(deployments),
    [deployments],
  );
  const refreshedDeploymentProfileId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!agentDeploymentsEnabled || !profileApplied || !loadedProfileId) {
      refreshedDeploymentProfileId.current = null;
      return;
    }
    if (refreshedDeploymentProfileId.current === loadedProfileId) {
      return;
    }

    refreshedDeploymentProfileId.current = loadedProfileId;
    refreshDeployments();
  }, [agentDeploymentsEnabled, loadedProfileId, profileApplied, refreshDeployments]);
  // Ready when: no profile to load, fetch errored, or profile fully applied (async assets settled)
  const profileReady =
    !agentProfileId ||
    !!profileLoadError ||
    (profileApplied && loadedProfileId === agentProfileId && !profileLoading);
  const configIds = useChatbotConfigStore(selectConfigIds);
  const isCompareMode = configIds.length > 1;
  const primaryConfigId = configIds[0] || DEFAULT_CONFIG_ID;
  const currentConfiguration = useChatbotConfigStore(
    (state) => state.configurations[DEFAULT_CONFIG_ID],
  );

  const isProfileDirty = useIsProfileDirty(primaryConfigId, availableMcpServers, mcpConfigMapName);
  // Effective starting configuration per pane, captured once ChatbotPlayground finishes
  // initializing (route-provided values, stored MCP selections, initial model) and when a
  // compare pane is duplicated. Dirty checks and Revert compare each pane against its own
  // baseline instead of raw defaults so initialized settings are neither flagged as dirty
  // nor discarded by Revert.
  const configBaselinesRef = React.useRef<{ [configId: string]: ChatbotConfiguration | undefined }>(
    {},
  );
  const configurations = useChatbotConfigStore((s) => s.configurations);
  // The helpers below are recreated every render so the dirty check always sees the
  // latest models and store state — they are not stable references and must never
  // go into a useCallback/useEffect dependency array.
  // The subscription SubscriptionDropdown auto-picks (highest priority) for a model
  const getAutoSubscription = (model: string, isMaaSModel = false): string =>
    getModelSubscriptions(model, maasModels, isMaaSModel)[0]?.name ?? '';
  // Mask values the app manages automatically (default guardrail, auto-picked MaaS
  // subscriptions, inline-mode vector store, conversation images) so they don't read
  // as user edits. MCP tool selections are also masked until the pane's baseline exists —
  // the store pre-loads them from sessionStorage before initialization captures
  // the baseline.
  const serializeConfigForDirtyCheck = (
    config: ChatbotConfiguration,
    hasBaseline: boolean,
  ): string =>
    JSON.stringify({
      ...config,
      mcpToolSelections: hasBaseline ? canonicalizeMcpToolSelections(config.mcpToolSelections) : {},
      guardrail:
        config.guardrail ===
        models.find((model) =>
          isLlamaModelEnabled(model.id, aiModels, maasModels, bffConfig?.isCustomLSD ?? false),
        )?.id
          ? ''
          : config.guardrail,
      selectedSubscription:
        config.selectedSubscription === getAutoSubscription(config.selectedModel)
          ? ''
          : config.selectedSubscription,
      guardrailSubscription:
        config.guardrailSubscription === getAutoSubscription(config.guardrail)
          ? ''
          : config.guardrailSubscription,
      selectedAsrSubscription:
        config.selectedAsrSubscription === getAutoSubscription(config.selectedAsrModel, true)
          ? ''
          : config.selectedAsrSubscription,
      selectedVectorStoreId:
        config.knowledgeMode === 'inline' ? null : config.selectedVectorStoreId,
      hasVisionImage: false,
    });
  const isConfigDirty = (configId: string): boolean => {
    const config = configurations[configId];
    if (!config) {
      return false;
    }
    // The store is a singleton but the baselines are component-local — after a remount
    // an already-initialized configuration can outlive its baseline. Adopt it instead
    // of comparing against raw defaults, which would flag retained settings as dirty.
    // Only capture once a model is selected so a pre-initialization state is never
    // frozen as the baseline. Capturing before the comparison keeps the dirty check
    // correct on this very render.
    if (configBaselinesRef.current[configId] === undefined && config.selectedModel) {
      configBaselinesRef.current[configId] = config;
    }
    const baseline = configBaselinesRef.current[configId];
    const hasBaseline = baseline !== undefined;
    return (
      serializeConfigForDirtyCheck(config, hasBaseline) !==
      serializeConfigForDirtyCheck(baseline ?? DEFAULT_CONFIGURATION, hasBaseline)
    );
  };
  // Compare every pane so edits to either side of compare mode count
  const isDefaultConfigDirty =
    !profileApplied && configIds.some((configId) => isConfigDirty(configId));
  // The settings panel edits one pane at a time — its Revert reflects the active pane only
  const isActivePaneDirty = !profileApplied && isConfigDirty(activePaneConfigId);
  // Default-settings edits only read as unsaved while the actions that resolve them
  // (Revert, saving an agent) exist — without agent config management they are
  // session state. Profile dirtiness always blocks navigation.
  const hasUnsavedChanges =
    isProfileDirty || (agentConfigManagementEnabled && isDefaultConfigDirty);
  useSafeBrowserUnloadBlocker(hasUnsavedChanges);
  const selectedModel = useChatbotConfigStore(selectSelectedModel(primaryConfigId));

  const allAIModels = React.useMemo(
    () => [...aiModels, ...maasModels.map(convertMaaSModelToAIModel)],
    [aiModels, maasModels],
  );
  const deploymentSnapshotModel = React.useMemo(
    () =>
      currentConfiguration?.selectedModel
        ? resolveAIModelForPlaygroundSelection(
            currentConfiguration.selectedModel,
            models,
            allAIModels,
          )
        : undefined,
    [allAIModels, currentConfiguration?.selectedModel, models],
  );
  const deploymentSnapshotAsrModel = React.useMemo(
    () =>
      currentConfiguration?.isAsrModelEnabled && currentConfiguration.selectedAsrModel
        ? aiModels.find((model) => model.model_id === currentConfiguration.selectedAsrModel)
        : undefined,
    [aiModels, currentConfiguration?.isAsrModelEnabled, currentConfiguration?.selectedAsrModel],
  );
  const deploymentSnapshotProfile = React.useMemo(() => {
    if (!loadedProfileSpec || !currentConfiguration) {
      return undefined;
    }

    return {
      spec: serializeToAgentProfileSpec(
        currentConfiguration,
        loadedProfileSpec.displayName,
        loadedProfileSpec.description,
        {
          model: deploymentSnapshotModel,
          asrModel: deploymentSnapshotAsrModel,
          mcpServers: availableMcpServers,
          previousMcpServers: loadedProfileSpec.mcpServers,
          mcpConfigMapName: mcpConfigMapName ?? 'gen-ai-aa-mcp-servers',
        },
      ),
    };
  }, [
    availableMcpServers,
    currentConfiguration,
    deploymentSnapshotAsrModel,
    deploymentSnapshotModel,
    loadedProfileSpec,
    mcpConfigMapName,
  ]);

  // Check if there are any models available (either AI assets or MaaS models)
  const hasModels = aiModels.length > 0 || maasModels.length > 0;

  // Handle closing a pane - set active pane to the remaining config
  const handleClosePane = React.useCallback((configIdToClose: string) => {
    const currentConfigIds = useChatbotConfigStore.getState().configIds;
    const remainingConfigId = currentConfigIds.find((id) => id !== configIdToClose);
    useChatbotConfigStore.getState().removeConfiguration(configIdToClose);
    delete configBaselinesRef.current[configIdToClose];
    // Set active pane to the remaining config (or default if somehow none remain)
    setActivePaneConfigId(remainingConfigId || DEFAULT_CONFIG_ID);
    fireMiscTrackingEvent('Playground Compare Mode Exited', { success: true });
  }, []);

  const [saveModalMode, setSaveModalMode] = React.useState<'save' | 'save-as' | null>(null);
  const [loadModalOpen, setLoadModalOpen] = React.useState(false);
  const [deployModalOpen, setDeployModalOpen] = React.useState(false);
  const [selectedDeploymentName, setSelectedDeploymentName] = React.useState<string | null>(null);
  const [isSavingForDeployment, setIsSavingForDeployment] = React.useState(false);
  const [mcpServerTokens, setMcpServerTokens] = React.useState<Map<string, TokenInfo>>(new Map());
  const [mcpServersMissingAuth, setMcpServersMissingAuth] = React.useState<string[]>([]);
  const handleMcpMissingAuthServersChange = React.useCallback((serverNames: string[]) => {
    setMcpServersMissingAuth((currentServerNames) =>
      currentServerNames.length === serverNames.length &&
      currentServerNames.every((serverName, index) => serverName === serverNames[index])
        ? currentServerNames
        : serverNames,
    );
  }, []);
  const { isDeploying, startAgentDeployment, resetDeploymentLoading } = useAgentDeploymentPolling();
  const { saveAgentProfile } = useSaveAgentProfile(availableMcpServers, mcpConfigMapName);
  const notification = useNotification();

  const handleOpenSave = React.useCallback(() => setSaveModalMode('save'), []);
  const handleOpenSaveAs = React.useCallback(() => setSaveModalMode('save-as'), []);
  const handleCloseSaveModal = React.useCallback(() => setSaveModalMode(null), []);
  const handleOpenLoad = React.useCallback(() => setLoadModalOpen(true), []);

  const handleResetToLastSaved = React.useCallback(() => {
    const store = useChatbotConfigStore.getState();
    const {
      loadedProfileSpec: savedSpec,
      loadedProfileId: savedProfileId,
      loadedProfileDisplayName: savedDisplayName,
      loadedProfileDescription: savedDescription,
      loadedResourceVersion: savedResourceVersion,
      loadedProfilePrompt: savedPrompt,
    } = store;
    if (!savedSpec || !savedProfileId) {
      return;
    }
    fireMiscTrackingEvent(PLAYGROUND_AGENT_EVENTS.REVERTED, { agentID: savedProfileId });

    // Reconstruct a minimal AgentProfile from the stored snapshot and re-apply locally —
    // no API call needed since we already have the last-saved spec.
    const fakeProfile = {
      apiVersion: 'genai.redhat.com/v1alpha1' as const,
      kind: 'AgentProfile' as const,
      metadata: {
        name: `agent-profile-${savedProfileId}`,
        resourceVersion: savedResourceVersion ?? '',
      },
      spec: savedSpec,
    };
    const { config, mcpToolsPending } = deserializeAgentProfile(fakeProfile, {
      playgroundModels: models,
      mcpServers,
    });
    store.applyAgentProfile(config, savedProfileId, savedDisplayName ?? '', savedDescription ?? '');

    // Restore the prompt from the stored resolved copy captured at load time.
    // Using savedPrompt (not the current activePrompt) ensures we restore the exact
    // version that was loaded — not a subsequently registered version.
    if (savedSpec.prompt && savedPrompt) {
      store.updateActivePrompt(DEFAULT_CONFIG_ID, savedPrompt);
      const instruction =
        savedPrompt.template ??
        savedPrompt.messages?.find((m) => m.role === 'system')?.content ??
        '';
      store.updateSystemInstruction(DEFAULT_CONFIG_ID, instruction);
    }

    store.setLoadedProfileSpec(savedSpec);
    store.setLoadedResourceVersion(savedResourceVersion);
    if (mcpToolsPending && namespace?.name) {
      Object.entries(mcpToolsPending).forEach(([serverUrl, tools]) => {
        store.saveToolSelections(DEFAULT_CONFIG_ID, namespace.name, serverUrl, tools);
      });
    }
  }, [models, mcpServers, namespace?.name]);

  const handleNewAgentConfiguration = React.useCallback(() => {
    // Drop the baselines until the playground re-initializes and captures new ones
    configBaselinesRef.current = {};
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

  // Reported by ChatbotPlayground once initialization finishes — capture the effective
  // starting configuration as the dirty-check baseline. The model is written to the
  // store right after this callback, so patch it in.
  const handleInitialModelSelected = React.useCallback((model: string) => {
    const config = useChatbotConfigStore.getState().configurations[DEFAULT_CONFIG_ID];
    if (config) {
      configBaselinesRef.current[DEFAULT_CONFIG_ID] = { ...config, selectedModel: model };
    }
  }, []);

  // Revert restores the pane's starting values in place — compare mode, sibling panes,
  // and the active pane all stay intact. Empty deps are intentional: this only closes
  // over configBaselinesRef (a ref) and the module-level DEFAULT_CONFIGURATION, and
  // reads the store via getState() at call time.
  const handleRevertToDefaults = React.useCallback((configId: string) => {
    const state = useChatbotConfigStore.getState();
    const currentConfig = state.configurations[configId];
    if (!currentConfig) {
      return;
    }
    const baseline = configBaselinesRef.current[configId] ?? DEFAULT_CONFIGURATION;
    // The inline-mode vector store is auto-provisioned from uploaded
    // documents, not a user setting — keep it so RAG requests stay
    // connected to them after reverting
    const preserveInlineVectorStore =
      baseline.knowledgeMode === 'inline' && currentConfig.knowledgeMode === 'inline';
    // resetConfigurationValues also persists mcpToolSelections to sessionStorage,
    // so the starting MCP tool selections are restored in storage too
    state.resetConfigurationValues(configId, {
      ...baseline,
      // The vision image flag is set by conversation image uploads, not a setting —
      // keep it so view code stays consistent with the still-attached image
      hasVisionImage: currentConfig.hasVisionImage,
      selectedVectorStoreId: preserveInlineVectorStore
        ? (currentConfig.selectedVectorStoreId ?? baseline.selectedVectorStoreId)
        : baseline.selectedVectorStoreId,
    });
    // Audio transcription is shared across panes — the ASR update actions sync every
    // pane and audio uploads read the primary pane's values — so restore the ASR
    // fields through those actions instead of leaving the per-pane reset above to
    // diverge the panes. The model update resets the subscription, so it goes first.
    state.updateSelectedAsrModel(configId, baseline.selectedAsrModel);
    state.updateSelectedAsrSubscription(configId, baseline.selectedAsrSubscription);
    state.updateAsrModelEnabled(configId, baseline.isAsrModelEnabled);
  }, []);

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

  const handleCloseDeployModal = React.useCallback(() => {
    setDeployModalOpen(false);
    setIsSavingForDeployment(false);
    resetDeploymentLoading();
  }, [resetDeploymentLoading]);

  const handleDeploy = React.useCallback(
    async (name: string) => {
      if (!loadedProfileId || !loadedProfileSpec || !namespace?.name) {
        return;
      }

      setIsSavingForDeployment(true);
      try {
        // Deployments consume an immutable AgentProfile snapshot, so persist the
        // current Playground configuration (including a changed prompt) before
        // asking the BFF to create the Sandbox.
        const savedProfile = await saveAgentProfile({
          mode: 'save',
          name: loadedProfileSpec.displayName,
          description: loadedProfileSpec.description,
        });
        useChatbotConfigStore.getState().setLoadedResourceVersion(savedProfile.resourceVersion);
        useChatbotConfigStore.getState().setLoadedProfileSpec(savedProfile.spec);

        await startAgentDeployment({
          name,
          agentProfileId: savedProfile.profileId,
          namespace: namespace.name,
          mcpServerAuth: getMCPServerAuth(savedProfile.spec, availableMcpServers, mcpServerTokens),
          onCreated: () => {
            void refreshDeployments();
            void refreshAllDeployments();
          },
          onStarted: handleCloseDeployModal,
          onComplete: handleCloseDeployModal,
        });
      } catch (error) {
        notification.error(
          `Unable to deploy ${name}`,
          error instanceof Error ? error.message : 'The agent profile could not be saved.',
        );
      } finally {
        setIsSavingForDeployment(false);
      }
    },
    [
      loadedProfileId,
      loadedProfileSpec,
      availableMcpServers,
      mcpServerTokens,
      namespace?.name,
      notification,
      handleCloseDeployModal,
      refreshDeployments,
      refreshAllDeployments,
      saveAgentProfile,
      startAgentDeployment,
    ],
  );

  // Handle compare chat confirmation - clears messages and enters compare mode
  const handleCompareConfirm = React.useCallback(() => {
    // Clear all chat messages
    if (clearAllMessagesRef.current) {
      clearAllMessagesRef.current();
    }
    // Enter compare mode by duplicating the first config; the duplicate's starting state
    // is the source config as it is right now — capture it as that pane's baseline
    const firstConfigId = useChatbotConfigStore.getState().configIds[0] || DEFAULT_CONFIG_ID;
    const newConfigId = useChatbotConfigStore.getState().duplicateConfiguration(firstConfigId);
    const duplicatedConfig = newConfigId
      ? useChatbotConfigStore.getState().configurations[newConfigId]
      : undefined;
    if (newConfigId && duplicatedConfig) {
      // Audio transcription is shared across panes — the ASR update actions sync
      // every pane — so both baselines must agree on the ASR fields. Seed the
      // secondary pane's baseline with the primary pane's ASR baseline (the
      // pre-compare starting values) rather than the duplication-time values:
      // ASR edits made before compare mode stay dirty and revertible, and reverting
      // either pane restores the same shared values without flagging the sibling
      // dirty against its own baseline.
      const primaryBaseline = configBaselinesRef.current[firstConfigId] ?? duplicatedConfig;
      configBaselinesRef.current[newConfigId] = {
        ...duplicatedConfig,
        selectedAsrModel: primaryBaseline.selectedAsrModel,
        selectedAsrSubscription: primaryBaseline.selectedAsrSubscription,
        isAsrModelEnabled: primaryBaseline.isAsrModelEnabled,
      };
    }
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
              onDeploy={() => {
                fireMiscTrackingEvent(PLAYGROUND_AGENT_EVENTS.DEPLOYMENT_INITIATED, {
                  source: 'playground',
                });
                setDeployModalOpen(true);
              }}
              deployments={agentDeploymentsEnabled ? sortedDeployments : []}
              onDeploymentSelect={setSelectedDeploymentName}
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
              lsdTracingEnabled={lsdStatus.tracingEnabled}
              onOpenLoad={handleOpenLoad}
              onOpenSave={handleOpenSave}
              onOpenSaveAs={handleOpenSaveAs}
              onClearAgent={handleNewAgentConfiguration}
              isProfileDirty={isProfileDirty}
              onResetToLastSaved={handleResetToLastSaved}
              isDefaultConfigDirty={isActivePaneDirty}
              onInitialModelSelected={handleInitialModelSelected}
              onRevertToDefaults={handleRevertToDefaults}
              mcpServers={availableMcpServers}
              mcpRegistryAvailable={mcpRegistryAvailable}
              mcpServersLoaded={mcpServersLoaded}
              mcpServersLoadError={mcpServersLoadError}
              mcpServerStatuses={mcpServerStatuses}
              checkMcpServerStatus={checkMcpServerStatus}
              onMcpServerTokensChange={setMcpServerTokens}
              onMcpMissingAuthServersChange={handleMcpMissingAuthServersChange}
              deploymentCount={agentDeploymentsEnabled ? sortedDeployments.length : 0}
              onDeploymentClick={() => {
                setSelectedDeploymentName(sortedDeployments[0].name);
              }}
            />
          )
        ) : lsdStatus?.phase === 'Failed' ? (
          <EmptyState
            headingLevel="h4"
            titleText={
              isPlaygroundUpdateInitiated
                ? 'Playground update failed'
                : 'Playground creation failed'
            }
            variant={EmptyStateVariant.lg}
            status="danger"
          />
        ) : (
          <EmptyState
            headingLevel="h4"
            titleText={isPlaygroundUpdateInitiated ? 'Updating playground' : 'Creating playground'}
            icon={Spinner}
          />
        )}
      </ApplicationsPage>
      {configurationModalOpen && (
        <ChatbotConfigurationModal
          onUpdateInitiated={() => setIsPlaygroundUpdateInitiated(true)}
          onClose={() => {
            setConfigurationModalOpen(false);
            refresh();
          }}
          aiModels={aiModels}
          lsdStatus={lsdStatus}
          existingModels={models}
          allCollections={allCollections}
          collectionsLoaded={collectionsLoaded}
          existingCollections={existingCollections}
        />
      )}
      {deleteModalOpen && (
        <DeletePlaygroundModal
          onCancel={() => {
            setDeleteModalOpen(false);
            setIsPlaygroundUpdateInitiated(false);
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
          mcpServers={availableMcpServers}
          mcpConfigMapName={mcpConfigMapName}
          isMcpServerStatusCheckComplete={areMcpServerStatusesResolved}
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
      {agentDeploymentsEnabled &&
        deployModalOpen &&
        loadedProfileId &&
        deploymentSnapshotProfile &&
        namespace?.name && (
          <DeployAgentModal
            profile={deploymentSnapshotProfile}
            namespace={namespace.name}
            isDeploying={isDeploying || isSavingForDeployment}
            missingMCPServerAuth={mcpServersMissingAuth}
            existingDeploymentNames={allDeployments.map(
              (deployment) => deployment.displayName ?? deployment.name,
            )}
            aiModels={aiModels}
            onDeploy={(name) => void handleDeploy(name)}
            onClose={handleCloseDeployModal}
          />
        )}
      {agentDeploymentsEnabled && selectedDeploymentName && loadedProfileSpec && (
        <AgentDeploymentsModal
          agentName={loadedProfileSpec.displayName}
          deployments={sortedDeployments}
          initialDeploymentName={selectedDeploymentName}
          aiModels={aiModels}
          onClose={() => setSelectedDeploymentName(null)}
          onDeleted={() => {
            setSelectedDeploymentName(null);
            void refreshDeployments();
            void refreshAllDeployments();
          }}
        />
      )}
      {hasUnsavedChanges && <SafeNavigationBlocker hasUnsavedChanges={hasUnsavedChanges} />}
    </>
  );
};

export { ChatbotMain };
