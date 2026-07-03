/* eslint-disable camelcase */
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ResponsesTemplate } from '~/types/embeddable-chatbot';
import { createPassthroughResponse } from '~/app/services/llamaStackService';
import type { SimplifiedResponseData } from '~/app/types';
import useEmbeddedChatbotMessages, {
  USER_QUERY_PLACEHOLDER,
} from '~/app/Chatbot/hooks/useEmbeddedChatbotMessages';
import { classifyError } from '~/app/utilities/errorClassifier';

jest.mock('~/app/services/llamaStackService', () => ({
  createPassthroughResponse: jest.fn(),
}));

jest.mock('~/app/utilities/errorClassifier', () => ({
  classifyError: jest.fn(),
}));

const mockClassifyError = jest.mocked(classifyError);

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
    mockClassifyError.mockReturnValue({
      pattern: 'full-failure',
      variant: 'danger',
      isRetriable: false,
      title: 'Error',
      description: 'An error occurred',
      details: {
        component: 'Unknown',
        errorCode: 'UNKNOWN',
        rawMessage: 'Network failure',
      },
    });
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

  it('should classify errors instead of storing them in message content', async () => {
    createPassthroughResponseMock.mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useEmbeddedChatbotMessages(defaultProps));

    await act(async () => {
      await result.current.handleMessageSend('Hello');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].role).toBe('bot');
    expect(result.current.messages[1].content).toBe('');
    expect(result.current.messages[1].errorClassification).toBeDefined();
    expect(mockClassifyError).toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('should not include failed bot messages in subsequent request input', async () => {
    createPassthroughResponseMock
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useEmbeddedChatbotMessages(defaultProps));

    await act(async () => {
      await result.current.handleMessageSend('First question');
    });

    await act(async () => {
      await result.current.handleMessageSend('Follow-up question');
    });

    const secondCallBody = createPassthroughResponseMock.mock.calls[1][3] as {
      input: Array<{ role: string; content: Array<{ text: string }> }>;
    };

    expect(secondCallBody.input).toHaveLength(2);
    expect(secondCallBody.input[0].role).toBe('user');
    expect(secondCallBody.input[0].content[0].text).toBe('First question');
    expect(secondCallBody.input[1].content[0].text).toBe('Answer: Follow-up question');
    expect(
      secondCallBody.input.some((msg) => msg.content[0].text.includes('Network failure')),
    ).toBe(false);
  });

  it('should retry after a retriable error', async () => {
    mockClassifyError.mockReturnValue({
      pattern: 'full-failure',
      variant: 'danger',
      isRetriable: true,
      title: 'Error',
      description: 'Try again',
      details: {
        component: 'bff',
        errorCode: 'server_error',
        rawMessage: 'Temporary failure',
      },
    });

    createPassthroughResponseMock
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useEmbeddedChatbotMessages(defaultProps));

    await act(async () => {
      await result.current.handleMessageSend('Hello');
    });

    const errorMessage = result.current.messages[1];
    expect(errorMessage.onRetryError).toBeDefined();

    act(() => {
      errorMessage.onRetryError?.();
    });

    await waitFor(() => {
      expect(createPassthroughResponseMock).toHaveBeenCalledTimes(2);
      expect(result.current.messages[result.current.messages.length - 1].content).toBe(
        'Bot response content',
      );
    });

    expect(result.current.messages[result.current.messages.length - 1].errorClassification).toBe(
      undefined,
    );
  });

  it('should retry the failed turn even after a later message was sent', async () => {
    mockClassifyError.mockReturnValue({
      pattern: 'full-failure',
      variant: 'danger',
      isRetriable: true,
      title: 'Error',
      description: 'Try again',
      details: {
        component: 'bff',
        errorCode: 'server_error',
        rawMessage: 'Temporary failure',
      },
    });

    createPassthroughResponseMock
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce({ ...mockResponse, content: 'Retry success' });

    const { result } = renderHook(() => useEmbeddedChatbotMessages(defaultProps));

    await act(async () => {
      await result.current.handleMessageSend('First message');
    });

    await waitFor(() => {
      expect(result.current.messages.some((msg) => msg.errorClassification)).toBe(true);
    });

    const firstErrorRetry = result.current.messages.find(
      (msg) => msg.role === 'bot' && msg.errorClassification,
    )?.onRetryError;

    await act(async () => {
      await result.current.handleMessageSend('Second message');
    });

    await waitFor(() => {
      expect(createPassthroughResponseMock).toHaveBeenCalledTimes(2);
    });

    act(() => {
      firstErrorRetry?.();
    });

    await waitFor(() => {
      expect(createPassthroughResponseMock).toHaveBeenCalledTimes(3);
      const thirdCallBody = createPassthroughResponseMock.mock.calls[2][3] as {
        input: Array<{ role: string; content: Array<{ text: string }> }>;
      };
      const lastInputMessage = thirdCallBody.input[thirdCallBody.input.length - 1];
      expect(lastInputMessage.content[0].text).toBe('Answer: First message');
    });
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

  it('should include annotations and citationMap from response', async () => {
    const citationMap = new Map([['f1', 1]]);
    const fileSearchData = {
      queries: ['test query'],
      results: [{ filename: 'doc1.pdf', score: 0.95, text: 'test content' }],
    };
    const responseWithAnnotations: SimplifiedResponseData = {
      ...mockResponse,
      annotations: [
        // eslint-disable-next-line camelcase
        { type: 'file_citation', file_id: 'f1', filename: 'doc1.pdf', index: 10 },
      ],
      citationMap,
      fileSearchData,
    };
    createPassthroughResponseMock.mockResolvedValue(responseWithAnnotations);

    const { result } = renderHook(() => useEmbeddedChatbotMessages(defaultProps));

    await act(async () => {
      await result.current.handleMessageSend('Hello');
    });

    const botMessage = result.current.messages[1];
    expect(botMessage.annotations).toBeDefined();
    expect(botMessage.citationMap).toBeDefined();
    expect(botMessage.citationMap?.get('f1')).toBe(1);
    expect(botMessage.fileSearchData).toBeDefined();
    expect(botMessage.fileSearchData).toEqual(fileSearchData);
  });
});
