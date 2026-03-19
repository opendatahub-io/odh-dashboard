import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { ERROR_CATEGORIES } from '~/app/Chatbot/const';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import useChatbotMessages from '~/app/Chatbot/hooks/useChatbotMessages';

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
});
