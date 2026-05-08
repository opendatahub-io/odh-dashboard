import { DEFAULT_SYSTEM_INSTRUCTIONS } from '~/app/Chatbot/const';
import { MLflowPromptVersion } from '~/app/types';

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
  mcpToolSelections: McpToolSelectionsMap;
  guardrail: string;
  guardrailUserInputEnabled: boolean;
  guardrailModelOutputEnabled: boolean;
  guardrailSubscription: string;
  /** Whether RAG (Retrieval Augmented Generation) is enabled for this pane */
  isRagEnabled: boolean;
  /** Which knowledge source mode is active: inline file upload or an external vector store */
  knowledgeMode: 'inline' | 'external';
  /** The vector store ID selected for RAG in this pane */
  selectedVectorStoreId: string | null;
  selectedSubscription: string;
  activePrompt: MLflowPromptVersion | null;
  dirtyPrompt: MLflowPromptVersion | null;
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
  mcpToolSelections: {},
  // Guardrails defaults - both OFF per UX design
  guardrail: '',
  guardrailUserInputEnabled: false,
  guardrailModelOutputEnabled: false,
  guardrailSubscription: '',
  // RAG default - OFF
  isRagEnabled: false,
  knowledgeMode: 'inline',
  selectedVectorStoreId: null,
  selectedSubscription: '',
  activePrompt: null,
  dirtyPrompt: null,
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
  /**
   * Duplicate a configuration to create Model 2 (enter compare mode).
   * @param configIdToClone - The configId to clone
   * @returns The new configId if successful, undefined otherwise
   */
  duplicateConfiguration: (configIdToClone: string) => string | undefined;

  // Field-specific updaters (for granular rerenders)
  updateSystemInstruction: (id: string, value: string) => void;
  updateTemperature: (id: string, value: number) => void;
  updateStreamingEnabled: (id: string, value: boolean) => void;
  updateSelectedModel: (id: string, value: string) => void;
  updateSelectedMcpServerIds: (id: string, value: string[]) => void;

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
  updateGuardrailSubscription: (id: string, value: string) => void;

  updateSelectedSubscription: (id: string, value: string) => void;

  // RAG toggle (per-pane)
  updateRagEnabled: (id: string, value: boolean) => void;
  updateKnowledgeMode: (id: string, value: 'inline' | 'external') => void;
  updateSelectedVectorStoreId: (id: string, value: string | null) => void;

  updateActivePrompt: (id: string, prompt: MLflowPromptVersion | null) => void;
  updateDirtyPrompt: (id: string, prompt: MLflowPromptVersion | null) => void;
  resetDirtyPrompt: (id: string) => void;
  clearPromptState: (id: string, newDirtyPrompt: MLflowPromptVersion | null) => void;

  // Configuration management
  resetConfiguration: (initialValues?: Partial<ChatbotConfiguration>) => void;

  // Utility
  getConfiguration: (id: string) => ChatbotConfiguration | undefined;
  getPromptSourceType: (id: string) => string;
}

/**
 * Combined store type
 */
export type ChatbotConfigStore = ChatbotConfigStoreState & ChatbotConfigStoreActions;
