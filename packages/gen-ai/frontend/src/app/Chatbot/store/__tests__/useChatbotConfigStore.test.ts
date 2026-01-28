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

    it('should not update non-existent config', () => {
      act(() => {
        useChatbotConfigStore.getState().updateSystemInstruction('non-existent', 'New instruction');
      });

      const state = useChatbotConfigStore.getState();
      expect(state.configurations['non-existent']).toBeUndefined();
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
