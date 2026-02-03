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

export const selectCurrentVectorStoreId =
  (configId: string) =>
  (state: ChatbotConfigStore): string =>
    state.configurations[configId]?.currentVectorStoreId ??
    DEFAULT_CONFIGURATION.currentVectorStoreId;

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

// Configuration management selectors
export const selectConfigIds = (state: ChatbotConfigStore): string[] => state.configIds;
