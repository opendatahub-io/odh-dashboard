/* eslint-disable camelcase */
import { renderHook, act } from '@testing-library/react';
import * as React from 'react';
import useChatbotMessages from '~/app/Chatbot/hooks/useChatbotMessages';
import { createResponse } from '~/app/services/llamaStackService';
import { ChatbotSourceSettings, CreateResponseRequest, SimplifiedResponseData } from '~/app/types';
import { useMCPSelectionContext } from '~/app/context/MCPSelectionContext';
import { useMCPServersContext } from '~/app/context/MCPServersContext';
import { useMCPTokenContext } from '~/app/context/MCPTokenContext';

// Mock external dependencies
jest.mock('~/app/services/llamaStackService');
jest.mock('~/app/utilities/utils', () => ({
  getId: jest.fn(() => 'mock-id'),
}));

jest.mock('~/app/context/MCPSelectionContext', () => ({
  useMCPSelectionContext: jest.fn(),
}));

jest.mock('~/app/context/MCPServersContext', () => ({
  useMCPServersContext: jest.fn(),
}));

jest.mock('~/app/context/MCPTokenContext', () => ({
  useMCPTokenContext: jest.fn(),
}));

jest.mock('~/app/Chatbot/ChatbotMessagesToolResponse', () => ({
  ToolResponseCardTitle: jest.fn(() => 'ToolResponseCardTitle'),
  ToolResponseCardBody: jest.fn(() => 'ToolResponseCardBody'),
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

const mockCreateResponse = createResponse as jest.MockedFunction<typeof createResponse>;
const mockUseContext = React.useContext as jest.MockedFunction<typeof React.useContext>;
const mockUseMCPSelectionContext = useMCPSelectionContext as jest.MockedFunction<
  typeof useMCPSelectionContext
>;
const mockUseMCPServersContext = useMCPServersContext as jest.MockedFunction<
  typeof useMCPServersContext
>;
const mockUseMCPTokenContext = useMCPTokenContext as jest.MockedFunction<typeof useMCPTokenContext>;

describe('useChatbotMessages', () => {
  const mockModelId = 'test-model-id';
  const mockSourceSettings: ChatbotSourceSettings = {
    vectorStore: 'test-vector-db',
    embeddingModel: 'test-embedding-model',
    maxChunkLength: 500,
    delimiter: '\n\n',
    chunkOverlap: 50,
  };

  const mockSuccessResponse: SimplifiedResponseData = {
    id: 'resp-123',
    model: 'test-model-id',
    status: 'completed',
    created_at: 0,
    content: 'This is a bot response',
  };

  const mockNamespace = { name: 'test-namespace' };

  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure createResponse mock is properly reset
    mockCreateResponse.mockReset();
    // Mock useContext to return the namespace
    mockUseContext.mockReturnValue({ namespace: mockNamespace });
    // Mock MCP contexts
    mockUseMCPSelectionContext.mockReturnValue({
      playgroundSelectedServerIds: [],
      selectedServersCount: 0,
      saveSelectedServersToPlayground: jest.fn(),
      setSelectedServersCount: jest.fn(),
    });

    mockUseMCPServersContext.mockReturnValue({
      servers: [],
      serversLoaded: true,
      serversLoadError: null,
      serverStatuses: new Map(),
      statusesLoading: new Set(),
      allStatusesChecked: true,
      refresh: jest.fn(),
      checkServerStatus: jest.fn(),
      getSelectedServersForAPI: jest.fn().mockReturnValue([]),
    });

    mockUseMCPTokenContext.mockReturnValue({
      serverTokens: new Map(),
      setServerTokens: jest.fn(),
      isServerValidated: jest.fn().mockReturnValue(false),
    });
  });

  describe('initialization', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
          isStreamingEnabled: false,
          temperature: 0.7,
          currentVectorStoreId: null,
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
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
          isStreamingEnabled: false,
          temperature: 0.7,
          currentVectorStoreId: null,
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
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
          isStreamingEnabled: false,
          temperature: 0.7,
          currentVectorStoreId: null,
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

    it('should call createResponse with correct parameters', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
          isStreamingEnabled: false,
          temperature: 0.7,
          currentVectorStoreId: null,
        }),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test query');
      });

      expect(mockCreateResponse).toHaveBeenCalledWith(
        {
          input: 'Test query',
          model: 'test-model-id',
          vector_store_ids: ['test-vector-db'],
          chat_context: [
            {
              role: 'assistant',
              content: 'Send a message to test your configuration',
            },
          ],
          instructions: '',
          stream: false,
          temperature: 0.7,
        },
        'test-namespace',
      );
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
          isStreamingEnabled: false,
          temperature: 0.7,
          currentVectorStoreId: null,
        }),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      expect(result.current.messages).toHaveLength(3); // initial + user + error bot
      expect(result.current.messages[2]).toMatchObject({
        role: 'bot',
        content: 'No model or source settings selected',
        name: 'Bot',
      });
      expect(result.current.isMessageSendButtonDisabled).toBe(false);
      expect(mockCreateResponse).not.toHaveBeenCalled();
    });

    it('should handle missing selectedSourceSettings by calling createResponse without vector_store_ids', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: null,
          systemInstruction: '',
          isRawUploaded: false,
          isStreamingEnabled: false,
          temperature: 0.7,
          currentVectorStoreId: null,
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
      expect(mockCreateResponse).toHaveBeenCalledWith(
        {
          input: 'Test message',
          model: 'test-model-id',
          chat_context: [
            {
              role: 'assistant',
              content: 'Send a message to test your configuration',
            },
          ],
          instructions: '',
          stream: false,
          temperature: 0.7,
        },
        'test-namespace',
      );
    });

    it('should handle API errors', async () => {
      mockCreateResponse.mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
          isStreamingEnabled: false,
          temperature: 0.7,
          currentVectorStoreId: null,
        }),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      expect(result.current.messages).toHaveLength(3); // initial + user + error bot
      expect(result.current.messages[2]).toMatchObject({
        role: 'bot',
        content: 'API Error',
        name: 'Bot',
      });
      expect(result.current.isMessageSendButtonDisabled).toBe(false);
    });

    it('should re-enable send button even when errors occur', async () => {
      mockCreateResponse.mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
          isStreamingEnabled: false,
          temperature: 0.7,
          currentVectorStoreId: null,
        }),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      expect(result.current.isMessageSendButtonDisabled).toBe(false);
    });

    it('should handle missing namespace', async () => {
      // Override the useContext mock for this test
      mockUseContext.mockReturnValue({ namespace: undefined });

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
          isStreamingEnabled: false,
          temperature: 0.7,
          currentVectorStoreId: null,
        }),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      expect(result.current.messages).toHaveLength(3); // initial + user + error bot
      expect(result.current.messages[2]).toMatchObject({
        role: 'bot',
        content: 'Namespace is required for generating responses',
        name: 'Bot',
      });
      expect(result.current.isMessageSendButtonDisabled).toBe(false);
      expect(mockCreateResponse).not.toHaveBeenCalled();
    });

    it('should display error message from streaming error', async () => {
      const customErrorMessage = 'Custom streaming error message';
      mockCreateResponse.mockRejectedValueOnce(new Error(customErrorMessage));

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
          isStreamingEnabled: false,
          temperature: 0.7,
          currentVectorStoreId: null,
        }),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      expect(result.current.messages).toHaveLength(3); // initial + user + error bot
      expect(result.current.messages[2]).toMatchObject({
        role: 'bot',
        content: customErrorMessage,
        name: 'Bot',
      });
      expect(result.current.isMessageSendButtonDisabled).toBe(false);
    });

    it('should update existing bot message on streaming error', async () => {
      const streamingErrorMessage = 'Streaming error occurred';

      // Mock streaming response that will error
      mockCreateResponse.mockImplementation(
        (
          request: CreateResponseRequest,
          namespace: string,
          onStreamData?: (chunk: string) => void,
        ) => {
          // Simulate some streaming before error
          if (onStreamData) {
            onStreamData('Hello ');
          }
          return Promise.reject(new Error(streamingErrorMessage));
        },
      );

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
          isStreamingEnabled: true,
          temperature: 0.7,
          currentVectorStoreId: null,
        }),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      // Should have initial + user + bot (updated with error, not added separately)
      expect(result.current.messages).toHaveLength(3);
      expect(result.current.messages[2]).toMatchObject({
        role: 'bot',
        content: streamingErrorMessage,
        name: 'Bot',
      });
      expect(result.current.isMessageSendButtonDisabled).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isStreamingWithoutContent).toBe(false);
    });

    it('should use currentVectorStoreId when RAG is enabled and selectedSourceSettings is null', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: null,
          systemInstruction: '',
          isRawUploaded: true,
          isStreamingEnabled: false,
          temperature: 0.7,
          currentVectorStoreId: 'vs_current_store_123',
        }),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      expect(result.current.messages).toHaveLength(3); // initial + user + bot response
      expect(mockCreateResponse).toHaveBeenCalledWith(
        {
          input: 'Test message',
          model: 'test-model-id',
          vector_store_ids: ['vs_current_store_123'],
          chat_context: [
            {
              role: 'assistant',
              content: 'Send a message to test your configuration',
            },
          ],
          instructions: '',
          stream: false,
          temperature: 0.7,
        },
        'test-namespace',
      );
    });
  });

  describe('conversation context functionality', () => {
    it('should include conversation history in system prompt', async () => {
      mockCreateResponse.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: 'You are a helpful assistant.',
          isRawUploaded: true,
          isStreamingEnabled: false,
          temperature: 0.7,
          currentVectorStoreId: null,
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
      expect(mockCreateResponse).toHaveBeenCalledTimes(2);

      const firstCall = mockCreateResponse.mock.calls[0][0];
      expect(firstCall.instructions).toBe('You are a helpful assistant.');
      expect(firstCall.chat_context).toHaveLength(1);
      expect(firstCall.chat_context![0]).toMatchObject({
        role: 'assistant',
        content: 'Send a message to test your configuration',
      });

      const secondCall = mockCreateResponse.mock.calls[1][0];
      expect(secondCall.chat_context).toHaveLength(3);
      expect(secondCall.chat_context![0]).toMatchObject({
        role: 'assistant',
        content: 'Send a message to test your configuration',
      });
      expect(secondCall.chat_context![1]).toMatchObject({
        role: 'user',
        content: 'Hello',
      });
      expect(secondCall.chat_context![2]).toMatchObject({
        role: 'assistant',
        content: 'This is a bot response',
      });
    });

    it('should handle empty system instruction correctly', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
          isStreamingEnabled: false,
          temperature: 0.7,
          currentVectorStoreId: null,
        }),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      const call = mockCreateResponse.mock.calls[0][0];
      expect(call.instructions).toBe('');
      expect(call.chat_context).toHaveLength(1);
      expect(call.chat_context![0]).toMatchObject({
        role: 'assistant',
        content: 'Send a message to test your configuration',
      });
    });

    it('should maintain conversation context when modelId changes', async () => {
      mockCreateResponse.mockResolvedValue(mockSuccessResponse);

      const { result, rerender } = renderHook(
        ({ modelId }) =>
          useChatbotMessages({
            modelId,
            selectedSourceSettings: mockSourceSettings,
            systemInstruction: 'Be helpful.',
            isRawUploaded: true,
            isStreamingEnabled: false,
            temperature: 0.7,
            currentVectorStoreId: null,
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
      const secondCall = mockCreateResponse.mock.calls[1][0];
      expect(secondCall.chat_context).toHaveLength(3);
      expect(secondCall.chat_context![0]).toMatchObject({
        role: 'assistant',
        content: 'Send a message to test your configuration',
      });
      expect(secondCall.chat_context![1]).toMatchObject({
        role: 'user',
        content: 'Hello with model 1',
      });
      expect(secondCall.chat_context![2]).toMatchObject({
        role: 'assistant',
        content: 'This is a bot response',
      });
      expect(secondCall.model).toBe('model-2');
    });

    it('should maintain conversation context when system instruction changes', async () => {
      mockCreateResponse.mockResolvedValue(mockSuccessResponse);

      const { result, rerender } = renderHook(
        ({ systemInstruction }) =>
          useChatbotMessages({
            modelId: mockModelId,
            selectedSourceSettings: mockSourceSettings,
            systemInstruction,
            isRawUploaded: true,
            isStreamingEnabled: false,
            temperature: 0.7,
            currentVectorStoreId: null,
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
      const secondCall = mockCreateResponse.mock.calls[1][0];
      expect(secondCall.instructions).toBe('Be detailed.');
      expect(secondCall.chat_context).toHaveLength(3);
      expect(secondCall.chat_context![0]).toMatchObject({
        role: 'assistant',
        content: 'Send a message to test your configuration',
      });
      expect(secondCall.chat_context![1]).toMatchObject({
        role: 'user',
        content: 'Hello with concise instruction',
      });
      expect(secondCall.chat_context![2]).toMatchObject({
        role: 'assistant',
        content: 'This is a bot response',
      });
    });
  });
});
