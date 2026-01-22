import { DEFAULT_SYSTEM_INSTRUCTIONS } from '~/app/Chatbot/const';

/**
 * Configuration for a single chatbot instance.
 * This represents one "slot" in comparison mode.
 */
export interface ChatbotConfiguration {
  systemInstruction: string;
  temperature: number;
  isStreamingEnabled: boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIGURATION: ChatbotConfiguration = {
  systemInstruction: DEFAULT_SYSTEM_INSTRUCTIONS,
  temperature: 0.1,
  isStreamingEnabled: true,
};

/**
 * Store state interface.
 */
export interface ChatbotConfigStoreState {
  configurations: { [id: string]: ChatbotConfiguration | undefined };
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

  // Utility
  getConfiguration: (id: string) => ChatbotConfiguration | undefined;
}

/**
 * Combined store type
 */
export type ChatbotConfigStore = ChatbotConfigStoreState & ChatbotConfigStoreActions;
