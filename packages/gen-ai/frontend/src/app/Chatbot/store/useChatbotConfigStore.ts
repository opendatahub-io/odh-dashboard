import React from 'react';
import { create, StoreApi, useStore } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { MLflowPromptVersion } from '~/app/types';
import { DEFAULT_SYSTEM_INSTRUCTIONS } from '~/app/Chatbot/const';
import { deepCopyPrompt } from './utils';
import {
  ChatbotConfigStore,
  ChatbotConfigStoreState,
  ChatbotConfiguration,
  DEFAULT_CONFIGURATION,
  McpToolSelectionsMap,
} from './types';

const MCP_TOOL_SELECTIONS_KEY = 'mcp-tool-selections';

/**
 * Storage structure in sessionStorage (namespace → configId → serverUrl):
 * {
 *   "namespace-1": {
 *     "default": {
 *       "http://server-url": ["tool1", "tool2"]
 *     },
 *     "config-2": {
 *       "http://server-url": ["tool3"]
 *     }
 *   }
 * }
 */
type McpToolSelectionsStorage = Record<
  string,
  Record<string, Record<string, string[]> | undefined> | undefined
>;

/**
 * Load all MCP tool selections from sessionStorage
 */
const loadAllMcpToolSelectionsFromStorage = (): McpToolSelectionsStorage => {
  try {
    const stored = sessionStorage.getItem(MCP_TOOL_SELECTIONS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

/**
 * Load MCP tool selections for a specific config from sessionStorage
 * Transforms from storage structure (namespace → configId → serverUrl)
 * to config structure (namespace → serverUrl)
 */
const loadMcpToolSelectionsForConfig = (configId: string): McpToolSelectionsMap => {
  const storage = loadAllMcpToolSelectionsFromStorage();
  const result: McpToolSelectionsMap = {};

  // Transform from namespace → configId → serverUrl to namespace → serverUrl
  Object.entries(storage).forEach(([namespace, configMap]) => {
    if (configMap?.[configId]) {
      result[namespace] = configMap[configId];
    }
  });

  return result;
};

/**
 * Save MCP tool selections for a specific config to sessionStorage
 * Transforms from config structure (namespace → serverUrl)
 * to storage structure (namespace → configId → serverUrl)
 */
const saveMcpToolSelectionsForConfig = (
  configId: string,
  selections: McpToolSelectionsMap,
): void => {
  try {
    const storage = loadAllMcpToolSelectionsFromStorage();

    // Transform from namespace → serverUrl to namespace → configId → serverUrl
    Object.entries(selections).forEach(([namespace, serverMap]) => {
      if (!storage[namespace]) {
        storage[namespace] = {};
      }
      storage[namespace]![configId] = serverMap;
    });

    // Clean up empty namespaces for this config
    Object.keys(storage).forEach((namespace) => {
      if (storage[namespace] && !selections[namespace]) {
        delete storage[namespace]![configId];
        // Remove namespace entirely if no configs left
        if (Object.keys(storage[namespace]!).length === 0) {
          delete storage[namespace];
        }
      }
    });

    sessionStorage.setItem(MCP_TOOL_SELECTIONS_KEY, JSON.stringify(storage));
  } catch {
    // Silently fail if sessionStorage is unavailable
  }
};

/**
 * Remove MCP tool selections for a specific config from sessionStorage
 */
const removeMcpToolSelectionsForConfig = (configId: string): void => {
  try {
    const storage = loadAllMcpToolSelectionsFromStorage();

    // Remove this config from all namespaces
    Object.keys(storage).forEach((namespace) => {
      if (storage[namespace]?.[configId]) {
        delete storage[namespace]![configId];
        // Remove namespace entirely if no configs left
        if (Object.keys(storage[namespace]!).length === 0) {
          delete storage[namespace];
        }
      }
    });

    sessionStorage.setItem(MCP_TOOL_SELECTIONS_KEY, JSON.stringify(storage));
  } catch {
    // Silently fail if sessionStorage is unavailable
  }
};

type CreateChatbotConfigStoreOptions = {
  /** When true, skip sessionStorage persistence for MCP tool selections */
  skipSessionStorage?: boolean;
  /** Override the initial configuration values */
  initialConfig?: Partial<ChatbotConfiguration>;
};

/**
 * Factory function to create a new ChatbotConfigStore instance.
 * Used by EmbeddableChatbotPlayground to create scoped stores
 * that don't share state with the singleton.
 */
export const createChatbotConfigStore = (
  options: CreateChatbotConfigStoreOptions = {},
): StoreApi<ChatbotConfigStore> => {
  const { skipSessionStorage = false, initialConfig } = options;

  const storeInitialState = {
    configurations: {
      default: {
        ...DEFAULT_CONFIGURATION,
        ...initialConfig,
        mcpToolSelections: skipSessionStorage ? {} : loadMcpToolSelectionsForConfig('default'),
      },
    },
    configIds: ['default'],
    profileApplied: false,
  };

  return create<ChatbotConfigStore>()(
    devtools(
      immer((set, get) => createStoreActions(set, get, storeInitialState, skipSessionStorage)),
      { name: 'ChatbotConfigStore' },
    ),
  );
};

/**
 * Context for providing a scoped ChatbotConfigStore instance.
 * When present, useChatbotConfigStore reads from this instead of the singleton.
 */
export const ChatbotConfigStoreContext = React.createContext<StoreApi<ChatbotConfigStore> | null>(
  null,
);

// Zustand immer `set` with devtools action name parameter.
// Using overloads to match the exact signature zustand provides.
type ImmerSet = {
  (
    fn: Partial<ChatbotConfigStore> | ChatbotConfigStore | ((state: ChatbotConfigStore) => void),
    shouldReplace?: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    action?: any,
  ): void;
  (
    fn: ChatbotConfigStore | ((state: ChatbotConfigStore) => void),
    shouldReplace: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    action?: any,
  ): void;
};

const createStoreActions = (
  set: ImmerSet,
  get: () => ChatbotConfigStore,
  storeInitialState: ChatbotConfigStoreState,
  skipSessionStorage: boolean,
): ChatbotConfigStore => ({
  ...storeInitialState,

  // Configuration lifecycle
  removeConfiguration: (id: string) => {
    // Don't allow removing the last configuration or non-existent configurations
    const state = get();
    if (state.configIds.length <= 1 || !state.configurations[id]) {
      return;
    }

    // Build new configurations object without the removed id
    const newConfigurations: { [key: string]: ChatbotConfiguration | undefined } = {};
    Object.keys(state.configurations).forEach((key) => {
      if (key !== id) {
        newConfigurations[key] = state.configurations[key];
      }
    });

    // Build new configIds array without the removed id
    const newConfigIds = state.configIds.filter((configId) => configId !== id);

    set(
      {
        configurations: newConfigurations,
        configIds: newConfigIds,
      },
      false,
      'removeConfiguration',
    );

    // Clean up MCP tool selections from sessionStorage
    if (!skipSessionStorage) {
      removeMcpToolSelectionsForConfig(id);
    }
  },

  duplicateConfiguration: (id: string) => {
    const state = get();
    const sourceConfig = state.configurations[id];

    // Don't allow more than 2 configurations or duplicating non-existent configurations
    if (!sourceConfig || state.configIds.length >= 2) {
      return;
    }

    // Generate a unique ID based on timestamp
    const newId = `config-${Date.now()}`;

    // Create a deep copy of the configuration (including nested mcpToolSelections and arrays)
    const mcpToolSelectionsCopy: McpToolSelectionsMap = {};
    Object.entries(sourceConfig.mcpToolSelections).forEach(([namespace, serverMap]) => {
      if (serverMap) {
        // Deep copy the server map, including the tool arrays
        const serverMapCopy: Record<string, string[]> = {};
        Object.entries(serverMap).forEach(([serverUrl, toolNames]) => {
          serverMapCopy[serverUrl] = [...toolNames]; // Copy the array
        });
        mcpToolSelectionsCopy[namespace] = serverMapCopy;
      }
    });

    const newConfig: ChatbotConfiguration = {
      systemInstruction: sourceConfig.systemInstruction,
      temperature: sourceConfig.temperature,
      isStreamingEnabled: sourceConfig.isStreamingEnabled,
      selectedModel: sourceConfig.selectedModel,
      selectedMcpServerIds: [...sourceConfig.selectedMcpServerIds], // Deep copy array
      mcpToolSelections: mcpToolSelectionsCopy,
      guardrail: sourceConfig.guardrail,
      guardrailUserInputEnabled: sourceConfig.guardrailUserInputEnabled,
      guardrailModelOutputEnabled: sourceConfig.guardrailModelOutputEnabled,
      guardrailSubscription: sourceConfig.guardrailSubscription,
      isRagEnabled: sourceConfig.isRagEnabled,
      knowledgeMode: sourceConfig.knowledgeMode,
      selectedVectorStoreId: sourceConfig.selectedVectorStoreId,
      selectedSubscription: sourceConfig.selectedSubscription,
      activePrompt: deepCopyPrompt(sourceConfig.activePrompt),
      dirtyPrompt: deepCopyPrompt(sourceConfig.dirtyPrompt),
      variableValues: { ...sourceConfig.variableValues },
      selectedAsrModel: sourceConfig.selectedAsrModel,
      isAsrModelEnabled: sourceConfig.isAsrModelEnabled,
      hasVisionImage: sourceConfig.hasVisionImage,
    };

    set(
      {
        configurations: {
          ...state.configurations,
          [newId]: newConfig,
        },
        configIds: [...state.configIds, newId],
      },
      false,
      'duplicateConfiguration',
    );

    // Duplicate MCP tool selections in sessionStorage
    if (!skipSessionStorage) {
      saveMcpToolSelectionsForConfig(newId, newConfig.mcpToolSelections);
    }

    return newId;
  },

  // Field-specific updaters
  updateSystemInstruction: (id: string, value: string) => {
    set(
      (state) => {
        const config = state.configurations[id];
        if (config) {
          config.systemInstruction = value;
        }
      },
      false,
      'updateSystemInstruction',
    );
  },

  updateTemperature: (id: string, value: number) => {
    set(
      (state) => {
        const config = state.configurations[id];
        if (config) {
          config.temperature = value;
        }
      },
      false,
      'updateTemperature',
    );
  },

  updateStreamingEnabled: (id: string, value: boolean) => {
    set(
      (state) => {
        const config = state.configurations[id];
        if (config) {
          config.isStreamingEnabled = value;
        }
      },
      false,
      'updateStreamingEnabled',
    );
  },

  updateSelectedModel: (id: string, value: string) => {
    set(
      (state) => {
        const config = state.configurations[id];
        if (config && config.selectedModel !== value) {
          config.selectedModel = value;
          config.selectedSubscription = '';
        }
      },
      false,
      'updateSelectedModel',
    );
  },

  updateSelectedSubscription: (id: string, value: string) => {
    set(
      (state) => {
        const config = state.configurations[id];
        if (config) {
          config.selectedSubscription = value;
        }
      },
      false,
      'updateSelectedSubscription',
    );
  },

  updateSelectedMcpServerIds: (id: string, value: string[]) => {
    set(
      (state) => {
        const config = state.configurations[id];
        if (config) {
          // Create a new array to avoid shared references
          config.selectedMcpServerIds = [...value];
        }
      },
      false,
      'updateSelectedMcpServerIds',
    );
  },

  updateRagEnabled: (id: string, value: boolean) => {
    set(
      (state) => {
        const config = state.configurations[id];
        if (config) {
          config.isRagEnabled = value;
        }
      },
      false,
      'updateRagEnabled',
    );
  },

  updateKnowledgeMode: (id: string, value: 'inline' | 'external') => {
    set(
      (state) => {
        const config = state.configurations[id];
        if (config) {
          config.knowledgeMode = value;
        }
      },
      false,
      'updateKnowledgeMode',
    );
  },

  updateSelectedVectorStoreId: (id: string, value: string | null) => {
    set(
      (state) => {
        const config = state.configurations[id];
        if (config) {
          config.selectedVectorStoreId = value;
        }
      },
      false,
      'updateSelectedVectorStoreId',
    );
  },

  // MCP tool selections (per-config state)
  getToolSelections: (id: string, namespace: string, serverUrl: string) =>
    get().configurations[id]?.mcpToolSelections[namespace]?.[serverUrl],

  saveToolSelections: (
    id: string,
    namespace: string,
    serverUrl: string,
    toolNames: string[] | undefined,
  ) => {
    set(
      (state) => {
        const config = state.configurations[id];
        if (!config) {
          return;
        }

        if (toolNames === undefined) {
          // Remove the entry for this server
          if (config.mcpToolSelections[namespace]) {
            const namespaceSelections = config.mcpToolSelections[namespace]!;
            const updatedNamespace = Object.fromEntries(
              Object.entries(namespaceSelections).filter(([key]) => key !== serverUrl),
            );
            config.mcpToolSelections = {
              ...config.mcpToolSelections,
              [namespace]: updatedNamespace,
            };
          }
        } else {
          // Save the tool selections
          config.mcpToolSelections = {
            ...config.mcpToolSelections,
            [namespace]: {
              ...config.mcpToolSelections[namespace],
              [serverUrl]: toolNames,
            },
          };
        }

        // Sync to sessionStorage
        if (!skipSessionStorage) {
          saveMcpToolSelectionsForConfig(id, config.mcpToolSelections);
        }
      },
      false,
      'saveToolSelections',
    );
  },

  updateGuardrail: (id: string, value: string) => {
    set((state) => {
      const config = state.configurations[id];
      if (config && config.guardrail !== value) {
        config.guardrailSubscription = '';
        config.guardrail = value;
      }
    });
  },

  updateGuardrailUserInputEnabled: (id: string, value: boolean) => {
    set((state) => {
      const config = state.configurations[id];
      if (config) {
        config.guardrailUserInputEnabled = value;
      }
    });
  },

  updateGuardrailModelOutputEnabled: (id: string, value: boolean) => {
    set((state) => {
      const config = state.configurations[id];
      if (config) {
        config.guardrailModelOutputEnabled = value;
      }
    });
  },

  updateGuardrailSubscription: (id: string, value: string) => {
    set((state) => {
      const config = state.configurations[id];
      if (config) {
        config.guardrailSubscription = value;
      }
    });
  },

  updateActivePrompt: (id: string, prompt: MLflowPromptVersion | null) => {
    set(
      (state) => {
        const config = state.configurations[id];
        if (config) {
          config.activePrompt = deepCopyPrompt(prompt);
          config.dirtyPrompt = deepCopyPrompt(prompt);
          config.variableValues = {};
        }
      },
      false,
      'updateActivePrompt',
    );
  },

  updateDirtyPrompt: (id: string, prompt: MLflowPromptVersion | null) => {
    set(
      (state) => {
        const config = state.configurations[id];
        if (config) {
          config.dirtyPrompt = deepCopyPrompt(prompt);
        }
      },
      false,
      'updateDirtyPrompt',
    );
  },

  resetDirtyPrompt: (id: string) => {
    set(
      (state) => {
        const config = state.configurations[id];
        if (config) {
          config.dirtyPrompt = deepCopyPrompt(config.activePrompt);
        }
      },
      false,
      'resetDirtyPrompt',
    );
  },

  clearPromptState: (id: string, newDirtyPrompt: MLflowPromptVersion | null) => {
    set(
      (state) => {
        const config = state.configurations[id];
        if (config) {
          config.activePrompt = null;
          config.dirtyPrompt = deepCopyPrompt(newDirtyPrompt);
          config.variableValues = {};
        }
      },
      false,
      'clearPromptState',
    );
  },

  updateVariableValues: (id: string, values: Record<string, string>) => {
    set(
      (state) => {
        const config = state.configurations[id];
        if (config) {
          config.variableValues = { ...values };
        }
      },
      false,
      'updateVariableValues',
    );
  },

  // ASR model actions
  updateSelectedAsrModel: (id: string, value: string) => {
    set(
      (state) => {
        const config = state.configurations[id];
        if (config && config.selectedAsrModel !== value) {
          config.selectedAsrModel = value;
        }
      },
      false,
      'updateSelectedAsrModel',
    );
  },

  updateAsrModelEnabled: (id: string, value: boolean) => {
    set(
      (state) => {
        const config = state.configurations[id];
        if (config && config.isAsrModelEnabled !== value) {
          config.isAsrModelEnabled = value;
        }
      },
      false,
      'updateAsrModelEnabled',
    );
  },

  updateHasVisionImage: (id: string, value: boolean) => {
    set(
      (state) => {
        const config = state.configurations[id];
        if (config && config.hasVisionImage !== value) {
          config.hasVisionImage = value;
        }
      },
      false,
      'updateHasVisionImage',
    );
  },

  // Configuration management
  resetConfiguration: (initialValues?: Partial<ChatbotConfiguration>) => {
    set(
      () => ({
        ...storeInitialState,
        configurations: {
          default: {
            ...DEFAULT_CONFIGURATION,
            ...initialValues,
            mcpToolSelections: skipSessionStorage ? {} : loadMcpToolSelectionsForConfig('default'),
          },
        },
      }),
      false,
      'resetConfiguration',
    );
  },

  applyAgentProfile: (config: Partial<ChatbotConfiguration>) => {
    set(
      () => ({
        ...storeInitialState,
        profileApplied: true,
        configurations: {
          default: {
            ...DEFAULT_CONFIGURATION,
            ...config,
            // Profile load always starts with a clean slate — never read from sessionStorage.
            // The correct tool selections are applied explicitly via saveToolSelections afterward.
            mcpToolSelections: config.mcpToolSelections ?? {},
          },
        },
      }),
      false,
      'applyAgentProfile',
    );
  },

  // Utility
  getConfiguration: (id: string) => get().configurations[id],
  getPromptSourceType(id: string) {
    const config = get().configurations[id];
    let instructionSource = '';
    if (config) {
      const { activePrompt, systemInstruction } = config;
      const activeTemplate =
        activePrompt?.template ||
        activePrompt?.messages?.find((m) => m.role === 'system')?.content ||
        '';

      if (activeTemplate === systemInstruction) {
        instructionSource = 'managed';
      } else if (systemInstruction === DEFAULT_SYSTEM_INSTRUCTIONS) {
        instructionSource = 'default';
      } else if (activeTemplate !== systemInstruction) {
        instructionSource = 'unsaved';
      }
    }
    return instructionSource;
  },
});

/** Module-level singleton store instance (used by standalone playground) */
const singletonStore = createChatbotConfigStore();

/**
 * Hook to access the ChatbotConfigStore.
 * Reads from ChatbotConfigStoreContext if provided (embedded mode),
 * otherwise falls back to the module-level singleton (standalone mode).
 *
 * Also exposes static methods (getState, setState, subscribe) on the
 * singleton for imperative access outside React components.
 */
function useChatbotConfigStoreHook<T>(selector: (state: ChatbotConfigStore) => T): T {
  const contextStore = React.useContext(ChatbotConfigStoreContext);
  const store = contextStore ?? singletonStore;
  return useStore(store, selector);
}

// Attach singleton static methods for imperative access (e.g., useChatbotConfigStore.getState())
useChatbotConfigStoreHook.getState = singletonStore.getState.bind(singletonStore);
useChatbotConfigStoreHook.setState = singletonStore.setState.bind(singletonStore);
useChatbotConfigStoreHook.subscribe = singletonStore.subscribe.bind(singletonStore);
useChatbotConfigStoreHook.getInitialState = singletonStore.getInitialState.bind(singletonStore);

export const useChatbotConfigStore = useChatbotConfigStoreHook;
