import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import {
  ChatbotConfigStore,
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

// Constants for configIds - used as display labels
export const MODEL_1_CONFIG_ID = 'Model 1';
export const MODEL_2_CONFIG_ID = 'Model 2';

const initialState = {
  configurations: {
    [MODEL_1_CONFIG_ID]: {
      ...DEFAULT_CONFIGURATION,
      mcpToolSelections: loadMcpToolSelectionsForConfig(MODEL_1_CONFIG_ID),
    },
  },
  configIds: [MODEL_1_CONFIG_ID],
};
export const useChatbotConfigStore = create<ChatbotConfigStore>()(
  devtools(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    immer((set, get) => ({
      ...initialState,

      // Configuration lifecycle
      addConfiguration: (id: string, initialModel?: string) => {
        const state = get();
        if (!state.configurations[id]) {
          set(
            {
              configurations: {
                ...state.configurations,
                [id]: {
                  ...DEFAULT_CONFIGURATION,
                  selectedModel: initialModel ?? '',
                  mcpToolSelections: loadMcpToolSelectionsForConfig(id),
                },
              },
              configIds: [...state.configIds, id],
            },
            false,
            'addConfiguration',
          );
        }
      },

      removeConfiguration: (id: string) => {
        const state = get();

        // Don't allow removing the last configuration or non-existent configurations
        if (state.configIds.length <= 1 || !state.configurations[id]) {
          return;
        }

        // Find the remaining config
        const remainingConfigId = state.configIds.find((configId) => configId !== id);
        const remainingConfig = remainingConfigId ? state.configurations[remainingConfigId] : null;

        if (!remainingConfig) {
          return;
        }

        // The remaining config always becomes Model 1
        const mcpToolSelectionsCopy: McpToolSelectionsMap = {};
        Object.entries(remainingConfig.mcpToolSelections).forEach(([namespace, serverMap]) => {
          if (serverMap) {
            const serverMapCopy: Record<string, string[]> = {};
            Object.entries(serverMap).forEach(([serverUrl, toolNames]) => {
              serverMapCopy[serverUrl] = [...toolNames];
            });
            mcpToolSelectionsCopy[namespace] = serverMapCopy;
          }
        });

        const newModel1Config: ChatbotConfiguration = {
          systemInstruction: remainingConfig.systemInstruction,
          temperature: remainingConfig.temperature,
          isStreamingEnabled: remainingConfig.isStreamingEnabled,
          selectedModel: remainingConfig.selectedModel,
          selectedMcpServerIds: [...remainingConfig.selectedMcpServerIds],
          mcpToolSelections: mcpToolSelectionsCopy,
          guardrail: remainingConfig.guardrail,
          guardrailUserInputEnabled: remainingConfig.guardrailUserInputEnabled,
          guardrailModelOutputEnabled: remainingConfig.guardrailModelOutputEnabled,
          isRagEnabled: remainingConfig.isRagEnabled,
        };

        set(
          {
            configurations: {
              [MODEL_1_CONFIG_ID]: newModel1Config,
            },
            configIds: [MODEL_1_CONFIG_ID],
          },
          false,
          'removeConfiguration',
        );

        // Update sessionStorage
        saveMcpToolSelectionsForConfig(MODEL_1_CONFIG_ID, newModel1Config.mcpToolSelections);
        if (remainingConfigId && remainingConfigId !== MODEL_1_CONFIG_ID) {
          removeMcpToolSelectionsForConfig(remainingConfigId);
        }
        removeMcpToolSelectionsForConfig(id);
      },

      duplicateConfiguration: (configIdToClone: string) => {
        const state = get();
        const sourceConfig = state.configurations[configIdToClone];

        // Don't allow if already in compare mode or source doesn't exist
        if (!sourceConfig || state.configIds.length >= 2) {
          return;
        }

        // Create a deep copy of the source configuration
        const mcpToolSelectionsCopy: McpToolSelectionsMap = {};
        Object.entries(sourceConfig.mcpToolSelections).forEach(([namespace, serverMap]) => {
          if (serverMap) {
            const serverMapCopy: Record<string, string[]> = {};
            Object.entries(serverMap).forEach(([serverUrl, toolNames]) => {
              serverMapCopy[serverUrl] = [...toolNames];
            });
            mcpToolSelectionsCopy[namespace] = serverMapCopy;
          }
        });

        const newConfig: ChatbotConfiguration = {
          systemInstruction: sourceConfig.systemInstruction,
          temperature: sourceConfig.temperature,
          isStreamingEnabled: sourceConfig.isStreamingEnabled,
          selectedModel: sourceConfig.selectedModel,
          selectedMcpServerIds: [...sourceConfig.selectedMcpServerIds],
          mcpToolSelections: mcpToolSelectionsCopy,
          guardrail: sourceConfig.guardrail,
          guardrailUserInputEnabled: sourceConfig.guardrailUserInputEnabled,
          guardrailModelOutputEnabled: sourceConfig.guardrailModelOutputEnabled,
          isRagEnabled: sourceConfig.isRagEnabled,
        };

        set(
          {
            configurations: {
              ...state.configurations,
              [MODEL_2_CONFIG_ID]: newConfig,
            },
            configIds: [MODEL_1_CONFIG_ID, MODEL_2_CONFIG_ID],
          },
          false,
          'duplicateConfiguration',
        );

        // Copy MCP tool selections to Model 2 in sessionStorage
        saveMcpToolSelectionsForConfig(MODEL_2_CONFIG_ID, newConfig.mcpToolSelections);
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
            if (config) {
              config.selectedModel = value;
            }
          },
          false,
          'updateSelectedModel',
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
            saveMcpToolSelectionsForConfig(id, config.mcpToolSelections);
          },
          false,
          'saveToolSelections',
        );
      },

      updateGuardrail: (id: string, value: string) => {
        set((state) => {
          const config = state.configurations[id];
          if (config) {
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

      // Configuration management
      resetConfiguration: (initialValues?: Partial<ChatbotConfiguration>) => {
        set(
          () => ({
            ...initialState,
            configurations: {
              [MODEL_1_CONFIG_ID]: {
                ...DEFAULT_CONFIGURATION,
                ...initialValues,
                mcpToolSelections: loadMcpToolSelectionsForConfig(MODEL_1_CONFIG_ID),
              },
            },
          }),
          false,
          'resetConfiguration',
        );
      },

      // Utility
      getConfiguration: (id: string) => get().configurations[id],
    })),
    {
      name: 'ChatbotConfigStore',
    },
  ),
);
