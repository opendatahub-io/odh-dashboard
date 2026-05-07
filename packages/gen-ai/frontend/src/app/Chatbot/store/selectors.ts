import { MLflowPromptVersion } from '~/app/types';
import { ChatbotConfigStore, DEFAULT_CONFIGURATION, McpToolSelectionsMap } from './types';

// Field-specific selectors
// Each selector takes a configId parameter
export const selectSystemInstruction =
  (configId: string) =>
  (state: ChatbotConfigStore): string =>
    state.configurations[configId]?.systemInstruction ?? '';

export const selectTemperature =
  (configId: string) =>
  (state: ChatbotConfigStore): number =>
    state.configurations[configId]?.temperature ?? DEFAULT_CONFIGURATION.temperature;

export const selectStreamingEnabled =
  (configId: string) =>
  (state: ChatbotConfigStore): boolean =>
    state.configurations[configId]?.isStreamingEnabled ?? DEFAULT_CONFIGURATION.isStreamingEnabled;

export const selectSelectedModel =
  (configId: string) =>
  (state: ChatbotConfigStore): string =>
    state.configurations[configId]?.selectedModel ?? DEFAULT_CONFIGURATION.selectedModel;

export const selectSelectedSubscription =
  (configId: string) =>
  (state: ChatbotConfigStore): string =>
    state.configurations[configId]?.selectedSubscription ??
    DEFAULT_CONFIGURATION.selectedSubscription;

export const selectSelectedMcpServerIds =
  (configId: string) =>
  (state: ChatbotConfigStore): string[] =>
    state.configurations[configId]?.selectedMcpServerIds ??
    DEFAULT_CONFIGURATION.selectedMcpServerIds;

// MCP tool selections selectors
export const selectMcpToolSelections =
  (configId: string) =>
  (state: ChatbotConfigStore): McpToolSelectionsMap =>
    state.configurations[configId]?.mcpToolSelections ?? {};

export const selectGuardrail =
  (configId: string) =>
  (state: ChatbotConfigStore): string =>
    state.configurations[configId]?.guardrail ?? DEFAULT_CONFIGURATION.guardrail;

export const selectGuardrailUserInputEnabled =
  (configId: string) =>
  (state: ChatbotConfigStore): boolean =>
    state.configurations[configId]?.guardrailUserInputEnabled ??
    DEFAULT_CONFIGURATION.guardrailUserInputEnabled;

export const selectGuardrailModelOutputEnabled =
  (configId: string) =>
  (state: ChatbotConfigStore): boolean =>
    state.configurations[configId]?.guardrailModelOutputEnabled ??
    DEFAULT_CONFIGURATION.guardrailModelOutputEnabled;

export const selectGuardrailSubscription =
  (configId: string) =>
  (state: ChatbotConfigStore): string =>
    state.configurations[configId]?.guardrailSubscription ??
    DEFAULT_CONFIGURATION.guardrailSubscription;

export const selectRagEnabled =
  (configId: string) =>
  (state: ChatbotConfigStore): boolean =>
    state.configurations[configId]?.isRagEnabled ?? DEFAULT_CONFIGURATION.isRagEnabled;

export const selectKnowledgeMode =
  (configId: string) =>
  (state: ChatbotConfigStore): 'inline' | 'external' =>
    state.configurations[configId]?.knowledgeMode ?? DEFAULT_CONFIGURATION.knowledgeMode;

export const selectSelectedVectorStoreId =
  (configId: string) =>
  (state: ChatbotConfigStore): string | null =>
    state.configurations[configId]?.selectedVectorStoreId ??
    DEFAULT_CONFIGURATION.selectedVectorStoreId;

// Prompt management selectors
export const selectActivePrompt =
  (configId: string) =>
  (state: ChatbotConfigStore): MLflowPromptVersion | null =>
    state.configurations[configId]?.activePrompt ?? null;

export const selectDirtyPrompt =
  (configId: string) =>
  (state: ChatbotConfigStore): MLflowPromptVersion | null =>
    state.configurations[configId]?.dirtyPrompt ?? null;

// Configuration management selectors
export const selectConfigIds = (state: ChatbotConfigStore): string[] => state.configIds;
