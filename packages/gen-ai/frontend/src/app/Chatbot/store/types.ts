import { DEFAULT_SYSTEM_INSTRUCTIONS } from '~/app/Chatbot/const';

/**
 * MCP tool selections map structure:
 * {
 *   "namespace-name": {
 *     "http://server-url": ["tool1", "tool2"]
 *   }
 * }
 */
export type McpToolSelectionsMap = Record<string, Record<string, string[]> | undefined>;

/**
 * Configuration for a single chatbot instance.
 * This represents one "slot" in comparison mode.
 */
export interface ChatbotConfiguration {
  systemInstruction: string;
  temperature: number;
  isStreamingEnabled: boolean;
  selectedModel: string;
  selectedMcpServerIds: string[];
  currentVectorStoreId: string;
  mcpToolSelections: McpToolSelectionsMap;
  guardrail: string;
  guardrailUserInputEnabled: boolean;
  guardrailModelOutputEnabled: boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIGURATION: ChatbotConfiguration = {
  systemInstruction: DEFAULT_SYSTEM_INSTRUCTIONS,
  temperature: 0.1,
  isStreamingEnabled: true,
  selectedModel: '',
  selectedMcpServerIds: [],
  currentVectorStoreId: '',
  mcpToolSelections: {},
  // Guardrails defaults - both OFF per UX design
  guardrail: '',
  guardrailUserInputEnabled: false,
  guardrailModelOutputEnabled: false,
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
  // Configuration lifecycle
  removeConfiguration: (id: string) => void;
  duplicateConfiguration: (id: string) => string | undefined;

  // Field-specific updaters (for granular rerenders)
  updateSystemInstruction: (id: string, value: string) => void;
  updateTemperature: (id: string, value: number) => void;
  updateStreamingEnabled: (id: string, value: boolean) => void;
  updateSelectedModel: (id: string, value: string) => void;
  updateSelectedMcpServerIds: (id: string, value: string[]) => void;
  updateCurrentVectorStoreId: (id: string, value: string) => void;

  // MCP tool selections (per-config state)
  getToolSelections: (id: string, namespace: string, serverUrl: string) => string[] | undefined;
  saveToolSelections: (
    id: string,
    namespace: string,
    serverUrl: string,
    toolNames: string[] | undefined,
  ) => void;
  updateGuardrail: (id: string, value: string) => void;
  updateGuardrailUserInputEnabled: (id: string, value: boolean) => void;
  updateGuardrailModelOutputEnabled: (id: string, value: boolean) => void;

  // Configuration management
  resetConfiguration: (initialValues?: Partial<ChatbotConfiguration>) => void;

  // Utility
  getConfiguration: (id: string) => ChatbotConfiguration | undefined;
}

/**
 * Combined store type
 */
export type ChatbotConfigStore = ChatbotConfigStoreState & ChatbotConfigStoreActions;
