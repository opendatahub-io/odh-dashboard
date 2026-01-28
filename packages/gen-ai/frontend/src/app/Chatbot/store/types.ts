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
  guardrailsEnabled: boolean;
  selectedMcpServerIds: string[];
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIGURATION: ChatbotConfiguration = {
  systemInstruction: DEFAULT_SYSTEM_INSTRUCTIONS,
  temperature: 0.1,
  isStreamingEnabled: true,
  selectedModel: '',
  guardrailsEnabled: false,
  selectedMcpServerIds: [],
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
  updateGuardrailsEnabled: (id: string, value: boolean) => void;
  updateSelectedMcpServerIds: (id: string, value: string[]) => void;

  // Configuration management
  resetConfiguration: (initialValues?: Partial<ChatbotConfiguration>) => void;

  // Utility
  getConfiguration: (id: string) => ChatbotConfiguration | undefined;
}

/**
 * Combined store type
 */
export type ChatbotConfigStore = ChatbotConfigStoreState & ChatbotConfigStoreActions;
