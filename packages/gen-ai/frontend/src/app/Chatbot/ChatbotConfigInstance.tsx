import * as React from 'react';
import { MessageBox, ChatbotWelcomePrompt, WelcomePrompt } from '@patternfly/chatbot';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { MCPServerFromAPI, TokenInfo } from '~/app/types';
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
  selectGuardrailSubscription,
  selectRagEnabled,
  selectKnowledgeMode,
  selectSelectedVectorStoreId,
  selectActivePrompt,
  selectVariableValues,
} from './store';
import { substituteTemplateVariables } from './promptTemplateUtils';
import { ChatbotMessages } from './ChatbotMessagesList';
import { sampleWelcomePrompts, PLACEHOLDER_BOT_CONTENT } from './const';

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
  onWelcomePromptClick?: (message: string) => void;
  onMessagesHookReady?: (hook: UseChatbotMessagesReturn) => void;
  configIndex?: number;
  isCompareMode?: boolean;
  hasImagesInConversation?: boolean;
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
  onWelcomePromptClick,
  onMessagesHookReady,
  configIndex,
  isCompareMode,
  hasImagesInConversation,
}) => {
  const systemInstruction = useChatbotConfigStore(selectSystemInstruction(configId));
  const variableValues = useChatbotConfigStore(selectVariableValues(configId));
  const resolvedInstruction = React.useMemo(
    () => substituteTemplateVariables(systemInstruction, variableValues),
    [systemInstruction, variableValues],
  );
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
  const guardrailSubscription = useChatbotConfigStore(selectGuardrailSubscription(configId));

  // Build guardrails config for the messages hook
  const guardrailsConfig = React.useMemo(
    () => ({
      enabled: Boolean(guardrail),
      guardrail,
      userInputEnabled: guardrailUserInputEnabled,
      modelOutputEnabled: guardrailModelOutputEnabled,
      guardrailSubscription,
    }),
    [guardrail, guardrailUserInputEnabled, guardrailModelOutputEnabled, guardrailSubscription],
  );

  const getToolSelections = React.useCallback(
    (namespaceName: string, serverUrl: string) =>
      useChatbotConfigStore.getState().getToolSelections(configId, namespaceName, serverUrl),
    [configId],
  );

  const messagesHook = useChatbotMessages({
    configId,
    modelId: selectedModel,
    systemInstruction: resolvedInstruction,
    isRagEnabled,
    username,
    isStreamingEnabled,
    temperature,
    currentVectorStoreId: selectedVectorStoreId,
    knowledgeMode,
    selectedServerIds: selectedMcpServerIds,
    mcpServers,
    mcpServerStatuses,
    mcpServerTokens,
    toolSelections: getToolSelections,
    namespace,
    guardrailsConfig,
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

  const clickablePrompts: WelcomePrompt[] = React.useMemo(
    () =>
      onWelcomePromptClick
        ? sampleWelcomePrompts.map((prompt) => ({
            ...prompt,
            onClick: () => {
              if (prompt.message) {
                onWelcomePromptClick(prompt.message);
                fireMiscTrackingEvent('Playground Welcome Prompt Selected', {
                  promptTitle: prompt.title,
                });
              }
            },
          }))
        : sampleWelcomePrompts,
    [onWelcomePromptClick],
  );

  return (
    <MessageBox position="top">
      {showWelcomePrompt && messagesHook.messages.length === 0 && (
        <ChatbotWelcomePrompt
          title={username ? `Hello, ${username}` : 'Hello'}
          description={welcomeDescription}
          data-testid="chatbot-welcome-prompt"
          prompts={clickablePrompts}
        />
      )}
      <ChatbotMessages
        messageList={messagesHook.messages}
        scrollRef={messagesHook.scrollToBottomRef}
        isLoading={messagesHook.isLoading}
        modelDisplayName={messagesHook.modelDisplayName}
        placeholderContent={PLACEHOLDER_BOT_CONTENT}
        hasImagesInConversation={hasImagesInConversation}
      />
    </MessageBox>
  );
};
