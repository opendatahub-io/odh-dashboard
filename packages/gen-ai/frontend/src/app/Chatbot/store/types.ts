import { DEFAULT_SYSTEM_INSTRUCTIONS } from '~/app/Chatbot/const';

/**
 * Configuration for a single chatbot instance.
 * This represents one "slot" in comparison mode.
 */
export interface ChatbotConfiguration {
  systemInstruction: string;
  temperature: number;
  isStreamingEnabled: boolean;
  selectedModel: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIGURATION: ChatbotConfiguration = {
  systemInstruction: DEFAULT_SYSTEM_INSTRUCTIONS,
  temperature: 0.1,
  isStreamingEnabled: true,
  selectedModel: '',
};

/**
 * Store state interface.
 */
export interface ChatbotConfigStoreState {
  configurations: { [id: string]: ChatbotConfiguration | undefined };
  configIds: string[];
}

/**
 * Store actions interface.
 */
export interface ChatbotConfigStoreActions {
  // TODO: ADD/DUPLICATE/REMOVE configs

  // Field-specific updaters (for granular rerenders)
  updateSystemInstruction: (id: string, value: string) => void;
  updateTemperature: (id: string, value: number) => void;
  updateStreamingEnabled: (id: string, value: boolean) => void;
  updateSelectedModel: (id: string, value: string) => void;

  // Configuration management
  resetConfiguration: () => void;

  // Utility
  getConfiguration: (id: string) => ChatbotConfiguration | undefined;
}

/**
 * Combined store type
 */
export type ChatbotConfigStore = ChatbotConfigStoreState & ChatbotConfigStoreActions;
