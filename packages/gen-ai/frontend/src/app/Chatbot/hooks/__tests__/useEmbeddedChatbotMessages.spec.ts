/* eslint-disable camelcase */
import type { ResponsesTemplate } from '@odh-dashboard/plugin-core/types';
import {
  buildRequestBody,
  USER_QUERY_PLACEHOLDER,
} from '~/app/Chatbot/hooks/useEmbeddedChatbotMessages';
import type { ChatbotMessageProps } from '~/app/Chatbot/hooks/useChatbotMessages';

const mockTemplate: ResponsesTemplate = {
  model: 'vllm/llama-3',
  stream: false,
  store: true,
  input: [
    {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: `Answer: ${USER_QUERY_PLACEHOLDER}` }],
    },
  ],
  metadata: { autorag_run_id: '123', rag_pattern_name: 'Pattern1' },
  instructions: 'Be helpful.',
  tools: [
    {
      type: 'file_search',
      vector_store_ids: ['vs-1'],
      max_num_results: 5,
      ranking_options: {
        search_mode: 'hybrid',
        ranker_strategy: 'rrf',
        ranker_k: 60,
        ranker_alpha: 0.5,
      },
    },
  ],
  tool_choice: { type: 'file_search' },
  include: ['file_search_call.results'],
};

describe('buildRequestBody', () => {
  it('should substitute the placeholder with the user query', () => {
    const result = buildRequestBody(mockTemplate, 'What is RAG?', []);

    expect(result.input[0].content[0].text).toBe('Answer: What is RAG?');
  });

  it('should override store to false', () => {
    const result = buildRequestBody(mockTemplate, 'Hello', []);

    expect(result.store).toBe(false);
  });

  it('should override stream to true', () => {
    const result = buildRequestBody(mockTemplate, 'Hello', []);

    expect(result.stream).toBe(true);
  });

  it('should preserve template fields (model, tools, instructions, metadata)', () => {
    const result = buildRequestBody(mockTemplate, 'Hello', []);

    expect(result.model).toBe('vllm/llama-3');
    expect(result.instructions).toBe('Be helpful.');
    expect(result.metadata).toEqual({ autorag_run_id: '123', rag_pattern_name: 'Pattern1' });
    expect(result.tools).toEqual(mockTemplate.tools);
    expect(result.tool_choice).toEqual({ type: 'file_search' });
    expect(result.include).toEqual(['file_search_call.results']);
  });

  it('should not do recursive substitution if user message contains the placeholder', () => {
    const result = buildRequestBody(
      mockTemplate,
      `literal ${USER_QUERY_PLACEHOLDER} in message`,
      [],
    );

    expect(result.input[0].content[0].text).toBe(
      `Answer: literal ${USER_QUERY_PLACEHOLDER} in message`,
    );
  });

  it('should use the user message directly when template has no placeholder', () => {
    const noPlaceholderTemplate: ResponsesTemplate = {
      ...mockTemplate,
      input: [
        {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: 'static text without placeholder' }],
        },
      ],
    };

    const result = buildRequestBody(noPlaceholderTemplate, 'My question', []);

    expect(result.input[0].content[0].text).toBe('My question');
  });

  it('should throw for invalid template structure (empty input)', () => {
    const invalidTemplate: ResponsesTemplate = {
      ...mockTemplate,
      input: [],
    };

    expect(() => buildRequestBody(invalidTemplate, 'Hello', [])).toThrow(
      'responses template for this pattern is invalid',
    );
  });

  describe('multi-turn conversation', () => {
    it('should have only one input message for the first turn', () => {
      const result = buildRequestBody(mockTemplate, 'First question', []);

      expect(result.input).toHaveLength(1);
      expect(result.input[0].role).toBe('user');
    });

    it('should append previous messages and current query for multi-turn', () => {
      const previousMessages: ChatbotMessageProps[] = [
        { role: 'user', content: 'First question', id: '1', name: 'User', avatar: '' },
        { role: 'bot', content: 'First answer', id: '2', name: 'Bot', avatar: '' },
      ];

      const result = buildRequestBody(mockTemplate, 'Follow-up question', previousMessages);

      // input[0]: template with substituted first query
      expect(result.input[0].role).toBe('user');
      expect(result.input[0].content[0].text).toBe('Answer: Follow-up question');
      // input[1]: previous user message
      expect(result.input[1].role).toBe('user');
      expect(result.input[1].content[0].text).toBe('First question');
      // input[2]: previous bot message (mapped to assistant)
      expect(result.input[2].role).toBe('assistant');
      expect(result.input[2].content[0].text).toBe('First answer');
      // input[3]: current user message
      expect(result.input[3].role).toBe('user');
      expect(result.input[3].content[0].text).toBe('Follow-up question');
    });

    it('should skip previous messages with no content', () => {
      const previousMessages: ChatbotMessageProps[] = [
        { role: 'user', content: 'Question', id: '1', name: 'User', avatar: '' },
        { role: 'bot', content: '', id: '2', name: 'Bot', avatar: '' },
      ];

      const result = buildRequestBody(mockTemplate, 'Next', previousMessages);

      // Should have: template msg, previous user msg (bot skipped due to empty content), current user msg
      expect(result.input).toHaveLength(3);
    });
  });
});
