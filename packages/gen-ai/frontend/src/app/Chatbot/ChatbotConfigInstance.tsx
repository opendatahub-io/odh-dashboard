import * as React from 'react';
import { MessageBox, ChatbotWelcomePrompt } from '@patternfly/chatbot';
import {
  ChatbotSourceSettings,
  GuardrailModelConfig,
  MCPServerFromAPI,
  TokenInfo,
} from '~/app/types';
import { ServerStatusInfo } from '~/app/hooks/useMCPServerStatuses';
import useChatbotMessages, { UseChatbotMessagesReturn } from './hooks/useChatbotMessages';
import {
  useChatbotConfigStore,
  selectSystemInstruction,
  selectTemperature,
  selectStreamingEnabled,
  selectSelectedModel,
  selectSelectedMcpServerIds,
  selectGuardrail,
  selectGuardrailUserInputEnabled,
  selectGuardrailModelOutputEnabled,
} from './store';
import { ChatbotMessages } from './ChatbotMessagesList';
import { sampleWelcomePrompts } from './const';

interface ChatbotConfigInstanceProps {
  configId: string;
  username?: string;
  selectedSourceSettings: ChatbotSourceSettings | null;
  isRawUploaded: boolean;
  currentVectorStoreId: string | null;
  mcpServers: MCPServerFromAPI[];
  mcpServerStatuses: Map<string, ServerStatusInfo>;
  mcpServerTokens: Map<string, TokenInfo>;
  namespace?: string;
  showWelcomePrompt?: boolean;
  onMessagesHookReady?: (hook: UseChatbotMessagesReturn) => void;
  guardrailModelConfigs?: GuardrailModelConfig[];
}

export const ChatbotConfigInstance: React.FC<ChatbotConfigInstanceProps> = ({
  configId,
  username,
  selectedSourceSettings,
  isRawUploaded,
  currentVectorStoreId,
  mcpServers,
  mcpServerStatuses,
  mcpServerTokens,
  namespace,
  showWelcomePrompt = false,
  onMessagesHookReady,
  guardrailModelConfigs = [],
}) => {
  const systemInstruction = useChatbotConfigStore(selectSystemInstruction(configId));
  const temperature = useChatbotConfigStore(selectTemperature(configId));
  const isStreamingEnabled = useChatbotConfigStore(selectStreamingEnabled(configId));
  const selectedModel = useChatbotConfigStore(selectSelectedModel(configId));
  const selectedMcpServerIds = useChatbotConfigStore(selectSelectedMcpServerIds(configId));

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
    modelId: selectedModel,
    selectedSourceSettings,
    systemInstruction,
    isRawUploaded,
    username,
    isStreamingEnabled,
    temperature,
    currentVectorStoreId,
    selectedServerIds: selectedMcpServerIds,
    mcpServers,
    mcpServerStatuses,
    mcpServerTokens,
    toolSelections: getToolSelections,
    namespace,
    guardrailsConfig,
    guardrailModelConfigs,
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
          description="Welcome to the playground"
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
      />
    </MessageBox>
  );
};
