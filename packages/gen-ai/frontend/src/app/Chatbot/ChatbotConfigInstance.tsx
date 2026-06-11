import * as React from 'react';
import { MessageBox, ChatbotWelcomePrompt, WelcomePrompt } from '@patternfly/chatbot';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { MCPServerFromAPI, TokenInfo } from '~/app/types';
import { ServerStatusInfo } from '~/app/hooks/useMCPServerStatuses';
import useChatbotMessages, { UseChatbotMessagesReturn } from './hooks/useChatbotMessages';
import useEmbeddedChatbotMessages from './hooks/useEmbeddedChatbotMessages';
import { useEmbeddedMessagesConfig } from './context/EmbeddedMessagesContext';
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
  welcomeContent?: React.ReactNode;
  placeholderBotContent?: string;
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
  welcomeContent,
  placeholderBotContent: placeholderBotContentProp,
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

  // Keep selectedVectorStoreId in sync when in inline mode: always point at the
  // auto-provisioned store. Clearing on inline→external switch is handled explicitly
  // in KnowledgeTabContent's radio onChange, so no transition tracking is needed here.
  React.useEffect(() => {
    if (knowledgeMode === 'inline') {
      updateSelectedVectorStoreId(configId, currentVectorStoreId);
    }
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

  const embeddedConfig = useEmbeddedMessagesConfig();

  const standardMessagesHook = useChatbotMessages({
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

  const embeddedMessagesHook = useEmbeddedChatbotMessages({
    bffBasePath: embeddedConfig?.bffBasePath ?? '',
    namespace: embeddedConfig?.namespace ?? '',
    secretName: embeddedConfig?.secretName ?? '',
    responsesTemplate: embeddedConfig?.responsesTemplate ?? {
      model: '',
      stream: true,
      store: false,
      input: [],
      // eslint-disable-next-line camelcase
      metadata: { autorag_run_id: '', rag_pattern_name: '' },
      instructions: '',
      tools: [],
      // eslint-disable-next-line camelcase
      tool_choice: { type: 'auto' },
      include: [],
    },
    username,
  });

  // Use embedded hook when embedded config is present, otherwise standard
  const messagesHook = embeddedConfig ? embeddedMessagesHook : standardMessagesHook;

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
      {showWelcomePrompt &&
        messagesHook.messages.length === 0 &&
        (welcomeContent ?? (
          <ChatbotWelcomePrompt
            title={username ? `Hello, ${username}` : 'Hello'}
            description={welcomeDescription}
            data-testid="chatbot-welcome-prompt"
            prompts={clickablePrompts}
          />
        ))}
      <ChatbotMessages
        messageList={messagesHook.messages}
        scrollRef={messagesHook.scrollToBottomRef}
        isLoading={messagesHook.isLoading}
        modelDisplayName={messagesHook.modelDisplayName}
        placeholderContent={placeholderBotContentProp ?? PLACEHOLDER_BOT_CONTENT}
        hasImagesInConversation={hasImagesInConversation}
      />
    </MessageBox>
  );
};
