import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { ERROR_CATEGORIES } from '~/app/Chatbot/const';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import useChatbotMessages from '~/app/Chatbot/hooks/useChatbotMessages';
import * as errorClassifierModule from '~/app/utilities/errorClassifier';

// Mock dependencies
jest.mock('~/app/hooks/useGenAiAPI');
jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));
jest.mock('~/app/utilities/utils', () => ({
  getId: jest.fn(() => 'mock-id'),
  getLlamaModelDisplayName: jest.fn((modelId: string) => modelId || 'Bot'),
}));
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));
jest.mock('~/app/utilities/errorClassifier');

const mockUseContext = React.useContext as jest.MockedFunction<typeof React.useContext>;
const mockUseGenAiAPI = jest.mocked(useGenAiAPI);

describe('useChatbotMessages - Error Handling', () => {
  const defaultProps = {
    modelId: 'test-model',
    selectedSourceSettings: null,
    systemInstruction: '',
    isRawUploaded: false,
    username: 'testuser',
    isStreamingEnabled: false,
    temperature: 0.7,
    currentVectorStoreId: null,
    selectedServerIds: [],
    mcpServers: [],
    mcpServerStatuses: new Map(),
    mcpServerTokens: new Map(),
    namespace: 'test-namespace',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseContext.mockReturnValue({ namespace: 'test-namespace', aiModels: [] });
  });

  describe('Structured Error Handling', () => {
    it('should extract error message from mod-arch error format', async () => {
      const mockError = {
        error: {
          code: ERROR_CATEGORIES.INVALID_MODEL_CONFIG,
          message:
            'The model configuration is invalid. Please check parameters like max_tokens, chat_template, or prompt length.',
        },
      };

      const mockCreateResponse = jest.fn().mockRejectedValue(mockError);
      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() => useChatbotMessages(defaultProps));

      await result.current.handleMessageSend('Test message');

      await waitFor(() => {
        const { messages } = result.current;
        const lastMessage = messages[messages.length - 1];
        expect(lastMessage.content).toContain('model configuration is invalid');
      });
    });

    it('should handle RAG vector store not found error', async () => {
      const mockError = {
        error: {
          code: ERROR_CATEGORIES.RAG_VECTOR_STORE_NOT_FOUND,
          message:
            'The vector store was not found. Please verify that the vector store exists and you have access to it.',
        },
      };

      const mockCreateResponse = jest.fn().mockRejectedValue(mockError);
      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() => useChatbotMessages(defaultProps));

      await result.current.handleMessageSend('Test RAG query');

      await waitFor(() => {
        const { messages } = result.current;
        const lastMessage = messages[messages.length - 1];
        expect(lastMessage.content).toContain('vector store');
        expect(lastMessage.content).toContain('not found');
      });
    });

    it('should handle guardrails violation error', async () => {
      const mockError = {
        error: {
          code: ERROR_CATEGORIES.GUARDRAILS_VIOLATION,
          message:
            'Content was blocked by guardrails. Please modify your input or adjust guardrails settings.',
        },
      };

      const mockCreateResponse = jest.fn().mockRejectedValue(mockError);
      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() => useChatbotMessages(defaultProps));

      await result.current.handleMessageSend('Inappropriate message');

      await waitFor(() => {
        const { messages } = result.current;
        const lastMessage = messages[messages.length - 1];
        expect(lastMessage.content).toContain('blocked by guardrails');
      });
    });

    it('should handle MCP tool errors', async () => {
      const mockError = {
        error: {
          code: ERROR_CATEGORIES.MCP_ERROR,
          message:
            'An error occurred while invoking the MCP tool. Please check the tool configuration and try again.',
        },
      };

      const mockCreateResponse = jest.fn().mockRejectedValue(mockError);
      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() => useChatbotMessages(defaultProps));

      await result.current.handleMessageSend('Use MCP tool');

      await waitFor(() => {
        const { messages } = result.current;
        const lastMessage = messages[messages.length - 1];
        expect(lastMessage.content).toContain('MCP tool');
        expect(lastMessage.content).toContain('tool configuration');
      });
    });

    it('should handle model timeout error', async () => {
      const mockError = {
        error: {
          code: ERROR_CATEGORIES.MODEL_TIMEOUT,
          message:
            'The model request timed out. The model may be overloaded or the request is too complex. Please try again or simplify your request.',
        },
      };

      const mockCreateResponse = jest.fn().mockRejectedValue(mockError);
      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() => useChatbotMessages(defaultProps));

      await result.current.handleMessageSend('Complex query');

      await waitFor(() => {
        const { messages } = result.current;
        const lastMessage = messages[messages.length - 1];
        expect(lastMessage.content).toContain('timed out');
        expect(lastMessage.content).toContain('try again');
      });
    });

    it('should handle model overloaded error', async () => {
      const mockError = {
        error: {
          code: ERROR_CATEGORIES.MODEL_OVERLOADED,
          message:
            'The model is currently overloaded or out of resources. Please try again in a few moments.',
        },
      };

      const mockCreateResponse = jest.fn().mockRejectedValue(mockError);
      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() => useChatbotMessages(defaultProps));

      await result.current.handleMessageSend('Query');

      await waitFor(() => {
        const { messages } = result.current;
        const lastMessage = messages[messages.length - 1];
        expect(lastMessage.content).toContain('overloaded');
        expect(lastMessage.content).toContain('resources');
      });
    });

    it('should handle unsupported feature error', async () => {
      const mockError = {
        error: {
          code: ERROR_CATEGORIES.UNSUPPORTED_FEATURE,
          message:
            'The selected model does not support this feature (e.g., tools, images, streaming). Please choose a different model or disable the unsupported feature.',
        },
      };

      const mockCreateResponse = jest.fn().mockRejectedValue(mockError);
      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() => useChatbotMessages(defaultProps));

      await result.current.handleMessageSend('Use tools');

      await waitFor(() => {
        const { messages } = result.current;
        const lastMessage = messages[messages.length - 1];
        expect(lastMessage.content).toContain('does not support');
        expect(lastMessage.content).toContain('different model');
      });
    });
  });

  describe('Fallback Error Handling', () => {
    it('should handle standard Error objects', async () => {
      const mockError = new Error('Network connection failed');

      const mockCreateResponse = jest.fn().mockRejectedValue(mockError);
      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() => useChatbotMessages(defaultProps));

      await result.current.handleMessageSend('Test message');

      await waitFor(() => {
        const { messages } = result.current;
        const lastMessage = messages[messages.length - 1];
        expect(lastMessage.content).toBe('Network connection failed');
      });
    });

    it('should handle unknown error types with generic message', async () => {
      const mockError = { someUnexpectedFormat: 'error' };

      const mockCreateResponse = jest.fn().mockRejectedValue(mockError);
      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() => useChatbotMessages(defaultProps));

      await result.current.handleMessageSend('Test message');

      await waitFor(() => {
        const { messages } = result.current;
        const lastMessage = messages[messages.length - 1];
        expect(lastMessage.content).toContain('encountered an error');
        expect(lastMessage.content).toContain('try again');
      });
    });
  });

  describe('Error Logging', () => {
    it('should log error category and message to console', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockError = {
        error: {
          code: ERROR_CATEGORIES.INVALID_PARAMETER,
          message: 'temperature out of range',
        },
      };

      const mockCreateResponse = jest.fn().mockRejectedValue(mockError);
      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() => useChatbotMessages(defaultProps));

      await result.current.handleMessageSend('Test message');

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Response API error:', {
          category: ERROR_CATEGORIES.INVALID_PARAMETER,
          message: 'temperature out of range',
        });
      });

      consoleErrorSpy.mockRestore();
    });

    it('should not log when error has no category', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockError = new Error('Simple error');

      const mockCreateResponse = jest.fn().mockRejectedValue(mockError);
      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() => useChatbotMessages(defaultProps));

      await result.current.handleMessageSend('Test message');

      await waitFor(() => {
        const { messages } = result.current;
        expect(messages.length).toBeGreaterThan(1);
      });

      // Should not log categorized error
      expect(consoleErrorSpy).not.toHaveBeenCalledWith('Response API error:', expect.any(Object));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Error Classification Integration', () => {
    const mockClassifyError = jest.mocked(errorClassifierModule.classifyError);

    beforeEach(() => {
      mockClassifyError.mockReturnValue({
        pattern: 'full_failure',
        severity: 'danger',
        retriable: true,
        title: 'Model inference failed',
        description: 'The model server did not respond in time.',
        rawError: { code: 'timeout', message: 'Request timed out' },
      });
    });

    it('should call classifyError with correct context for non-streaming error', async () => {
      const mockError = {
        error: {
          code: ERROR_CATEGORIES.MODEL_TIMEOUT,
          message: 'Request timed out',
        },
      };

      const mockCreateResponse = jest.fn().mockRejectedValue(mockError);
      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() =>
        useChatbotMessages({
          ...defaultProps,
          isStreamingEnabled: false,
          modelId: 'test-model-id',
        }),
      );

      await result.current.handleMessageSend('Test message');

      await waitFor(() => {
        expect(mockClassifyError).toHaveBeenCalledWith(
          mockError,
          expect.objectContaining({
            wasResponseGenerated: false,
            wasStreamStarted: false,
            modelName: 'test-model-id',
          }),
        );
      });
    });

    it('should call classifyError with wasStreamStarted: true when streaming is enabled', async () => {
      const mockError = {
        error: {
          code: 'stream_lost',
          message: 'Connection lost',
        },
      };

      mockClassifyError.mockReturnValue({
        pattern: 'streaming_interruption',
        severity: 'danger',
        retriable: true,
        title: 'Streaming error — connection lost',
        description: 'The connection to the model was lost during generation.',
        rawError: { code: 'stream_lost', message: 'Connection lost' },
      });

      const mockCreateResponse = jest.fn().mockRejectedValue(mockError);
      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() =>
        useChatbotMessages({
          ...defaultProps,
          isStreamingEnabled: true,
          modelId: 'streaming-model',
        }),
      );

      await result.current.handleMessageSend('Test streaming');

      await waitFor(() => {
        expect(mockClassifyError).toHaveBeenCalledWith(
          mockError,
          expect.objectContaining({
            wasStreamStarted: true,
            modelName: 'streaming-model',
          }),
        );
      });
    });

    it('should add errorClassification to bot message props', async () => {
      const mockErrorClassification = {
        pattern: 'full_failure' as const,
        severity: 'danger' as const,
        retriable: true,
        title: 'Test Error Title',
        description: 'Test error description',
        rawError: { code: 'test_code', message: 'Test error message' },
      };

      mockClassifyError.mockReturnValue(mockErrorClassification);

      const mockError = {
        error: {
          code: 'test_code',
          message: 'Test error message',
        },
      };

      const mockCreateResponse = jest.fn().mockRejectedValue(mockError);
      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() => useChatbotMessages(defaultProps));

      await result.current.handleMessageSend('Test message');

      await waitFor(() => {
        const { messages } = result.current;
        const botMessage = messages.find((msg) => msg.role === 'bot');
        expect(botMessage?.errorClassification).toEqual(mockErrorClassification);
      });
    });

    it('should add onRetryError callback when error is retriable', async () => {
      mockClassifyError.mockReturnValue({
        pattern: 'full_failure',
        severity: 'danger',
        retriable: true,
        title: 'Retriable error',
        description: 'This error can be retried',
        rawError: { code: 'timeout', message: 'Timeout' },
      });

      const mockError = { error: { code: 'timeout', message: 'Timeout' } };
      const mockCreateResponse = jest.fn().mockRejectedValue(mockError);
      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() => useChatbotMessages(defaultProps));

      await result.current.handleMessageSend('Test message');

      await waitFor(() => {
        const { messages } = result.current;
        const botMessage = messages.find((msg) => msg.role === 'bot');
        expect(botMessage?.onRetryError).toBeDefined();
        expect(typeof botMessage?.onRetryError).toBe('function');
      });
    });

    it('should not add onRetryError callback when error is not retriable', async () => {
      mockClassifyError.mockReturnValue({
        pattern: 'full_failure',
        severity: 'danger',
        retriable: false,
        title: 'Non-retriable error',
        description: 'This error cannot be retried',
        rawError: { code: 'max_tokens', message: 'Token limit exceeded' },
      });

      const mockError = { error: { code: 'max_tokens', message: 'Token limit exceeded' } };
      const mockCreateResponse = jest.fn().mockRejectedValue(mockError);
      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() => useChatbotMessages(defaultProps));

      await result.current.handleMessageSend('Test message');

      await waitFor(() => {
        const { messages } = result.current;
        const botMessage = messages.find((msg) => msg.role === 'bot');
        expect(botMessage?.onRetryError).toBeUndefined();
      });
    });

    it('should retry by resending last user message when onRetryError is called', async () => {
      mockClassifyError.mockReturnValue({
        pattern: 'full_failure',
        severity: 'danger',
        retriable: true,
        title: 'Retriable error',
        description: 'Can retry',
        rawError: { message: 'Error' },
      });

      const mockError = { error: { message: 'Error' } };
      const mockCreateResponse = jest.fn().mockRejectedValueOnce(mockError).mockResolvedValueOnce({
        response: 'Success on retry',
        metadata: {},
      });

      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() => useChatbotMessages(defaultProps));

      // First attempt fails
      await result.current.handleMessageSend('Original message');

      await waitFor(() => {
        const { messages } = result.current;
        const botMessage = messages.find((msg) => msg.role === 'bot');
        expect(botMessage?.errorClassification).toBeDefined();
      });

      const retryCallback = result.current.messages.find((msg) => msg.role === 'bot')?.onRetryError;

      // Trigger retry
      retryCallback?.();

      // Should resend the request
      await waitFor(() => {
        expect(mockCreateResponse).toHaveBeenCalledTimes(2);
        const secondCall = mockCreateResponse.mock.calls[1];
        expect(secondCall[0].messages).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'Original message',
            }),
          ]),
        );
      });
    });

    it('should remove failed bot message before retry', async () => {
      mockClassifyError.mockReturnValue({
        pattern: 'full_failure',
        severity: 'danger',
        retriable: true,
        title: 'Retriable error',
        description: 'Can retry',
        rawError: { message: 'Error' },
      });

      const mockError = { error: { message: 'Error' } };
      const mockCreateResponse = jest.fn().mockRejectedValueOnce(mockError).mockResolvedValueOnce({
        response: 'Success',
        metadata: {},
      });

      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() => useChatbotMessages(defaultProps));

      await result.current.handleMessageSend('Test message');

      let failedBotMessageId: string | undefined;
      await waitFor(() => {
        const botMessage = result.current.messages.find((msg) => msg.role === 'bot');
        expect(botMessage?.errorClassification).toBeDefined();
        failedBotMessageId = botMessage?.id;
      });

      const retryCallback = result.current.messages.find((msg) => msg.role === 'bot')?.onRetryError;
      retryCallback?.();

      await waitFor(() => {
        // Failed bot message should be removed
        const stillHasFailedMessage = result.current.messages.some(
          (msg) => msg.id === failedBotMessageId,
        );
        expect(stillHasFailedMessage).toBe(false);
      });
    });

    it('should not retry if no user message exists', async () => {
      mockClassifyError.mockReturnValue({
        pattern: 'full_failure',
        severity: 'danger',
        retriable: true,
        title: 'Retriable error',
        description: 'Can retry',
        rawError: { message: 'Error' },
      });

      const mockError = { error: { message: 'Error' } };
      const mockCreateResponse = jest.fn().mockRejectedValue(mockError);
      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() => useChatbotMessages(defaultProps));

      // Manually add a bot message with error (simulating edge case)
      await result.current.handleMessageSend('Test');

      await waitFor(() => {
        const botMessage = result.current.messages.find((msg) => msg.role === 'bot');
        expect(botMessage?.errorClassification).toBeDefined();
      });

      const initialCallCount = mockCreateResponse.mock.calls.length;

      // Clear messages to simulate no user message scenario
      const retryCallback = result.current.messages.find((msg) => msg.role === 'bot')?.onRetryError;

      // Manually clear user messages to test edge case
      result.current.messages.forEach((msg) => {
        if (msg.role === 'user') {
          result.current.messages.splice(result.current.messages.indexOf(msg), 1);
        }
      });

      retryCallback?.();

      // Should not make additional API calls if no user message
      await waitFor(() => {
        expect(mockCreateResponse).toHaveBeenCalledTimes(initialCallCount);
      });
    });

    it('should use getLlamaModelDisplayName for modelName in classifyError', async () => {
      const mockError = { error: { message: 'Error' } };
      const mockCreateResponse = jest.fn().mockRejectedValue(mockError);
      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() =>
        useChatbotMessages({
          ...defaultProps,
          modelId: 'llama-3.1-8b',
        }),
      );

      await result.current.handleMessageSend('Test');

      await waitFor(() => {
        expect(mockClassifyError).toHaveBeenCalledWith(
          mockError,
          expect.objectContaining({
            modelName: 'llama-3.1-8b', // getLlamaModelDisplayName is mocked to return modelId
          }),
        );
      });
    });

    it('should handle partial_failure pattern classification', async () => {
      mockClassifyError.mockReturnValue({
        pattern: 'partial_failure',
        severity: 'warning',
        retriable: false,
        title: 'Knowledge source retrieval failed',
        description: 'Generated without context from your knowledge sources.',
        rawError: { code: 'rag_down', message: 'RAG service unavailable' },
      });

      const mockError = { error: { code: 'rag_down', message: 'RAG service unavailable' } };
      const mockCreateResponse = jest.fn().mockRejectedValue(mockError);
      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() => useChatbotMessages(defaultProps));

      await result.current.handleMessageSend('Test');

      await waitFor(() => {
        const botMessage = result.current.messages.find((msg) => msg.role === 'bot');
        expect(botMessage?.errorClassification?.pattern).toBe('partial_failure');
        expect(botMessage?.errorClassification?.severity).toBe('warning');
      });
    });

    it('should handle streaming_interruption pattern classification', async () => {
      mockClassifyError.mockReturnValue({
        pattern: 'streaming_interruption',
        severity: 'danger',
        retriable: true,
        title: 'Streaming error — connection lost',
        description: 'The connection to the model was lost during generation.',
        rawError: { code: 'stream_lost', message: 'Connection reset' },
      });

      const mockError = { error: { code: 'stream_lost', message: 'Connection reset' } };
      const mockCreateResponse = jest.fn().mockRejectedValue(mockError);
      mockUseGenAiAPI.mockReturnValue({
        api: { createResponse: mockCreateResponse },
        apiAvailable: true,
      } as ReturnType<typeof useGenAiAPI>);

      const { result } = renderHook(() =>
        useChatbotMessages({
          ...defaultProps,
          isStreamingEnabled: true,
        }),
      );

      await result.current.handleMessageSend('Test');

      await waitFor(() => {
        const botMessage = result.current.messages.find((msg) => msg.role === 'bot');
        expect(botMessage?.errorClassification?.pattern).toBe('streaming_interruption');
        expect(botMessage?.errorClassification?.retriable).toBe(true);
      });
    });
  });
});
