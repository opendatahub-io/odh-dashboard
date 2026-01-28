import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { ChatbotConfigStore, ChatbotConfiguration, DEFAULT_CONFIGURATION } from './types';

const initialState = {
  configurations: { default: { ...DEFAULT_CONFIGURATION } },
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

      // Configuration management
      resetConfiguration: (initialValues?: Partial<ChatbotConfiguration>) => {
        set(() => ({
          ...initialState,
          configurations: {
            default: {
              ...DEFAULT_CONFIGURATION,
              ...initialValues,
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
