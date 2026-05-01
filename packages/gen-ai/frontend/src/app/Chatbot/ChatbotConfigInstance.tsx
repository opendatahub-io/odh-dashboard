import * as React from 'react';
import { MessageBox, ChatbotWelcomePrompt } from '@patternfly/chatbot';
import { GuardrailModelConfig, MCPServerFromAPI, TokenInfo } from '~/app/types';
import { ServerStatusInfo } from '~/app/hooks/useMCPServerStatuses';
import useChatbotMessages, { UseChatbotMessagesReturn } from './hooks/useChatbotMessages';
import {
  useChatbotConfigStore,
  selectSystemInstruction,
  selectTemperature,
  selectStreamingEnabled,
  selectSelectedModel,
  selectSelectedSubscription,
  selectSelectedMcpServerIds,
  selectGuardrail,
  selectGuardrailUserInputEnabled,
  selectGuardrailModelOutputEnabled,
  selectRagEnabled,
  selectKnowledgeMode,
  selectSelectedVectorStoreId,
  selectActivePrompt,
} from './store';
import { ChatbotMessages } from './ChatbotMessagesList';
import { sampleWelcomePrompts } from './const';

interface ChatbotConfigInstanceProps {
  configId: string;
  username?: string;
  currentVectorStoreId: string | null;
  mcpServers: MCPServerFromAPI[];
  mcpServerStatuses: Map<string, ServerStatusInfo>;
  mcpServerTokens: Map<string, TokenInfo>;
  namespace?: string;
  showWelcomePrompt?: boolean;
  welcomeDescription?: string;
  onMessagesHookReady?: (hook: UseChatbotMessagesReturn) => void;
  guardrailModelConfigs?: GuardrailModelConfig[];
  configIndex?: number;
  isCompareMode?: boolean;
}

export const ChatbotConfigInstance: React.FC<ChatbotConfigInstanceProps> = ({
  configId,
  username,
  currentVectorStoreId,
  mcpServers,
  mcpServerStatuses,
  mcpServerTokens,
  namespace,
  showWelcomePrompt = false,
  welcomeDescription = 'Welcome to the playground',
  onMessagesHookReady,
  guardrailModelConfigs = [],
  configIndex,
  isCompareMode,
}) => {
  const systemInstruction = useChatbotConfigStore(selectSystemInstruction(configId));
  const temperature = useChatbotConfigStore(selectTemperature(configId));
  const isStreamingEnabled = useChatbotConfigStore(selectStreamingEnabled(configId));
  const selectedModel = useChatbotConfigStore(selectSelectedModel(configId));
  const selectedSubscription = useChatbotConfigStore(selectSelectedSubscription(configId));
  const selectedMcpServerIds = useChatbotConfigStore(selectSelectedMcpServerIds(configId));
  const isRagEnabled = useChatbotConfigStore(selectRagEnabled(configId));
  const knowledgeMode = useChatbotConfigStore(selectKnowledgeMode(configId));
  const selectedVectorStoreId = useChatbotConfigStore(selectSelectedVectorStoreId(configId));
  const updateSelectedVectorStoreId = useChatbotConfigStore(
    (state) => state.updateSelectedVectorStoreId,
  );

  // Keep selectedVectorStoreId in sync with the active knowledge mode:
  // - inline: always the auto-provisioned store ID
  // - external: cleared to null only when transitioning FROM inline, not on remount
  //   (remount occurs when entering compare mode; we must not clobber the user's existing selection)
  const prevKnowledgeModeRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (knowledgeMode === 'inline') {
      updateSelectedVectorStoreId(configId, currentVectorStoreId);
    } else if (prevKnowledgeModeRef.current === 'inline') {
      // Only clear when the user explicitly switches from inline → external
      updateSelectedVectorStoreId(configId, null);
    }
    prevKnowledgeModeRef.current = knowledgeMode;
  }, [knowledgeMode, currentVectorStoreId, configId, updateSelectedVectorStoreId]);

  // Prompt state from store (for analytics)
  const activePrompt = useChatbotConfigStore(selectActivePrompt(configId));

  // Guardrails configuration from store
  const guardrail = useChatbotConfigStore(selectGuardrail(configId));
  const guardrailUserInputEnabled = useChatbotConfigStore(
    selectGuardrailUserInputEnabled(configId),
  );
  const guardrailModelOutputEnabled = useChatbotConfigStore(
    selectGuardrailModelOutputEnabled(configId),
  );

  // Build guardrails config for the messages hook
  const guardrailsConfig = React.useMemo(
    () => ({
      enabled: Boolean(guardrail),
      guardrail,
      userInputEnabled: guardrailUserInputEnabled,
      modelOutputEnabled: guardrailModelOutputEnabled,
    }),
    [guardrail, guardrailUserInputEnabled, guardrailModelOutputEnabled],
  );

  const getToolSelections = React.useCallback(
    (namespaceName: string, serverUrl: string) =>
      useChatbotConfigStore.getState().getToolSelections(configId, namespaceName, serverUrl),
    [configId],
  );

  const messagesHook = useChatbotMessages({
    configId,
    modelId: selectedModel,
    systemInstruction,
    isRawUploaded: isRagEnabled,
    username,
    isStreamingEnabled,
    temperature,
    currentVectorStoreId: selectedVectorStoreId,
    selectedServerIds: selectedMcpServerIds,
    mcpServers,
    mcpServerStatuses,
    mcpServerTokens,
    toolSelections: getToolSelections,
    namespace,
    guardrailsConfig,
    guardrailModelConfigs,
    subscription: selectedSubscription,
    configIndex,
    isCompareMode,
    isGuardrailEnabled: Boolean(guardrail),
    promptVersion: activePrompt?.version ?? 0,
    promptName: activePrompt?.name ?? '',
  });

  // Expose the messages hook to parent and update when it changes
  React.useEffect(() => {
    if (onMessagesHookReady) {
      onMessagesHookReady(messagesHook);
    }
  }, [messagesHook, onMessagesHookReady]);

  return (
    <MessageBox position="top">
      {showWelcomePrompt && (
        <ChatbotWelcomePrompt
          title={username ? `Hello, ${username}` : 'Hello'}
          description={welcomeDescription}
          data-testid="chatbot-welcome-prompt"
          style={{
            cursor: 'default',
            pointerEvents: 'none',
          }}
          prompts={sampleWelcomePrompts}
        />
      )}
      <ChatbotMessages
        messageList={messagesHook.messages}
        scrollRef={messagesHook.scrollToBottomRef}
        isLoading={messagesHook.isLoading}
        isStreamingWithoutContent={messagesHook.isStreamingWithoutContent}
        modelDisplayName={messagesHook.modelDisplayName}
      />
    </MessageBox>
  );
};
