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
import { useLocation } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import DashboardModalFooter from '@odh-dashboard/internal/concepts/dashboard/DashboardModalFooter';
import { useUserContext } from '~/app/context/UserContext';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { GenAiContext } from '~/app/context/GenAiContext';
import useFetchBFFConfig from '~/app/hooks/useFetchBFFConfig';
import { uploadMediaFile } from '~/app/services/llamaStackService';
import { useAudioTranscription } from '~/app/Chatbot/hooks/useAudioTranscription';
import { isLlamaModelEnabled, URL_PREFIX } from '~/app/utilities';
import { getId } from '~/app/utilities/utils';
import { TokenInfo, ResponseMetrics } from '~/app/types';
import useFetchMCPServers from '~/app/hooks/useFetchMCPServers';
import useAgentProfileUrlParam from '~/app/agentProfile/useAgentProfileUrlParam';
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
import ChatbotMessageInput, {
  ImageUploadState,
  PendingDocChip,
} from './components/ChatbotMessageInput';
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
}) => {
  const { username } = useUserContext();
  const { namespace } = React.useContext(GenAiContext);
  const isEmbedded = useIsEmbeddedPlayground();
  const { models, modelsLoaded, aiModels, maasModels, lastInput, setLastInput } =
    React.useContext(ChatbotContext);

  const { data: bffConfig } = useFetchBFFConfig();
  const isDarkMode = useDarkMode();

  // Store state
  const configIds = useChatbotConfigStore(selectConfigIds);
  const isCompareMode = configIds.length > 1;
  const primaryConfigId = configIds[0] || DEFAULT_CONFIG_ID;
  const primarySelectedModel = useChatbotConfigStore(selectSelectedModel(primaryConfigId));
  const primarySelectedAsrModel = useChatbotConfigStore(selectSelectedAsrModel(primaryConfigId));
  const primaryIsAsrEnabled = useChatbotConfigStore(selectIsAsrModelEnabled(primaryConfigId));

  const isAudioUploadDisabled = !primaryIsAsrEnabled || !primarySelectedAsrModel;

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

  // Load AgentProfile from URL query param (?agentProfileId=<uuid>)
  useAgentProfileUrlParam({ mcpServers, mcpServersLoaded });

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
  const [pendingDocChips, setPendingDocChips] = React.useState<PendingDocChip[]>([]);
  const [showReplaceMediaModal, setShowReplaceMediaModal] = React.useState(false);
  const pendingReplaceFileRef = React.useRef<File | null>(null);
  const visionXhrRef = React.useRef<XMLHttpRequest | null>(null);
  const uploadGenRef = React.useRef(0);
  const previewUrlRef = React.useRef<string | null>(null);
  previewUrlRef.current = imageUploadState.previewUrl;

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
  const hasReadyDocs = pendingDocChips.some((c) => c.status === 'uploaded');
  const hasReadyAttachments = hasReadyImage || hasReadyDocs;

  const handleSendMessage = React.useCallback(
    (message: string) => {
      let effectiveMessage = message;
      if (!message.trim() && hasReadyAttachments) {
        if (hasReadyImage && hasReadyDocs) {
          effectiveMessage = 'Describe the image and summarize the attached documents';
        } else if (hasReadyImage) {
          effectiveMessage = 'Describe the image';
        } else {
          effectiveMessage = 'Summarize the attached documents';
        }
      }

      const compareID = isCompareMode ? getId() : '';
      const fileId = imageUploadState.fileId || undefined;
      const imagePreview =
        imageUploadState.previewUrl && imageUploadState.fileName
          ? { previewUrl: imageUploadState.previewUrl, fileName: imageUploadState.fileName }
          : undefined;

      const docAttachments = pendingDocChips
        .filter((c) => c.status === 'uploaded')
        .map((c) => c.fileName);

      messageHooksRef.current.forEach((hook) =>
        hook.handleMessageSend(
          effectiveMessage,
          compareID,
          fileId,
          imagePreview,
          docAttachments.length > 0 ? docAttachments : undefined,
        ),
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

      setPendingDocChips([]);
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
      pendingDocChips,
      hasReadyAttachments,
      hasReadyImage,
      hasReadyDocs,
    ],
  );

  const handleStopStreaming = React.useCallback(() => {
    messageHooksRef.current.forEach((hook) => hook.handleStopStreaming());
  }, []);

  React.useEffect(() => {
    setPendingDocChips((prev) => {
      const updated = prev.map((chip) => {
        const match = sourceManagement.filesWithSettings.find((f) => f.file.name === chip.fileName);
        if (!match) {
          return chip;
        }
        if (match.status === 'uploaded' && chip.status !== 'uploaded') {
          return { ...chip, status: 'uploaded' as const };
        }
        if (match.status === 'failed' && chip.status !== 'failed') {
          return { ...chip, status: 'failed' as const };
        }
        return chip;
      });
      // Remove chips whose files were removed from filesWithSettings (e.g. modal cancelled)
      const filtered = updated.filter(
        (chip) =>
          chip.status === 'uploaded' ||
          chip.status === 'failed' ||
          sourceManagement.filesWithSettings.some((f) => f.file.name === chip.fileName),
      );
      const hasChanges =
        filtered.length !== prev.length || filtered.some((chip, i) => chip !== prev[i]);
      return hasChanges ? filtered : prev;
    });
  }, [sourceManagement.filesWithSettings]);

  const handleAttach = React.useCallback(
    <T extends File>(acceptedFiles: T[], _fileRejections: unknown, event: DropEvent) => {
      const newChips: PendingDocChip[] = acceptedFiles.map((file) => ({
        id: crypto.randomUUID(),
        fileName: file.name,
        status: 'uploading' as const,
      }));
      setPendingDocChips((prev) => [...prev, ...newChips]);

      sourceManagement.handleSourceDrop(event, acceptedFiles).catch((error) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        alertManagement.onShowErrorAlert(
          `Failed to process files: ${errorMessage}`,
          'File Upload Error',
        );
        const failedNames = new Set(acceptedFiles.map((f) => f.name));
        setPendingDocChips((prev) => prev.filter((c) => !failedNames.has(c.fileName)));
      });
    },
    [sourceManagement, alertManagement],
  );

  const handleRemoveDocChip = React.useCallback(
    (chipId: string) => {
      const chip = pendingDocChips.find((c) => c.id === chipId);
      if (!chip) {
        return;
      }

      if (chip.status === 'uploaded') {
        const matchedFile = fileManagement.files.find((f) => f.filename === chip.fileName);
        if (matchedFile) {
          Promise.resolve(fileManagement.deleteFileById(matchedFile.id)).catch(() => {
            // Best-effort deletion — chip is already removed from UI
          });
        }
      }
      sourceManagement.removeUploadedSource(chip.fileName);

      setPendingDocChips((prev) => prev.filter((c) => c.id !== chipId));
    },
    [pendingDocChips, fileManagement, sourceManagement],
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
      if (imageUploadState.fileName && !hasImageInConversation) {
        pendingReplaceFileRef.current = file;
        setShowReplaceMediaModal(true);
        return;
      }
      performImageUpload(file);
    },
    [imageUploadState.fileName, hasImageInConversation, performImageUpload],
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
    [hasAudioInCurrentMessage, primarySelectedAsrModel, namespace?.name, audioTranscription],
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
    const preSelectMcp = openSettingsToTab !== 'mcp' ? mcpServersFromRoute : [];
    useChatbotConfigStore.getState().resetConfiguration({
      selectedMcpServerIds: preSelectMcp,
    });
    return () => {
      useChatbotConfigStore.getState().resetConfiguration();
    };
  }, [mcpServersFromRoute, selectedAAModel, openSettingsToTab]);

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
        setPendingDocChips([]);
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
            setPendingDocChips([]);
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
      <Drawer isExpanded={isDrawerExpanded && !isEmbedded} isInline position="left">
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
                  pendingDocChips.some((c) => c.status === 'uploading') ||
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
                isImageUploadDisabled={hasImageInConversation}
                isAudioUploadDisabled={isAudioUploadDisabled}
                audioDisabledTooltip={
                  isAudioUploadDisabled
                    ? 'Select a transcription model in settings to enable audio upload'
                    : undefined
                }
                onAudioUpload={handleAudioUpload}
                audioTranscriptionState={audioTranscription.state}
                onAudioCancel={handleAudioCancel}
                pendingDocChips={pendingDocChips}
                onRemoveDocChip={handleRemoveDocChip}
                alwaysShowSendButton={hasReadyAttachments}
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
