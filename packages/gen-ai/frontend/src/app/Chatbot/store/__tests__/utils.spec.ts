/* eslint-disable camelcase */
import { MLflowPromptVersion } from '~/app/types';
import { deepCopyPrompt } from '~/app/Chatbot/store/utils';

describe('deepCopyPrompt', () => {
  const mockPrompt: MLflowPromptVersion = {
    name: 'test-prompt',
    version: 1,
    template: 'You are a helpful assistant.',
    messages: [
      { role: 'system', content: 'System message' },
      { role: 'user', content: 'User message' },
    ],
    tags: { env: 'test', category: 'chat' },
    aliases: ['prod', 'latest'],
    commit_message: 'Initial commit',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('should return null when given null', () => {
    expect(deepCopyPrompt(null)).toBeNull();
  });

  it('should create a new object (not the same reference)', () => {
    const result = deepCopyPrompt(mockPrompt);
    expect(result).not.toBe(mockPrompt);
  });

  it('should preserve all primitive properties', () => {
    const result = deepCopyPrompt(mockPrompt);

    expect(result?.name).toBe('test-prompt');
    expect(result?.version).toBe(1);
    expect(result?.template).toBe('You are a helpful assistant.');
    expect(result?.commit_message).toBe('Initial commit');
    expect(result?.created_at).toBe('2024-01-01T00:00:00Z');
    expect(result?.updated_at).toBe('2024-01-01T00:00:00Z');
  });

  it('should create a deep copy of messages array', () => {
    const result = deepCopyPrompt(mockPrompt);

    expect(result?.messages).not.toBe(mockPrompt.messages);
    expect(result?.messages).toEqual(mockPrompt.messages);
    expect(result?.messages?.[0]).not.toBe(mockPrompt.messages?.[0]);
    expect(result?.messages?.[1]).not.toBe(mockPrompt.messages?.[1]);
  });

  it('should create a deep copy of tags object', () => {
    const result = deepCopyPrompt(mockPrompt);

    expect(result?.tags).not.toBe(mockPrompt.tags);
    expect(result?.tags).toEqual(mockPrompt.tags);
  });

  it('should create a deep copy of aliases array', () => {
    const result = deepCopyPrompt(mockPrompt);

    expect(result?.aliases).not.toBe(mockPrompt.aliases);
    expect(result?.aliases).toEqual(mockPrompt.aliases);
  });

  it('should handle prompt without messages', () => {
    const promptWithoutMessages: MLflowPromptVersion = {
      name: 'no-messages',
      version: 1,
      template: 'Template only',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const result = deepCopyPrompt(promptWithoutMessages);

    expect(result).not.toBe(promptWithoutMessages);
    expect(result?.messages).toBeUndefined();
    expect(result?.template).toBe('Template only');
  });

  it('should handle prompt without tags', () => {
    const promptWithoutTags: MLflowPromptVersion = {
      name: 'no-tags',
      version: 1,
      template: 'Template',
      messages: [{ role: 'system', content: 'System' }],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const result = deepCopyPrompt(promptWithoutTags);

    expect(result).not.toBe(promptWithoutTags);
    expect(result?.tags).toBeUndefined();
  });

  it('should handle prompt without aliases', () => {
    const promptWithoutAliases: MLflowPromptVersion = {
      name: 'no-aliases',
      version: 1,
      template: 'Template',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const result = deepCopyPrompt(promptWithoutAliases);

    expect(result).not.toBe(promptWithoutAliases);
    expect(result?.aliases).toBeUndefined();
  });

  it('should handle prompt with empty messages array', () => {
    const promptWithEmptyMessages: MLflowPromptVersion = {
      name: 'empty-messages',
      version: 1,
      messages: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const result = deepCopyPrompt(promptWithEmptyMessages);

    expect(result?.messages).toEqual([]);
    expect(result?.messages).not.toBe(promptWithEmptyMessages.messages);
  });

  it('should handle prompt with empty tags object', () => {
    const promptWithEmptyTags: MLflowPromptVersion = {
      name: 'empty-tags',
      version: 1,
      tags: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const result = deepCopyPrompt(promptWithEmptyTags);

    expect(result?.tags).toEqual({});
    expect(result?.tags).not.toBe(promptWithEmptyTags.tags);
  });

  it('should handle prompt with empty aliases array', () => {
    const promptWithEmptyAliases: MLflowPromptVersion = {
      name: 'empty-aliases',
      version: 1,
      aliases: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const result = deepCopyPrompt(promptWithEmptyAliases);

    expect(result?.aliases).toEqual([]);
    expect(result?.aliases).not.toBe(promptWithEmptyAliases.aliases);
  });

  it('should prevent mutations from affecting the original', () => {
    const original: MLflowPromptVersion = {
      name: 'original',
      version: 1,
      messages: [{ role: 'system', content: 'Original content' }],
      tags: { key: 'original-value' },
      aliases: ['original-alias'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const copy = deepCopyPrompt(original);

    if (copy?.messages?.[0]) {
      copy.messages[0].content = 'Modified content';
    }
    if (copy?.tags) {
      copy.tags.key = 'modified-value';
    }
    if (copy?.aliases) {
      copy.aliases[0] = 'modified-alias';
    }

    expect(original.messages?.[0].content).toBe('Original content');
    expect(original.tags?.key).toBe('original-value');
    expect(original.aliases?.[0]).toBe('original-alias');
  });
});
