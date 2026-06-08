/* eslint-disable camelcase */
import { renderHook, act } from '@testing-library/react';
import type { ResponsesTemplate } from '~/types/embeddable-chatbot';
import { createPassthroughResponse } from '~/app/services/llamaStackService';
import type { SimplifiedResponseData } from '~/app/types';
import useEmbeddedChatbotMessages, {
  USER_QUERY_PLACEHOLDER,
} from '~/app/Chatbot/hooks/useEmbeddedChatbotMessages';

jest.mock('~/app/services/llamaStackService', () => ({
  createPassthroughResponse: jest.fn(),
}));

const createPassthroughResponseMock = jest.mocked(createPassthroughResponse);

const mockTemplate: ResponsesTemplate = {
  model: 'test-model',
  stream: true,
  store: false,
  input: [
    {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: `Answer: ${USER_QUERY_PLACEHOLDER}` }],
    },
  ],
  metadata: { autorag_run_id: 'run-1', rag_pattern_name: 'pattern-1' },
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

const defaultProps = {
  bffBasePath: '/gen-ai/api/v1',
  namespace: 'test-ns',
  secretName: 'test-secret',
  responsesTemplate: mockTemplate,
  username: 'TestUser',
};

const mockResponse: SimplifiedResponseData = {
  id: 'resp-1',
  model: 'test-model',
  status: 'completed',
  created_at: Date.now(),
  content: 'Bot response content',
  metrics: {
    latency_ms: 150,
    time_to_first_token_ms: 50,
    usage: {
      input_tokens: 10,
      output_tokens: 20,
      total_tokens: 30,
    },
  },
};

describe('useEmbeddedChatbotMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useEmbeddedChatbotMessages(defaultProps));

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isMessageSendButtonDisabled).toBe(false);
    expect(result.current.isStreamingWithoutContent).toBe(false);
    expect(result.current.lastResponseMetrics).toBeNull();
    expect(result.current.modelDisplayName).toBe('test-model');
  });

  it('should use "Bot" as display name when model is empty', () => {
    const { result } = renderHook(() =>
      useEmbeddedChatbotMessages({
        ...defaultProps,
        responsesTemplate: { ...mockTemplate, model: '' },
      }),
    );

    expect(result.current.modelDisplayName).toBe('Bot');
  });

  it('should send message and receive streamed response', async () => {
    createPassthroughResponseMock.mockImplementation((_bff, _ns, _secret, _body, onStreamData) => {
      onStreamData('Bot ');
      onStreamData('response ');
      onStreamData('content');
      return Promise.resolve(mockResponse);
    });

    const { result } = renderHook(() => useEmbeddedChatbotMessages(defaultProps));

    await act(async () => {
      await result.current.handleMessageSend('Hello');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[0].content).toBe('Hello');
    expect(result.current.messages[1].role).toBe('bot');
    expect(result.current.messages[1].content).toBe('Bot response content');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isMessageSendButtonDisabled).toBe(false);
  });

  it('should call createPassthroughResponse with correct parameters', async () => {
    createPassthroughResponseMock.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useEmbeddedChatbotMessages(defaultProps));

    await act(async () => {
      await result.current.handleMessageSend('Test query');
    });

    expect(createPassthroughResponseMock).toHaveBeenCalledWith(
      '/gen-ai/api/v1',
      'test-ns',
      'test-secret',
      expect.objectContaining({
        model: 'test-model',
        store: false,
        stream: true,
      }),
      expect.any(Function),
      expect.any(AbortSignal),
    );
  });

  it('should capture metrics from response', async () => {
    createPassthroughResponseMock.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useEmbeddedChatbotMessages(defaultProps));

    await act(async () => {
      await result.current.handleMessageSend('Hello');
    });

    expect(result.current.lastResponseMetrics).toEqual({
      latency_ms: 150,
      time_to_first_token_ms: 50,
      usage: {
        input_tokens: 10,
        output_tokens: 20,
        total_tokens: 30,
      },
    });
  });

  it('should display error message when request fails', async () => {
    createPassthroughResponseMock.mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useEmbeddedChatbotMessages(defaultProps));

    await act(async () => {
      await result.current.handleMessageSend('Hello');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].role).toBe('bot');
    expect(result.current.messages[1].content).toBe('Network failure');
    expect(result.current.isLoading).toBe(false);
  });

  it('should clear conversation', async () => {
    createPassthroughResponseMock.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useEmbeddedChatbotMessages(defaultProps));

    await act(async () => {
      await result.current.handleMessageSend('Hello');
    });

    expect(result.current.messages).toHaveLength(2);

    act(() => {
      result.current.clearConversation();
    });

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.lastResponseMetrics).toBeNull();
  });

  it('should include sources from response', async () => {
    const responseWithSources: SimplifiedResponseData = {
      ...mockResponse,
      sources: [{ title: 'Doc 1', link: 'https://example.com/1' }],
    };
    createPassthroughResponseMock.mockResolvedValue(responseWithSources);

    const { result } = renderHook(() => useEmbeddedChatbotMessages(defaultProps));

    await act(async () => {
      await result.current.handleMessageSend('Hello');
    });

    const botMessage = result.current.messages[1];
    expect(botMessage.sources).toBeDefined();
  });
});
