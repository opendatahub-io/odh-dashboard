/* eslint-disable camelcase */
import { renderHook, act } from '@testing-library/react';
import useChatbotMessages from '~/app/Chatbot/hooks/useChatbotMessages';
import { querySource } from '~/app/services/llamaStackService';
import { ChatbotSourceSettings, QueryResponse } from '~/app/types';

// Mock external dependencies
jest.mock('~/app/services/llamaStackService');
jest.mock('~/app/utilities/utils', () => ({
  getId: jest.fn(() => 'mock-id'),
}));

const mockQuerySource = querySource as jest.MockedFunction<typeof querySource>;

describe('useChatbotMessages', () => {
  const mockModelId = 'test-model-id';
  const mockSourceSettings: ChatbotSourceSettings = {
    vectorStore: 'test-vector-db',
    embeddingModel: 'test-embedding-model',
    maxChunkLength: 500,
    delimiter: '\n\n',
    chunkOverlap: 50,
  };

  const mockSuccessResponse: QueryResponse = {
    chat_completion: {
      metrics: [],
      completion_message: {
        role: 'assistant',
        content: 'This is a bot response',
        stop_reason: 'stop',
      },
    },
    rag_response: {
      content: [],
      metadata: {
        document_ids: [],
        chunks: [],
        scores: [],
      },
    },
    has_rag_content: false,
    used_vector_dbs: false,
    assistant_message: 'This is a bot response',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure querySource mock is properly reset
    mockQuerySource.mockReset();
  });

  describe('initialization', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
        }),
      );

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toMatchObject({
        role: 'bot',
        content: 'Send a message to test your configuration',
        name: 'Bot',
      });
      expect(result.current.isMessageSendButtonDisabled).toBe(false);
      expect(result.current.scrollToBottomRef).toBeDefined();
      expect(result.current.handleMessageSend).toBeDefined();
    });
  });

  describe('handleMessageSend', () => {
    it('should successfully send a message and receive a bot response', async () => {
      mockQuerySource.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
        }),
      );

      await act(async () => {
        await result.current.handleMessageSend('Hello, bot!');
      });

      expect(result.current.messages).toHaveLength(3); // initial + user + bot

      // Test user message - only check what matters
      expect(result.current.messages[1]).toMatchObject({
        role: 'user',
        content: 'Hello, bot!',
        name: 'User',
      });

      // Test bot response - only check what matters
      expect(result.current.messages[2]).toMatchObject({
        role: 'bot',
        content: 'This is a bot response',
        name: 'Bot',
      });
      expect(result.current.isMessageSendButtonDisabled).toBe(false);
    });

    it('should disable and re-enable send button during message sending', async () => {
      mockQuerySource.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
        }),
      );

      // Initially button should be enabled
      expect(result.current.isMessageSendButtonDisabled).toBe(false);

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      // After sending, button should be re-enabled
      expect(result.current.isMessageSendButtonDisabled).toBe(false);
    });

    it('should call querySource with correct parameters', async () => {
      mockQuerySource.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
        }),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test query');
      });

      expect(mockQuerySource).toHaveBeenCalledWith({
        content: 'Test query',
        vector_db_ids: ['test-vector-db'],
        query_config: {
          chunk_template: 'Result {index}\nContent: {chunk.content}\nMetadata: {metadata}\n',
          max_chunks: 5,
          max_tokens_in_context: 1000,
        },
        llm_model_id: 'test-model-id',
        sampling_params: {
          strategy: {
            type: 'greedy',
          },
          max_tokens: 500,
        },
        system_prompt:
          "\n\nConversation History:\nbot: Send a message to test your configuration\n\nPlease respond to the user's message while considering the above conversation context.",
      });
    });
  });

  describe('error handling', () => {
    it('should handle missing modelId', async () => {
      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: '',
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
        }),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      expect(result.current.messages).toHaveLength(3); // initial + user + error bot
      expect(result.current.messages[2]).toMatchObject({
        role: 'bot',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        name: 'Bot',
      });
      expect(result.current.isMessageSendButtonDisabled).toBe(false);
      expect(mockQuerySource).not.toHaveBeenCalled();
    });

    it('should handle missing selectedSourceSettings by calling querySource without vector_db_ids', async () => {
      mockQuerySource.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: null,
          systemInstruction: '',
          isRawUploaded: false,
        }),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      expect(result.current.messages).toHaveLength(3); // initial + user + bot response
      expect(result.current.messages[2]).toMatchObject({
        role: 'bot',
        content: 'This is a bot response',
        name: 'Bot',
      });
      expect(result.current.isMessageSendButtonDisabled).toBe(false);
      expect(mockQuerySource).toHaveBeenCalledWith({
        content: 'Test message',
        query_config: {
          chunk_template: 'Result {index}\nContent: {chunk.content}\nMetadata: {metadata}\n',
          max_chunks: 5,
          max_tokens_in_context: 1000,
        },
        llm_model_id: 'test-model-id',
        sampling_params: {
          strategy: {
            type: 'greedy',
          },
          max_tokens: 500,
        },
        system_prompt:
          "\n\nConversation History:\nbot: Send a message to test your configuration\n\nPlease respond to the user's message while considering the above conversation context.",
      });
    });

    it('should handle API errors', async () => {
      mockQuerySource.mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
        }),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      expect(result.current.messages).toHaveLength(3); // initial + user + error bot
      expect(result.current.messages[2]).toMatchObject({
        role: 'bot',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        name: 'Bot',
      });
      expect(result.current.isMessageSendButtonDisabled).toBe(false);
    });

    it('should re-enable send button even when errors occur', async () => {
      mockQuerySource.mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
        }),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      expect(result.current.isMessageSendButtonDisabled).toBe(false);
    });
  });

  describe('conversation context functionality', () => {
    it('should include conversation history in system prompt', async () => {
      mockQuerySource.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: 'You are a helpful assistant.',
          isRawUploaded: true,
        }),
      );

      // Send first message
      await act(async () => {
        await result.current.handleMessageSend('Hello');
      });

      // Send second message
      await act(async () => {
        await result.current.handleMessageSend('How are you?');
      });

      // Check that querySource was called with conversation history in system prompt
      expect(mockQuerySource).toHaveBeenCalledTimes(2);

      const firstCall = mockQuerySource.mock.calls[0][0];
      expect(firstCall.system_prompt).toContain('You are a helpful assistant.');
      expect(firstCall.system_prompt).toContain('Conversation History:');
      expect(firstCall.system_prompt).toContain('bot: Send a message to test your configuration');
      expect(firstCall.system_prompt).toContain(
        "Please respond to the user's message while considering the above conversation context.",
      );

      const secondCall = mockQuerySource.mock.calls[1][0];
      expect(secondCall.system_prompt).toContain('bot: Send a message to test your configuration');
      expect(secondCall.system_prompt).toContain('user: Hello');
      expect(secondCall.system_prompt).toContain('bot: This is a bot response');
    });

    it('should handle empty system instruction correctly', async () => {
      mockQuerySource.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
        }),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      const call = mockQuerySource.mock.calls[0][0];
      expect(call.system_prompt).toContain('Conversation History:');
      expect(call.system_prompt).toContain('bot: Send a message to test your configuration');
      expect(call.system_prompt).toContain(
        "Please respond to the user's message while considering the above conversation context.",
      );
    });

    it('should maintain conversation context when modelId changes', async () => {
      mockQuerySource.mockResolvedValue(mockSuccessResponse);

      const { result, rerender } = renderHook(
        ({ modelId }) =>
          useChatbotMessages({
            modelId,
            selectedSourceSettings: mockSourceSettings,
            systemInstruction: 'Be helpful.',
            isRawUploaded: true,
          }),
        { initialProps: { modelId: 'model-1' } },
      );

      // Send message with first model
      await act(async () => {
        await result.current.handleMessageSend('Hello with model 1');
      });

      // Change model
      rerender({ modelId: 'model-2' });

      // Send message with second model
      await act(async () => {
        await result.current.handleMessageSend('Hello with model 2');
      });

      // Verify conversation context is preserved
      const secondCall = mockQuerySource.mock.calls[1][0];
      expect(secondCall.system_prompt).toContain('Hello with model 1');
      expect(secondCall.llm_model_id).toBe('model-2');
    });

    it('should maintain conversation context when system instruction changes', async () => {
      mockQuerySource.mockResolvedValue(mockSuccessResponse);

      const { result, rerender } = renderHook(
        ({ systemInstruction }) =>
          useChatbotMessages({
            modelId: mockModelId,
            selectedSourceSettings: mockSourceSettings,
            systemInstruction,
            isRawUploaded: true,
          }),
        { initialProps: { systemInstruction: 'Be concise.' } },
      );

      // Send message with first instruction
      await act(async () => {
        await result.current.handleMessageSend('Hello with concise instruction');
      });

      // Change system instruction
      rerender({ systemInstruction: 'Be detailed.' });

      // Send message with second instruction
      await act(async () => {
        await result.current.handleMessageSend('Hello with detailed instruction');
      });

      // Verify conversation context is preserved
      const secondCall = mockQuerySource.mock.calls[1][0];
      expect(secondCall.system_prompt).toContain('Be detailed.');
      expect(secondCall.system_prompt).toContain('Hello with concise instruction');
    });
  });
});
