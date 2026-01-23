import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { ChatbotConfigStore, DEFAULT_CONFIGURATION } from './types';

export const useChatbotConfigStore = create<ChatbotConfigStore>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      configurations: { default: { ...DEFAULT_CONFIGURATION } },
      configIds: ['default'],

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

      // Utility
      getConfiguration: (id: string) => get().configurations[id],
    })),
    {
      name: 'ChatbotConfigStore',
    },
  ),
);
