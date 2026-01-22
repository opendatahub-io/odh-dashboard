import { ChatbotConfigStore, DEFAULT_CONFIGURATION } from './types';

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
