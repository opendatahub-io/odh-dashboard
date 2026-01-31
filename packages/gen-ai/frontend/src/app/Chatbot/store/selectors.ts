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

export const selectGuardrailsEnabled =
  (configId: string) =>
  (state: ChatbotConfigStore): boolean =>
    state.configurations[configId]?.guardrailsEnabled ?? DEFAULT_CONFIGURATION.guardrailsEnabled;

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

// Configuration management selectors
export const selectConfigIds = (state: ChatbotConfigStore): string[] => state.configIds;
