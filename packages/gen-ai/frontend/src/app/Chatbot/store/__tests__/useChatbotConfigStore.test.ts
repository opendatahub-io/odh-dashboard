import { act } from '@testing-library/react';
import { useChatbotConfigStore } from '~/app/Chatbot/store/useChatbotConfigStore';
import { DEFAULT_CONFIGURATION } from '~/app/Chatbot/store/types';

describe('useChatbotConfigStore', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Reset store to initial state
    act(() => {
      useChatbotConfigStore.setState({
        configurations: { default: { ...DEFAULT_CONFIGURATION } },
      });
    });
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const state = useChatbotConfigStore.getState();

      expect(state.configurations.default).toEqual(DEFAULT_CONFIGURATION);
    });
  });

  describe('field-specific updaters', () => {
    it('should update systemInstruction', () => {
      act(() => {
        useChatbotConfigStore.getState().updateSystemInstruction('default', 'New instruction');
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations.default?.systemInstruction).toBe('New instruction');
    });

    it('should update temperature', () => {
      act(() => {
        useChatbotConfigStore.getState().updateTemperature('default', 0.7);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations.default?.temperature).toBe(0.7);
    });

    it('should update isStreamingEnabled', () => {
      act(() => {
        useChatbotConfigStore.getState().updateStreamingEnabled('default', false);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations.default?.isStreamingEnabled).toBe(false);
    });

    it('should update guardrailsEnabled', () => {
      act(() => {
        useChatbotConfigStore.getState().updateGuardrailsEnabled('default', true);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations.default?.guardrailsEnabled).toBe(true);
    });

    it('should update selectedMcpServerIds', () => {
      const serverIds = ['server-1', 'server-2', 'server-3'];

      act(() => {
        useChatbotConfigStore.getState().updateSelectedMcpServerIds('default', serverIds);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations.default?.selectedMcpServerIds).toEqual(serverIds);
    });

    it('should update selectedMcpServerIds to empty array', () => {
      // First set some server IDs
      act(() => {
        useChatbotConfigStore.getState().updateSelectedMcpServerIds('default', ['server-1']);
      });

      // Then clear them
      act(() => {
        useChatbotConfigStore.getState().updateSelectedMcpServerIds('default', []);
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations.default?.selectedMcpServerIds).toEqual([]);
    });

    it('should not update non-existent config', () => {
      act(() => {
        useChatbotConfigStore.getState().updateSystemInstruction('non-existent', 'New instruction');
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations['non-existent']).toBeUndefined();
    });
  });

  describe('resetConfiguration', () => {
    it('should reset to default configuration without parameters', () => {
      // Modify some fields first
      act(() => {
        useChatbotConfigStore.getState().updateSystemInstruction('default', 'Custom instruction');
        useChatbotConfigStore.getState().updateTemperature('default', 0.8);
        useChatbotConfigStore.getState().updateSelectedMcpServerIds('default', ['server-1']);
      });

      // Reset
      act(() => {
        useChatbotConfigStore.getState().resetConfiguration();
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations.default).toEqual(DEFAULT_CONFIGURATION);
    });

    it('should reset with initial selectedMcpServerIds', () => {
      const initialServerIds = ['server-1', 'server-2'];

      act(() => {
        useChatbotConfigStore.getState().resetConfiguration({
          selectedMcpServerIds: initialServerIds,
        });
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations.default?.selectedMcpServerIds).toEqual(initialServerIds);
      // Other fields should still be default
      expect(state.configurations.default?.systemInstruction).toBe(
        DEFAULT_CONFIGURATION.systemInstruction,
      );
      expect(state.configurations.default?.temperature).toBe(DEFAULT_CONFIGURATION.temperature);
    });

    it('should reset with multiple initial values', () => {
      act(() => {
        useChatbotConfigStore.getState().resetConfiguration({
          selectedMcpServerIds: ['server-1'],
          selectedModel: 'llama-3',
          temperature: 0.5,
        });
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations.default?.selectedMcpServerIds).toEqual(['server-1']);
      expect(state.configurations.default?.selectedModel).toBe('llama-3');
      expect(state.configurations.default?.temperature).toBe(0.5);
      // Other fields should still be default
      expect(state.configurations.default?.systemInstruction).toBe(
        DEFAULT_CONFIGURATION.systemInstruction,
      );
      expect(state.configurations.default?.isStreamingEnabled).toBe(
        DEFAULT_CONFIGURATION.isStreamingEnabled,
      );
    });

    it('should reset with empty initial values object', () => {
      // Modify some fields first
      act(() => {
        useChatbotConfigStore.getState().updateSystemInstruction('default', 'Custom instruction');
        useChatbotConfigStore.getState().updateSelectedMcpServerIds('default', ['server-1']);
      });

      // Reset with empty object
      act(() => {
        useChatbotConfigStore.getState().resetConfiguration({});
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations.default).toEqual(DEFAULT_CONFIGURATION);
    });
  });

  describe('getConfiguration', () => {
    it('should return configuration by ID', () => {
      const config = useChatbotConfigStore.getState().getConfiguration('default');

      expect(config).toEqual(DEFAULT_CONFIGURATION);
    });

    it('should return undefined for non-existent ID', () => {
      const config = useChatbotConfigStore.getState().getConfiguration('non-existent');

      expect(config).toBeUndefined();
    });
  });
});
