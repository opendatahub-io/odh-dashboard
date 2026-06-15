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
  variableValues: Record<string, string>;
  /** The model_id of the selected ASR (audio transcription) model, or '' if none */
  selectedAsrModel: string;
  /** Whether the user has opted in to the transcription model section */
  isAsrModelEnabled: boolean;
  /** Whether a vision image has been attached/sent in this conversation */
  hasVisionImage: boolean;
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
  variableValues: {},
  selectedAsrModel: '',
  isAsrModelEnabled: false,
  hasVisionImage: false,
};

/**
 * Store state interface.
 */
export interface ChatbotConfigStoreState {
  configurations: { [id: string]: ChatbotConfiguration | undefined };
  configIds: string[];
  /**
   * True when the current configuration was loaded from an AgentProfile.
   * Set by applyAgentProfile(), cleared by resetConfiguration().
   * Use this to drive loaded-profile UI state (e.g. header indicators, save/discard flows).
   */
  profileApplied: boolean;
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

  // ASR model selection (per-pane)
  updateSelectedAsrModel: (id: string, value: string) => void;
  updateAsrModelEnabled: (id: string, value: boolean) => void;

  // Vision image state
  updateHasVisionImage: (id: string, value: boolean) => void;

  // RAG toggle (per-pane)
  updateRagEnabled: (id: string, value: boolean) => void;
  updateKnowledgeMode: (id: string, value: 'inline' | 'external') => void;
  updateSelectedVectorStoreId: (id: string, value: string | null) => void;

  updateActivePrompt: (id: string, prompt: MLflowPromptVersion | null) => void;
  updateDirtyPrompt: (id: string, prompt: MLflowPromptVersion | null) => void;
  resetDirtyPrompt: (id: string) => void;
  clearPromptState: (id: string, newDirtyPrompt: MLflowPromptVersion | null) => void;
  updateVariableValues: (id: string, values: Record<string, string>) => void;

  // Configuration management
  resetConfiguration: (initialValues?: Partial<ChatbotConfiguration>) => void;
  /**
   * Apply an AgentProfile to the store. Behaves like resetConfiguration but sets
   * profileApplied: true so the knowledge-mode sync effect in ChatbotConfigInstance
   * knows not to clear an external vector store ID that came from the profile.
   */
  applyAgentProfile: (config: Partial<ChatbotConfiguration>) => void;

  // Utility
  getConfiguration: (id: string) => ChatbotConfiguration | undefined;
  getPromptSourceType: (id: string) => string;
}

/**
 * Combined store type
 */
export type ChatbotConfigStore = ChatbotConfigStoreState & ChatbotConfigStoreActions;
