/* eslint-disable camelcase */
import { renderHook } from '@testing-library/react';
import { useChatbotConfigStore } from '~/app/Chatbot/store/useChatbotConfigStore';
import { DEFAULT_CONFIGURATION } from '~/app/Chatbot/store/types';
import { DEFAULT_SYSTEM_INSTRUCTIONS } from '~/app/Chatbot/const';
import { MLflowPromptVersion } from '~/app/types';
import { usePromptEdited } from '~/app/Chatbot/hooks/usePromptEdited';

jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/gen-ai',
  DEPLOYMENT_MODE: 'federated',
  MCP_SERVERS_SESSION_STORAGE_KEY: 'gen-ai-playground-servers',
}));

describe('usePromptEdited', () => {
  const DEFAULT_CONFIG_ID = 'default';

  const mockPrompt: MLflowPromptVersion = {
    name: 'test-prompt',
    version: 1,
    template: 'You are a helpful assistant.',
    messages: [{ role: 'system', content: 'System content' }],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    useChatbotConfigStore.setState({
      configurations: {
        [DEFAULT_CONFIG_ID]: { ...DEFAULT_CONFIGURATION },
        'config-2': { ...DEFAULT_CONFIGURATION },
      },
      configIds: [DEFAULT_CONFIG_ID, 'config-2'],
    });
  });

  describe('without active prompt', () => {
    it('should return false when system instruction matches default', () => {
      const { result } = renderHook(() => usePromptEdited(DEFAULT_CONFIG_ID));
      expect(result.current).toBe(false);
    });

    it('should return true when system instruction differs from default', () => {
      useChatbotConfigStore.getState().updateSystemInstruction(DEFAULT_CONFIG_ID, 'Custom prompt');

      const { result } = renderHook(() => usePromptEdited(DEFAULT_CONFIG_ID));
      expect(result.current).toBe(true);
    });

    it('should return false when system instruction is empty but matches default', () => {
      useChatbotConfigStore
        .getState()
        .updateSystemInstruction(DEFAULT_CONFIG_ID, DEFAULT_SYSTEM_INSTRUCTIONS);

      const { result } = renderHook(() => usePromptEdited(DEFAULT_CONFIG_ID));
      expect(result.current).toBe(false);
    });
  });

  describe('with active prompt using template', () => {
    beforeEach(() => {
      useChatbotConfigStore.getState().updateActivePrompt(DEFAULT_CONFIG_ID, mockPrompt);
      useChatbotConfigStore
        .getState()
        .updateSystemInstruction(DEFAULT_CONFIG_ID, mockPrompt.template!);
    });

    it('should return false when system instruction matches active prompt template', () => {
      const { result } = renderHook(() => usePromptEdited(DEFAULT_CONFIG_ID));
      expect(result.current).toBe(false);
    });

    it('should return true when system instruction differs from active prompt template', () => {
      useChatbotConfigStore
        .getState()
        .updateSystemInstruction(DEFAULT_CONFIG_ID, 'Modified instruction');

      const { result } = renderHook(() => usePromptEdited(DEFAULT_CONFIG_ID));
      expect(result.current).toBe(true);
    });
  });

  describe('with active prompt using messages', () => {
    const promptWithMessages: MLflowPromptVersion = {
      name: 'messages-prompt',
      version: 1,
      messages: [{ role: 'system', content: 'System from messages' }],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    beforeEach(() => {
      useChatbotConfigStore.getState().updateActivePrompt(DEFAULT_CONFIG_ID, promptWithMessages);
      useChatbotConfigStore
        .getState()
        .updateSystemInstruction(DEFAULT_CONFIG_ID, 'System from messages');
    });

    it('should return false when system instruction matches message content', () => {
      const { result } = renderHook(() => usePromptEdited(DEFAULT_CONFIG_ID));
      expect(result.current).toBe(false);
    });

    it('should return true when system instruction differs from message content', () => {
      useChatbotConfigStore
        .getState()
        .updateSystemInstruction(DEFAULT_CONFIG_ID, 'Different content');

      const { result } = renderHook(() => usePromptEdited(DEFAULT_CONFIG_ID));
      expect(result.current).toBe(true);
    });
  });

  describe('with different config IDs', () => {
    it('should check the correct config for each call', () => {
      useChatbotConfigStore
        .getState()
        .updateSystemInstruction(DEFAULT_CONFIG_ID, 'Custom for default');
      useChatbotConfigStore
        .getState()
        .updateSystemInstruction('config-2', DEFAULT_SYSTEM_INSTRUCTIONS);

      const { result: defaultResult } = renderHook(() => usePromptEdited(DEFAULT_CONFIG_ID));
      const { result: config2Result } = renderHook(() => usePromptEdited('config-2'));

      expect(defaultResult.current).toBe(true);
      expect(config2Result.current).toBe(false);
    });

    it('should handle independent prompt state per config', () => {
      const prompt1 = { ...mockPrompt, template: 'Template 1' };
      const prompt2 = { ...mockPrompt, template: 'Template 2' };

      useChatbotConfigStore.getState().updateActivePrompt(DEFAULT_CONFIG_ID, prompt1);
      useChatbotConfigStore.getState().updateActivePrompt('config-2', prompt2);

      useChatbotConfigStore.getState().updateSystemInstruction(DEFAULT_CONFIG_ID, 'Template 1');
      useChatbotConfigStore.getState().updateSystemInstruction('config-2', 'Modified');

      const { result: defaultResult } = renderHook(() => usePromptEdited(DEFAULT_CONFIG_ID));
      const { result: config2Result } = renderHook(() => usePromptEdited('config-2'));

      expect(defaultResult.current).toBe(false);
      expect(config2Result.current).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle active prompt with empty template', () => {
      const promptWithEmptyTemplate: MLflowPromptVersion = {
        name: 'empty-template',
        version: 1,
        template: '',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      useChatbotConfigStore
        .getState()
        .updateActivePrompt(DEFAULT_CONFIG_ID, promptWithEmptyTemplate);
      useChatbotConfigStore.getState().updateSystemInstruction(DEFAULT_CONFIG_ID, '');

      const { result } = renderHook(() => usePromptEdited(DEFAULT_CONFIG_ID));
      expect(result.current).toBe(false);
    });

    it('should prefer template over messages when both exist', () => {
      const promptWithBoth: MLflowPromptVersion = {
        name: 'both',
        version: 1,
        template: 'Template content',
        messages: [{ role: 'system', content: 'Message content' }],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      useChatbotConfigStore.getState().updateActivePrompt(DEFAULT_CONFIG_ID, promptWithBoth);
      useChatbotConfigStore
        .getState()
        .updateSystemInstruction(DEFAULT_CONFIG_ID, 'Template content');

      const { result } = renderHook(() => usePromptEdited(DEFAULT_CONFIG_ID));
      expect(result.current).toBe(false);
    });

    it('should handle active prompt with no system message in messages array', () => {
      const promptWithUserOnly: MLflowPromptVersion = {
        name: 'user-only',
        version: 1,
        messages: [{ role: 'user', content: 'User message only' }],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      useChatbotConfigStore.getState().updateActivePrompt(DEFAULT_CONFIG_ID, promptWithUserOnly);
      useChatbotConfigStore.getState().updateSystemInstruction(DEFAULT_CONFIG_ID, '');

      const { result } = renderHook(() => usePromptEdited(DEFAULT_CONFIG_ID));
      expect(result.current).toBe(false);
    });
  });
});
