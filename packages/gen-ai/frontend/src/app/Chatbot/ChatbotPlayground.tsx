import * as React from 'react';
import {
  Button,
  Divider,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  DropEvent,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@patternfly/react-core';
import { Chatbot, ChatbotContent, ChatbotDisplayMode } from '@patternfly/chatbot';
// Imported here (not just App.tsx) so the CSS is bundled when loaded via Module Federation
import '@patternfly/chatbot/dist/css/main.css';
import { useLocation, useSearchParams } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import DashboardModalFooter from '@odh-dashboard/internal/concepts/dashboard/DashboardModalFooter';
import { useUserContext } from '~/app/context/UserContext';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { GenAiContext } from '~/app/context/GenAiContext';
import useFetchBFFConfig from '~/app/hooks/useFetchBFFConfig';
import { uploadMediaFile } from '~/app/services/llamaStackService';
import { useAudioTranscription } from '~/app/Chatbot/hooks/useAudioTranscription';
import { isLlamaModelEnabled, URL_PREFIX } from '~/app/utilities';
import {
  convertMaaSModelToAIModel,
  getId,
  isMaasLlamaModelId,
  isPlaygroundModelMatchForAIModel,
  isVisionModel,
} from '~/app/utilities/utils';
import useWorkspaceCapabilities from '~/app/hooks/useWorkspaceCapabilities';
import { TokenInfo, ResponseMetrics } from '~/app/types';
import useFetchMCPServers from '~/app/hooks/useFetchMCPServers';

import OpenAgentProfileModal, {
  OPEN_AGENT_MODAL_DISMISSED_KEY,
} from '~/app/agentProfile/OpenAgentProfileModal';
import useMCPServerStatuses from '~/app/hooks/useMCPServerStatuses';
import { ChatbotSourceSettingsModal } from './sourceUpload/ChatbotSourceSettingsModal';
import useSourceManagement from './hooks/useSourceManagement';
import useAlertManagement from './hooks/useAlertManagement';
import { UseChatbotMessagesReturn } from './hooks/useChatbotMessages';
import { ChatbotConfigInstance } from './ChatbotConfigInstance';
import useFileManagement from './hooks/useFileManagement';
import useDarkMode from './hooks/useDarkMode';
import { ChatbotSettingsPanel } from './components/ChatbotSettingsPanel';
import ChatbotPaneHeader from './components/ChatbotPaneHeader';
import ChatbotMessageInput, { ImageUploadState } from './components/ChatbotMessageInput';
import SourceUploadErrorAlert from './components/alerts/SourceUploadErrorAlert';
import SourceUploadSuccessAlert from './components/alerts/SourceUploadSuccessAlert';
import SourceDeleteSuccessAlert from './components/alerts/SourceDeleteSuccessAlert';
import ViewCodeModal from './components/ViewCodeModal';
import ChatModal from './components/ChatModal';
import ChatbotPane from './ChatbotPane';
import CloseChatCompareModal from './components/CloseChatCompareModal';
import {
  useChatbotConfigStore,
  selectSelectedModel,
  selectSelectedAsrModel,
  selectIsAsrModelEnabled,
  selectConfigIds,
  selectIsPreview,
  DEFAULT_CONFIG_ID,
  getConfigDisplayLabel,
} from './store';
import { useIsEmbeddedPlayground } from './context/EmbeddedMessagesContext';

/**
 * Wrapper for compare mode panes that subscribes to Zustand store for reactive model updates.
 */
interface ComparePaneWrapperProps {
  configId: string;
  displayLabel: string;
  onModelChange: (model: string) => void;
  onClose: () => void;
  children: React.ReactNode;
  /** Metrics from the last response (latency, tokens, TTFT) */
  metrics?: ResponseMetrics | null;
  /** Whether a response is currently being generated */
  isLoading?: boolean;
  isSettingsOpen?: boolean;
  isActiveConfig?: boolean;
}

const ComparePaneWrapper: React.FC<ComparePaneWrapperProps> = ({
  configId,
  displayLabel,
  onModelChange,
  onClose,
  children,
  metrics,
  isLoading,
  isSettingsOpen,
  isActiveConfig,
}) => {
  const selectedModel = useChatbotConfigStore(selectSelectedModel(configId));
  const isPreview = useChatbotConfigStore(selectIsPreview(configId));

  return (
    <ChatbotPane
      configId={configId}
      displayLabel={displayLabel}
      selectedModel={selectedModel}
      onModelChange={onModelChange}
      onClose={onClose}
      metrics={metrics}
      isLoading={isLoading}
      isSettingsOpen={isSettingsOpen}
      isActiveConfig={isActiveConfig}
      isDisabled={isPreview}
    >
      {children}
    </ChatbotPane>
  );
};

type ChatbotPlaygroundProps = {
  isViewCodeModalOpen: boolean;
  setIsViewCodeModalOpen: (isOpen: boolean) => void;
  isNewChatModalOpen: boolean;
  setIsNewChatModalOpen: (isOpen: boolean) => void;
  activePaneConfigId?: string;
  setActivePaneConfigId?: (configId: string) => void;
  onClosePane?: (configId: string) => void;
  clearAllMessagesRef?: React.MutableRefObject<(() => void) | null>;
  hasConversationMessagesRef?: React.MutableRefObject<(() => boolean) | null>;
  isDrawerExpanded?: boolean;
  setIsDrawerExpanded?: (expanded: boolean) => void;
  welcomeContent?: React.ReactNode;
  placeholderBotContent?: string;
  onOpenLoad?: () => void;
  onOpenSave?: () => void;
  onOpenSaveAs?: () => void;
};

const ChatbotPlayground: React.FC<ChatbotPlaygroundProps> = ({
  isViewCodeModalOpen,
  setIsViewCodeModalOpen,
  isNewChatModalOpen,
  setIsNewChatModalOpen,
  activePaneConfigId = DEFAULT_CONFIG_ID,
  setActivePaneConfigId,
  onClosePane,
  clearAllMessagesRef,
  hasConversationMessagesRef,
  isDrawerExpanded: isDrawerExpandedProp,
  setIsDrawerExpanded: setIsDrawerExpandedProp,
  welcomeContent,
  placeholderBotContent,
  onOpenLoad,
  onOpenSave,
  onOpenSaveAs,
}) => {
  const { username } = useUserContext();
  const { namespace } = React.useContext(GenAiContext);
  const isEmbedded = useIsEmbeddedPlayground();
  const {
    models,
    modelsLoaded,
    aiModels,
    aiModelsLoaded,
    aiModelsError,
    maasModels,
    maasModelsLoaded,
    lastInput,
    setLastInput,
  } = React.useContext(ChatbotContext);

  const { data: bffConfig } = useFetchBFFConfig();
  const isDarkMode = useDarkMode();

  // Store state
  const configIds = useChatbotConfigStore(selectConfigIds);
  const isCompareMode = configIds.length > 1;
  const primaryConfigId = configIds[0] || DEFAULT_CONFIG_ID;
  const primarySelectedModel = useChatbotConfigStore(selectSelectedModel(primaryConfigId));
  const primarySelectedAsrModel = useChatbotConfigStore(selectSelectedAsrModel(primaryConfigId));
  const primaryIsAsrEnabled = useChatbotConfigStore(selectIsAsrModelEnabled(primaryConfigId));
  const primaryIsPreview = useChatbotConfigStore(selectIsPreview(primaryConfigId));

  // Workspace capabilities — controls visibility & disable state of multimodal uploads
  const { hasVisionModel, hasASRModel, capabilitiesReady, capabilitiesError } =
    useWorkspaceCapabilities(aiModels, aiModelsLoaded, maasModelsLoaded, aiModelsError);

  const isAudioUploadDisabled =
    !capabilitiesReady || capabilitiesError || !primaryIsAsrEnabled || !primarySelectedAsrModel;

  const convertedMaasModels = React.useMemo(
    () => maasModels.map(convertMaaSModelToAIModel),
    [maasModels],
  );

  const selectedModelObj = React.useMemo(() => {
    if (!primarySelectedModel) {
      return undefined;
    }
    const llamaModel = models.find((m) => m.id === primarySelectedModel);
    if (!llamaModel) {
      return undefined;
    }
    const allAIModels = [...aiModels, ...convertedMaasModels];
    return allAIModels.find((ai) => isPlaygroundModelMatchForAIModel(llamaModel, ai));
  }, [primarySelectedModel, models, aiModels, convertedMaasModels]);

  const selectedModelHasVision = isVisionModel(selectedModelObj ?? {});
  const isMaasSelected = selectedModelObj
    ? selectedModelObj.model_source_type === 'maas'
    : primarySelectedModel
      ? isMaasLlamaModelId(primarySelectedModel)
      : false;
  const isEmptyCapsMaaS = isMaasSelected && (selectedModelObj?.capabilities?.length ?? 0) === 0;

  const showImageUpload = capabilitiesReady ? hasVisionModel && !isEmptyCapsMaaS : true;
  const showAudioUpload = capabilitiesReady ? hasASRModel && !isEmptyCapsMaaS : true;

  // Router state
  const location = useLocation();
  const selectedAAModel = location.state?.model;
  const mcpServersFromRoute = React.useMemo(() => {
    const servers = location.state?.mcpServers;
    return Array.isArray(servers) ? servers : [];
  }, [location.state?.mcpServers]);
  const mcpServerStatusesFromRoute = React.useMemo(() => {
    const statuses = location.state?.mcpServerStatuses;
    return statuses ? new Map(Object.entries(statuses)) : new Map();
  }, [location.state?.mcpServerStatuses]);

  // MCP hooks
  const {
    data: mcpServers = [],
    loaded: mcpServersLoaded,
    error: mcpServersLoadError,
  } = useFetchMCPServers();
  const { serverStatuses: mcpServerStatuses, checkServerStatus: checkMcpServerStatus } =
    useMCPServerStatuses(mcpServers, mcpServersLoaded);
  const [mcpServerTokens, setMcpServerTokens] = React.useState<Map<string, TokenInfo>>(new Map());

  // UI state — can be controlled externally (e.g. from header Settings button)
  const [isDrawerExpandedInternal, setIsDrawerExpandedInternal] = React.useState(true);
  const [pendingCloseConfigId, setPendingCloseConfigId] = React.useState<string | null>(null);
  const isDrawerExpanded = isDrawerExpandedProp ?? isDrawerExpandedInternal;
  const setIsDrawerExpanded = setIsDrawerExpandedProp ?? setIsDrawerExpandedInternal;

  // Custom hooks
  const alertManagement = useAlertManagement();
  const fileManagement = useFileManagement({
    onShowDeleteSuccessAlert: alertManagement.onShowDeleteSuccessAlert,
    onShowErrorAlert: alertManagement.onShowErrorAlert,
  });
  const sourceManagement = useSourceManagement({
    onShowSuccessAlert: alertManagement.onShowUploadSuccessAlert,
    onShowErrorAlert: alertManagement.onShowErrorAlert,
    onFileUploadComplete: fileManagement.refreshFiles,
    uploadedFiles: fileManagement.files,
    isFilesLoading: fileManagement.isLoading,
  });

  // AgentProfile URL param is handled in ChatbotMain (so the ApplicationsPage spinner covers the fetch)

  // Open-agent modal — shown once after a profile is loaded from the URL param
  const [searchParams] = useSearchParams();
  const agentProfileIdParam = searchParams.get('agentProfileId');
  const profileApplied = useChatbotConfigStore((s) => s.profileApplied);
  const loadedProfileId = useChatbotConfigStore((s) => s.loadedProfileId);
  const loadedProfileDisplayName = useChatbotConfigStore((s) => s.loadedProfileDisplayName);
  const loadedProfileWarnings = useChatbotConfigStore((s) => s.loadedProfileWarnings);
  const [showOpenAgentModal, setShowOpenAgentModal] = React.useState(false);
  const modalShownForProfileRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (
      !profileApplied ||
      !loadedProfileId ||
      loadedProfileId !== agentProfileIdParam ||
      modalShownForProfileRef.current === loadedProfileId
    ) {
      return;
    }
    const hasWarnings = !!loadedProfileWarnings?.length;
    let isDismissed = false;
    if (!hasWarnings) {
      try {
        isDismissed = !!localStorage.getItem(OPEN_AGENT_MODAL_DISMISSED_KEY);
      } catch {
        // SecurityError in private browsing — treat as not dismissed
      }
    }
    if (!isDismissed) {
      modalShownForProfileRef.current = loadedProfileId;
      setShowOpenAgentModal(true);
    }
  }, [profileApplied, loadedProfileId, agentProfileIdParam, loadedProfileWarnings]);

  const handleOpenAgentPreview = React.useCallback(() => {
    useChatbotConfigStore.getState().updatePreviewMode(DEFAULT_CONFIG_ID, true);
    setShowOpenAgentModal(false);
  }, []);

  const handleOpenAgentEdit = React.useCallback(() => {
    useChatbotConfigStore.getState().updatePreviewMode(DEFAULT_CONFIG_ID, false);
    setShowOpenAgentModal(false);
  }, []);

  const handleOpenAgentCancel = React.useCallback(() => {
    // Cancel navigates away — just close without setting a mode
    setShowOpenAgentModal(false);
  }, []);

  // Message hooks tracking
  const messageHooksRef = React.useRef<Map<string, UseChatbotMessagesReturn>>(new Map());
  const [loadingStates, setLoadingStates] = React.useState<Map<string, boolean>>(new Map());
  const [disabledStates, setDisabledStates] = React.useState<Map<string, boolean>>(new Map());
  const [metricsStates, setMetricsStates] = React.useState<Map<string, ResponseMetrics | null>>(
    new Map(),
  );

  // Vision image upload state
  const [imageUploadState, setImageUploadState] = React.useState<ImageUploadState>({
    uploading: false,
    progress: 0,
    fileId: null,
    previewUrl: null,
    fileName: null,
  });
  const [hasImageInConversation, setHasImageInConversation] = React.useState(false);
  const [showReplaceMediaModal, setShowReplaceMediaModal] = React.useState(false);
  const pendingReplaceFileRef = React.useRef<File | null>(null);
  const visionXhrRef = React.useRef<XMLHttpRequest | null>(null);
  const uploadGenRef = React.useRef(0);
  const previewUrlRef = React.useRef<string | null>(null);
  previewUrlRef.current = imageUploadState.previewUrl;

  // Capability-based image upload gating
  const isImageUploadDisabled =
    !capabilitiesReady || capabilitiesError || hasImageInConversation || !selectedModelHasVision;

  const imageDisabledTooltip = React.useMemo(() => {
    if (!capabilitiesReady) {
      return undefined;
    }
    if (!selectedModelHasVision && hasVisionModel) {
      return 'Switch to a vision-capable model to upload images.';
    }
    if (hasImageInConversation) {
      return 'Only one image per conversation.';
    }
    return undefined;
  }, [capabilitiesReady, selectedModelHasVision, hasVisionModel, hasImageInConversation]);

  // Audio transcription state
  const audioTranscription = useAudioTranscription();
  const [hasAudioInCurrentMessage, setHasAudioInCurrentMessage] = React.useState(false);
  const audioUploadLatchRef = React.useRef(false);
  const [showAudioPerMessageModal, setShowAudioPerMessageModal] = React.useState(false);
  const [messageBarValue, setMessageBarValue] = React.useState<string>('');

  // Revoke unsent image preview blob URL on unmount
  React.useEffect(
    () => () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    },
    [],
  );

  // Callbacks
  const setSelectedModel = React.useCallback(
    (model: string) => {
      useChatbotConfigStore.getState().updateSelectedModel(primaryConfigId, model);
    },
    [primaryConfigId],
  );

  const handleMessagesHookReady = React.useCallback(
    (configIdParam: string, hook: UseChatbotMessagesReturn) => {
      messageHooksRef.current.set(configIdParam, hook);
      setLoadingStates((prev) => {
        if (prev.get(configIdParam) === hook.isLoading) {
          return prev;
        }
        const next = new Map(prev);
        next.set(configIdParam, hook.isLoading);
        return next;
      });
      setDisabledStates((prev) => {
        if (prev.get(configIdParam) === hook.isMessageSendButtonDisabled) {
          return prev;
        }
        const next = new Map(prev);
        next.set(configIdParam, hook.isMessageSendButtonDisabled);
        return next;
      });
      // Track metrics for pane header display
      setMetricsStates((prev) => {
        if (prev.get(configIdParam) === hook.lastResponseMetrics) {
          return prev;
        }
        const next = new Map(prev);
        next.set(configIdParam, hook.lastResponseMetrics);
        return next;
      });
    },
    [],
  );

  const getHookReadyCallback = React.useCallback(
    (configId: string) => (hook: UseChatbotMessagesReturn) =>
      handleMessagesHookReady(configId, hook),
    [handleMessagesHookReady],
  );

  const handleModelChange = React.useCallback(
    (configId: string) => (model: string) => {
      useChatbotConfigStore.getState().updateSelectedModel(configId, model);
    },
    [],
  );

  const hasReadyImage = !!imageUploadState.fileId && !imageUploadState.uploading;

  const handleSendMessage = React.useCallback(
    (message: string) => {
      let effectiveMessage = message;
      if (!message.trim() && hasReadyImage) {
        effectiveMessage = 'Describe the image';
      }

      const compareID = isCompareMode ? getId() : '';
      const fileId = imageUploadState.fileId || undefined;
      const imagePreview =
        imageUploadState.previewUrl && imageUploadState.fileName
          ? { previewUrl: imageUploadState.previewUrl, fileName: imageUploadState.fileName }
          : undefined;

      messageHooksRef.current.forEach((hook) =>
        hook.handleMessageSend(effectiveMessage, compareID, fileId, imagePreview),
      );
      setLastInput(effectiveMessage);

      if (fileId) {
        setHasImageInConversation(true);
        setImageUploadState({
          uploading: false,
          progress: 0,
          fileId: null,
          previewUrl: null,
          fileName: null,
        });
      }

      audioUploadLatchRef.current = false;
      setHasAudioInCurrentMessage(false);
      setMessageBarValue('');
    },
    [
      setLastInput,
      isCompareMode,
      imageUploadState.fileId,
      imageUploadState.previewUrl,
      imageUploadState.fileName,
      hasReadyImage,
    ],
  );

  const handleStopStreaming = React.useCallback(() => {
    messageHooksRef.current.forEach((hook) => hook.handleStopStreaming());
  }, []);

  const handleAttach = React.useCallback(
    <T extends File>(acceptedFiles: T[], _fileRejections: unknown, event: DropEvent) => {
      sourceManagement.handleSourceDrop(event, acceptedFiles).catch((error) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        alertManagement.onShowErrorAlert(
          `Failed to process files: ${errorMessage}`,
          'File Upload Error',
        );
      });
    },
    [sourceManagement, alertManagement],
  );

  const performImageUpload = React.useCallback(
    (file: File) => {
      uploadGenRef.current += 1;
      const gen = uploadGenRef.current;

      const previewUrl = URL.createObjectURL(file);
      const ext = file.name.lastIndexOf('.');
      const normalizedName =
        ext !== -1 ? file.name.slice(0, ext) + file.name.slice(ext).toLowerCase() : file.name;
      setImageUploadState({
        uploading: true,
        progress: 0,
        fileId: null,
        previewUrl,
        fileName: normalizedName,
      });

      const url = `${URL_PREFIX}/api/v1/lsd/files/media?namespace=${encodeURIComponent(namespace?.name || '')}`;
      const { promise, xhr } = uploadMediaFile(url, file, 'vision', (percent) => {
        setImageUploadState((prev) => ({ ...prev, progress: percent }));
      });
      visionXhrRef.current = xhr;

      promise
        .then((response) => {
          if (uploadGenRef.current !== gen) {
            return;
          }
          setImageUploadState((prev) => ({
            ...prev,
            uploading: false,
            fileId: response.data.id,
          }));
          const { configIds: allConfigIds, configurations } = useChatbotConfigStore.getState();
          allConfigIds.forEach((cId) => {
            if (configurations[cId]) {
              useChatbotConfigStore.getState().updateHasVisionImage(cId, true);
            }
          });
        })
        .catch((error) => {
          if (uploadGenRef.current !== gen) {
            return;
          }
          URL.revokeObjectURL(previewUrl);
          setImageUploadState({
            uploading: false,
            progress: 0,
            fileId: null,
            previewUrl: null,
            fileName: null,
          });
          if (error instanceof Error && error.message !== 'Upload aborted') {
            alertManagement.onShowErrorAlert(
              `${file.name} failed to upload. Please try again.`,
              'Image Upload Error',
            );
          }
        })
        .finally(() => {
          if (uploadGenRef.current === gen) {
            visionXhrRef.current = null;
          }
        });
    },
    [namespace?.name, alertManagement],
  );

  const handleImageUpload = React.useCallback(
    (file: File) => {
      if (!capabilitiesReady || !selectedModelHasVision) {
        return;
      }
      if (imageUploadState.fileName && !hasImageInConversation) {
        pendingReplaceFileRef.current = file;
        setShowReplaceMediaModal(true);
        return;
      }
      performImageUpload(file);
    },
    [
      capabilitiesReady,
      selectedModelHasVision,
      imageUploadState.fileName,
      hasImageInConversation,
      performImageUpload,
    ],
  );

  const handleReplaceMediaConfirm = React.useCallback(() => {
    if (imageUploadState.uploading) {
      visionXhrRef.current?.abort();
    }
    if (imageUploadState.previewUrl) {
      URL.revokeObjectURL(imageUploadState.previewUrl);
    }
    setShowReplaceMediaModal(false);
    const file = pendingReplaceFileRef.current;
    pendingReplaceFileRef.current = null;
    if (file) {
      performImageUpload(file);
    }
  }, [imageUploadState.uploading, imageUploadState.previewUrl, performImageUpload]);

  const handleReplaceMediaCancel = React.useCallback(() => {
    setShowReplaceMediaModal(false);
    pendingReplaceFileRef.current = null;
  }, []);

  const handleRemoveImage = React.useCallback(() => {
    if (imageUploadState.uploading) {
      visionXhrRef.current?.abort();
    }
    if (imageUploadState.previewUrl) {
      URL.revokeObjectURL(imageUploadState.previewUrl);
    }
    setImageUploadState({
      uploading: false,
      progress: 0,
      fileId: null,
      previewUrl: null,
      fileName: null,
    });
    if (!hasImageInConversation) {
      const { configIds: ids, configurations: configs } = useChatbotConfigStore.getState();
      ids.forEach((cId) => {
        if (configs[cId]) {
          useChatbotConfigStore.getState().updateHasVisionImage(cId, false);
        }
      });
    }
  }, [imageUploadState.uploading, imageUploadState.previewUrl, hasImageInConversation]);

  // Audio upload handler
  const handleAudioUpload = React.useCallback(
    (file: File) => {
      if (!capabilitiesReady || !showAudioUpload) {
        return;
      }
      if (hasAudioInCurrentMessage || audioUploadLatchRef.current) {
        setShowAudioPerMessageModal(true);
        return;
      }
      if (!primarySelectedAsrModel) {
        return;
      }
      audioUploadLatchRef.current = true;
      setHasAudioInCurrentMessage(true);
      audioTranscription.startUpload(file, primarySelectedAsrModel, namespace?.name || '');
    },
    [
      capabilitiesReady,
      showAudioUpload,
      hasAudioInCurrentMessage,
      primarySelectedAsrModel,
      namespace?.name,
      audioTranscription,
    ],
  );

  const handleAudioCancel = React.useCallback(() => {
    audioTranscription.abort();
    audioUploadLatchRef.current = false;
    setHasAudioInCurrentMessage(false);
  }, [audioTranscription]);

  // Append transcribed text to message bar on completion
  const { phase, transcribedText } = audioTranscription.state;
  React.useEffect(() => {
    if (phase === 'complete' && transcribedText) {
      setMessageBarValue((prev) => {
        const trimmed = prev.trim();
        if (trimmed) {
          return `${trimmed}\n${transcribedText}`;
        }
        return transcribedText;
      });
      audioUploadLatchRef.current = false;
      audioTranscription.reset();
    }
  }, [phase, transcribedText, audioTranscription]);

  // Reset audio state on error
  React.useEffect(() => {
    if (audioTranscription.state.phase === 'error') {
      audioUploadLatchRef.current = false;
      setHasAudioInCurrentMessage(false);
    }
  }, [audioTranscription.state.phase]);

  // Allow re-upload when user clears transcribed text from input
  React.useEffect(() => {
    if (
      hasAudioInCurrentMessage &&
      !messageBarValue.trim() &&
      audioTranscription.state.phase === 'idle'
    ) {
      setHasAudioInCurrentMessage(false);
    }
  }, [messageBarValue, hasAudioInCurrentMessage, audioTranscription.state.phase]);

  const openSettingsToTab = location.state?.openSettingsToTab;

  // Effects
  React.useEffect(() => {
    // When loading an agent profile the profile itself is the configuration source of truth —
    // skip location.state pre-population so it doesn't overwrite the just-applied profile.
    if (agentProfileIdParam) {
      return;
    }
    useChatbotConfigStore.getState().resetConfiguration({
      selectedMcpServerIds: mcpServersFromRoute,
    });
  }, [agentProfileIdParam, mcpServersFromRoute, selectedAAModel]);

  React.useEffect(() => {
    const shouldClear = Boolean(
      location.state?.mcpServers ||
        location.state?.model ||
        location.state?.mcpServerStatuses ||
        location.state?.openSettingsToTab,
    );
    if (shouldClear) {
      const timeoutId = setTimeout(() => window.history.replaceState({}, ''), 100);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [location.state]);

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
  ]);

  // Cleanup stale message hooks
  React.useEffect(() => {
    const staleKeys = Array.from(messageHooksRef.current.keys()).filter(
      (key) => !configIds.includes(key),
    );
    if (staleKeys.length > 0) {
      staleKeys.forEach((key) => messageHooksRef.current.delete(key));
      setLoadingStates((prev) => {
        const next = new Map(prev);
        staleKeys.forEach((key) => next.delete(key));
        return next;
      });
      setDisabledStates((prev) => {
        const next = new Map(prev);
        staleKeys.forEach((key) => next.delete(key));
        return next;
      });

      // Remove from metrics states
      setMetricsStates((prev) => {
        const next = new Map(prev);
        staleKeys.forEach((key) => {
          next.delete(key);
        });
        return next;
      });
    }
  }, [configIds]);

  // Expose clearAllMessages to parent
  React.useEffect(() => {
    const ref = clearAllMessagesRef;
    if (ref) {
      ref.current = () => {
        messageHooksRef.current.forEach((hook) => hook.clearConversation());
        setHasImageInConversation(false);
        handleRemoveImage();
        audioTranscription.abort();
        const { configIds: allCIds, configurations: allConfigs } = useChatbotConfigStore.getState();
        allCIds.forEach((cId) => {
          if (allConfigs[cId]) {
            useChatbotConfigStore.getState().updateHasVisionImage(cId, false);
          }
        });
        audioUploadLatchRef.current = false;
        setHasAudioInCurrentMessage(false);
        setMessageBarValue('');
      };
    }
    return () => {
      if (ref) {
        ref.current = null;
      }
    };
  }, [clearAllMessagesRef, handleRemoveImage, audioTranscription]);

  // Expose hasConversationMessages to parent (beyond the initial welcome message)
  React.useEffect(() => {
    const ref = hasConversationMessagesRef;
    if (ref) {
      ref.current = () =>
        Array.from(messageHooksRef.current.values()).some((hook) => hook.messages.length > 1);
    }
    return () => {
      if (ref) {
        ref.current = null;
      }
    };
  }, [hasConversationMessagesRef]);

  // Alerts
  const alerts = {
    uploadSuccessAlert: (
      <SourceUploadSuccessAlert
        isVisible={alertManagement.showUploadSuccessAlert}
        alertKey={alertManagement.uploadAlertKey}
        onClose={alertManagement.onHideUploadSuccessAlert}
      />
    ),
    deleteSuccessAlert: (
      <SourceDeleteSuccessAlert
        isVisible={alertManagement.showDeleteSuccessAlert}
        alertKey={alertManagement.deleteAlertKey}
        onClose={alertManagement.onHideDeleteSuccessAlert}
      />
    ),
    errorAlert: (
      <SourceUploadErrorAlert
        isVisible={alertManagement.showErrorAlert}
        alertKey={alertManagement.errorAlertKey}
        onClose={alertManagement.onHideErrorAlert}
        errorMessage={alertManagement.errorMessage}
        title={alertManagement.errorTitle}
      />
    ),
  };

  // Render chatbot content for a config
  const renderChatbotContent = (configId: string, index: number) => (
    <Chatbot
      displayMode={ChatbotDisplayMode.embedded}
      data-testid={isCompareMode ? `chatbot-${configId}` : 'chatbot'}
    >
      <ChatbotContent
        style={{
          backgroundColor: isDarkMode
            ? 'var(--pf-t--global--dark--background--color--100)'
            : 'var(--pf-t--global--background--color--100)',
        }}
      >
        <ChatbotConfigInstance
          key={`${configId}-chatbot-instance`}
          configId={configId}
          username={username}
          currentVectorStoreId={fileManagement.currentVectorStoreId}
          mcpServers={mcpServers}
          mcpServerStatuses={mcpServerStatuses}
          mcpServerTokens={mcpServerTokens}
          namespace={namespace?.name}
          showWelcomePrompt
          welcomeContent={welcomeContent}
          placeholderBotContent={placeholderBotContent}
          welcomeDescription={isCompareMode ? 'Send a message to compare models' : undefined}
          onWelcomePromptClick={handleSendMessage}
          onMessagesHookReady={getHookReadyCallback(configId)}
          configIndex={isCompareMode ? index + 1 : 0}
          isCompareMode={isCompareMode}
          hasImagesInConversation={hasImageInConversation}
        />
      </ChatbotContent>
    </Chatbot>
  );

  return (
    <>
      {/* Modals */}
      <ChatbotSourceSettingsModal
        isOpen={sourceManagement.isSourceSettingsOpen}
        onToggle={sourceManagement.handleModalClose}
        onSubmitSettings={sourceManagement.handleSourceSettingsSubmit}
        pendingFiles={sourceManagement.pendingFiles}
        isUploading={sourceManagement.isUploading}
        uploadProgress={sourceManagement.uploadProgress}
      />
      {!isEmbedded && (
        <ViewCodeModal
          isOpen={isViewCodeModalOpen}
          onToggle={() => setIsViewCodeModalOpen(!isViewCodeModalOpen)}
          input={lastInput}
          files={fileManagement.files}
          mcpServers={mcpServers}
          mcpServerTokens={mcpServerTokens}
          namespace={namespace?.name}
        />
      )}
      {!isEmbedded && (
        <ChatModal
          isOpen={isNewChatModalOpen}
          onClose={() => setIsNewChatModalOpen(false)}
          onConfirm={() => {
            messageHooksRef.current.forEach((hook) => hook.clearConversation());
            setHasImageInConversation(false);
            handleRemoveImage();
            audioTranscription.abort();
            setHasAudioInCurrentMessage(false);
            const { configIds: cIds, configurations: cfgs } = useChatbotConfigStore.getState();
            cIds.forEach((cId) => {
              if (cfgs[cId]) {
                useChatbotConfigStore.getState().updateHasVisionImage(cId, false);
              }
            });
            setMessageBarValue('');
            if (isCompareMode) {
              fireMiscTrackingEvent('Playground Compare Chat Cleared', { success: true });
            }
            setIsNewChatModalOpen(false);
          }}
        />
      )}

      {/* Main layout */}
      <Drawer isExpanded={isDrawerExpanded && !isEmbedded} isInline position="right">
        <Divider />
        <DrawerContent
          panelContent={
            !isEmbedded ? (
              <ChatbotSettingsPanel
                configId={activePaneConfigId}
                alerts={alerts}
                sourceManagement={sourceManagement}
                fileManagement={fileManagement}
                initialServerStatuses={mcpServerStatusesFromRoute}
                mcpServers={mcpServers}
                mcpServersLoaded={mcpServersLoaded}
                mcpServersLoadError={mcpServersLoadError}
                mcpServerTokens={mcpServerTokens}
                onMcpServerTokensChange={setMcpServerTokens}
                checkMcpServerStatus={checkMcpServerStatus}
                onCloseClick={() => setIsDrawerExpanded(false)}
                onActiveConfigChange={setActivePaneConfigId}
                defaultActiveTabKey={openSettingsToTab === 'mcp' ? 3 : undefined}
                onLoad={onOpenLoad}
                onSave={onOpenSave}
                onSaveAs={onOpenSaveAs}
              />
            ) : undefined
          }
        >
          <DrawerContentBody style={{ padding: 0, height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Single mode header */}
              {!isCompareMode && !isEmbedded && (
                <ChatbotPaneHeader
                  selectedModel={primarySelectedModel || ''}
                  onModelChange={setSelectedModel}
                  metrics={metricsStates.get(primaryConfigId)}
                  isLoading={loadingStates.get(primaryConfigId)}
                  hasDivider
                  isDarkMode={isDarkMode}
                  isDisabled={primaryIsPreview}
                  agentName={profileApplied ? (loadedProfileDisplayName ?? undefined) : undefined}
                  isPreviewMode={primaryIsPreview}
                  onExitPreview={primaryIsPreview ? handleOpenAgentEdit : undefined}
                  hasValidationWarnings={!!loadedProfileWarnings?.length}
                />
              )}

              {/* Chat panes */}
              <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {configIds.map((configId, index) => (
                  <React.Fragment key={configId}>
                    {isCompareMode && index > 0 && (
                      <Divider orientation={{ default: 'vertical' }} />
                    )}
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                      }}
                    >
                      {isCompareMode ? (
                        <ComparePaneWrapper
                          configId={configId}
                          displayLabel={getConfigDisplayLabel(index)}
                          onModelChange={handleModelChange(configId)}
                          onClose={() => setPendingCloseConfigId(configId)}
                          metrics={metricsStates.get(configId)}
                          isLoading={loadingStates.get(configId)}
                          isSettingsOpen={isDrawerExpanded}
                          isActiveConfig={isDrawerExpanded && configId === activePaneConfigId}
                        >
                          {renderChatbotContent(configId, index)}
                        </ComparePaneWrapper>
                      ) : (
                        renderChatbotContent(configId, index)
                      )}
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {/* Message input */}
              <ChatbotMessageInput
                onSendMessage={handleSendMessage}
                onStopStreaming={handleStopStreaming}
                isLoading={Array.from(loadingStates.values()).some(Boolean)}
                isSendDisabled={
                  !modelsLoaded ||
                  !primarySelectedModel ||
                  Array.from(disabledStates.values()).some(Boolean) ||
                  imageUploadState.uploading ||
                  audioTranscription.state.phase === 'uploading' ||
                  audioTranscription.state.phase === 'transcribing' ||
                  audioTranscription.state.phase === 'complete'
                }
                showAttachButton={!isCompareMode && !isEmbedded}
                onDocumentAttach={handleAttach}
                isDarkMode={isDarkMode}
                onImageUpload={handleImageUpload}
                imageUploadState={imageUploadState}
                onRemoveImage={handleRemoveImage}
                isImageUploadDisabled={isImageUploadDisabled}
                imageDisabledTooltip={imageDisabledTooltip}
                showImageUpload={showImageUpload}
                showAudioUpload={showAudioUpload}
                isAudioUploadDisabled={isAudioUploadDisabled}
                audioDisabledTooltip={
                  isAudioUploadDisabled
                    ? 'Select a transcription model in settings to enable audio upload'
                    : undefined
                }
                onAudioUpload={handleAudioUpload}
                audioTranscriptionState={audioTranscription.state}
                onAudioCancel={handleAudioCancel}
                alwaysShowSendButton={hasReadyImage}
                messageBarValue={messageBarValue}
                onMessageBarValueChange={setMessageBarValue}
              />
            </div>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>

      {pendingCloseConfigId && (
        <CloseChatCompareModal
          chatLabel={getConfigDisplayLabel(configIds.indexOf(pendingCloseConfigId))}
          onConfirm={() => {
            onClosePane?.(pendingCloseConfigId);
            setPendingCloseConfigId(null);
          }}
          onCancel={() => setPendingCloseConfigId(null)}
        />
      )}

      {showReplaceMediaModal && (
        <Modal
          isOpen
          onClose={handleReplaceMediaCancel}
          variant="small"
          data-testid="replace-media-modal"
        >
          <ModalHeader title="Replace media file?" />
          <ModalBody>
            <p>
              This conversation already has a media file attached. Only one image, audio, or video
              file is supported per conversation.
            </p>
            <p style={{ marginTop: 'var(--pf-t--global--spacer--md)' }}>
              The new file will replace the existing media attachment. Text file attachments are not
              affected.
            </p>
          </ModalBody>
          <ModalFooter>
            <DashboardModalFooter
              submitLabel="Replace"
              onSubmit={handleReplaceMediaConfirm}
              onCancel={handleReplaceMediaCancel}
            />
          </ModalFooter>
        </Modal>
      )}

      {showOpenAgentModal && (
        <OpenAgentProfileModal
          displayName={loadedProfileDisplayName ?? 'Agent'}
          validationWarnings={loadedProfileWarnings ?? undefined}
          onPreview={handleOpenAgentPreview}
          onEdit={handleOpenAgentEdit}
          onCancel={handleOpenAgentCancel}
        />
      )}

      {showAudioPerMessageModal && (
        <Modal
          isOpen
          onClose={() => setShowAudioPerMessageModal(false)}
          variant="small"
          data-testid="audio-per-message-modal"
        >
          <ModalHeader title="Audio already attached" />
          <ModalBody>
            Only one audio file can be transcribed per message. Send the current message or clear
            the transcription to attach another audio file.
          </ModalBody>
          <ModalFooter>
            <Button
              variant="primary"
              onClick={() => setShowAudioPerMessageModal(false)}
              data-testid="audio-per-message-modal-ok"
            >
              OK
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
};

export default ChatbotPlayground;
