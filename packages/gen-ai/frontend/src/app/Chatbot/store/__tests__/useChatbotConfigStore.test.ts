import { renderHook, act } from '@testing-library/react';
import { useChatbotConfigStore } from '../useChatbotConfigStore';
import { DEFAULT_CONFIGURATION } from '../types';

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
      const { result } = renderHook(() => useChatbotConfigStore());

      expect(result.current.configurations.default).toEqual(DEFAULT_CONFIGURATION);
    });
  });

  describe('field-specific updaters', () => {
    it('should update systemInstruction', () => {
      const { result } = renderHook(() => useChatbotConfigStore());

      act(() => {
        result.current.updateSystemInstruction('default', 'New instruction');
      });

      expect(result.current.configurations.default?.systemInstruction).toBe('New instruction');
    });

    it('should update temperature', () => {
      const { result } = renderHook(() => useChatbotConfigStore());

      act(() => {
        result.current.updateTemperature('default', 0.7);
      });

      expect(result.current.configurations.default?.temperature).toBe(0.7);
    });

    it('should update isStreamingEnabled', () => {
      const { result } = renderHook(() => useChatbotConfigStore());

      act(() => {
        result.current.updateStreamingEnabled('default', false);
      });

      expect(result.current.configurations.default?.isStreamingEnabled).toBe(false);
    });

    it('should not update non-existent config', () => {
      const { result } = renderHook(() => useChatbotConfigStore());

      act(() => {
        result.current.updateSystemInstruction('non-existent', 'New instruction');
      });

      expect(result.current.configurations['non-existent']).toBeUndefined();
    });
  });

  describe('getConfiguration', () => {
    it('should return configuration by ID', () => {
      const { result } = renderHook(() => useChatbotConfigStore());

      const config = result.current.getConfiguration('default');

      expect(config).toEqual(DEFAULT_CONFIGURATION);
    });

    it('should return undefined for non-existent ID', () => {
      const { result } = renderHook(() => useChatbotConfigStore());

      const config = result.current.getConfiguration('non-existent');

      expect(config).toBeUndefined();
    });
  });
});
