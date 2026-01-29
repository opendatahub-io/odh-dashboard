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

const initialState = {
  configurations: {
    default: {
      ...DEFAULT_CONFIGURATION,
      mcpToolSelections: loadMcpToolSelectionsForConfig('default'),
    },
  },
  configIds: ['default'],
};
export const useChatbotConfigStore = create<ChatbotConfigStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,
      // TODO: ADD/REMOVE/DUPLICATE CONFIGS

      // Field-specific updaters
      updateSystemInstruction: (id: string, value: string) => {
        set((state) => {
          const config = state.configurations[id];
          if (config) {
            config.systemInstruction = value;
          }
        });
      },

      updateTemperature: (id: string, value: number) => {
        set((state) => {
          const config = state.configurations[id];
          if (config) {
            config.temperature = value;
          }
        });
      },

      updateStreamingEnabled: (id: string, value: boolean) => {
        set((state) => {
          const config = state.configurations[id];
          if (config) {
            config.isStreamingEnabled = value;
          }
        });
      },

      updateSelectedModel: (id: string, value: string) => {
        set((state) => {
          const config = state.configurations[id];
          if (config) {
            config.selectedModel = value;
          }
        });
      },

      updateCurrentVectorStoreId: (id: string, value: string) => {
        set((state) => {
          const config = state.configurations[id];
          if (config) {
            config.currentVectorStoreId = value;
          }
        });
      },

      updateGuardrailsEnabled: (id: string, value: boolean) => {
        set((state) => {
          const config = state.configurations[id];
          if (config) {
            config.guardrailsEnabled = value;
          }
        });
      },

      updateSelectedMcpServerIds: (id: string, value: string[]) => {
        set((state) => {
          const config = state.configurations[id];
          if (config) {
            config.selectedMcpServerIds = value;
          }
        });
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
        set((state) => {
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
        });
      },

      // Configuration management
      resetConfiguration: (initialValues?: Partial<ChatbotConfiguration>) => {
        set(() => ({
          ...initialState,
          configurations: {
            default: {
              ...DEFAULT_CONFIGURATION,
              ...initialValues,
              mcpToolSelections: loadMcpToolSelectionsForConfig('default'),
            },
          },
        }));
      },

      // Utility
      getConfiguration: (id: string) => get().configurations[id],
    })),
    {
      name: 'ChatbotConfigStore',
    },
  ),
);
