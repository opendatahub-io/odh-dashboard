import { DEFAULT_SYSTEM_INSTRUCTIONS } from '~/app/Chatbot/const';

/**
 * Configuration for a single chatbot instance.
 * This represents one "slot" in comparison mode.
 */
export interface ChatbotConfiguration {
  // Model parameters
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
 * Uses a plain object for O(1) config lookups and easy serialization.
 */
export interface ChatbotConfigStoreState {
  // Record of config ID -> configuration (may be undefined for invalid IDs)
  configurations: { [id: string]: ChatbotConfiguration | undefined };
}

/**
 * Store actions interface.
 * Separated for clarity and type safety.
 */
export interface ChatbotConfigStoreActions {
  // Configuration CRUD
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
