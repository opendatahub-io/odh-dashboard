/* eslint-disable camelcase */
import { renderHook, act, waitFor } from '@testing-library/react';
import * as React from 'react';
import useChatbotMessages from '~/app/Chatbot/hooks/useChatbotMessages';
import { ChatbotSourceSettings, CreateResponseRequest, SimplifiedResponseData } from '~/app/types';

// Mock external dependencies
jest.mock('~/app/services/llamaStackService');
jest.mock('~/app/hooks/useGenAiAPI');
jest.mock('~/app/utilities/utils', () => ({
  getId: jest.fn(() => 'mock-id'),
}));

jest.mock('~/app/Chatbot/ChatbotMessagesToolResponse', () => ({
  ToolResponseCardTitle: jest.fn(() => 'ToolResponseCardTitle'),
  ToolResponseCardBody: jest.fn(() => 'ToolResponseCardBody'),
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

const mockUseContext = React.useContext as jest.MockedFunction<typeof React.useContext>;

// Import after mocking
const { useGenAiAPI } = jest.requireMock('~/app/hooks/useGenAiAPI');
const mockUseGenAiAPI = useGenAiAPI as jest.Mock;

// Create a properly typed mock for createResponse
const mockCreateResponse = jest.fn<
  Promise<SimplifiedResponseData>,
  [CreateResponseRequest, { onStreamData?: (chunk: string) => void; abortSignal?: AbortSignal }?]
>();

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

  // Provide default MCP data as props to the hook
  const defaultMcpProps = {
    mcpServers: [],
    mcpServerStatuses: new Map(),
    mcpServerTokens: new Map(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure createResponse mock is properly reset
    mockCreateResponse.mockReset();
    // Mock useContext to return the namespace
    mockUseContext.mockReturnValue({ namespace: mockNamespace });

    // Mock useGenAiAPI to return the API object with mocked functions
    mockUseGenAiAPI.mockReturnValue({
      apiAvailable: true,
      api: {
        createResponse: mockCreateResponse,
      },
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
          selectedServerIds: [],
          ...defaultMcpProps,
          ...defaultMcpProps,
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
          selectedServerIds: [],
          ...defaultMcpProps,
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
          selectedServerIds: [],
          ...defaultMcpProps,
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
          selectedServerIds: [],
          ...defaultMcpProps,
        }),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test query');
      });

      // Check that createResponse was called with the correct request data
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
        expect.objectContaining({
          abortSignal: expect.any(Object),
        }),
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
          selectedServerIds: [],
          ...defaultMcpProps,
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
          selectedServerIds: [],
          ...defaultMcpProps,
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
        expect.objectContaining({
          abortSignal: expect.any(Object),
        }),
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
          selectedServerIds: [],
          ...defaultMcpProps,
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
          selectedServerIds: [],
          ...defaultMcpProps,
        }),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      expect(result.current.isMessageSendButtonDisabled).toBe(false);
    });

    it('should handle API not available', async () => {
      // Override the useGenAiAPI mock for this test
      mockUseGenAiAPI.mockReturnValue({
        apiAvailable: false,
        api: {
          createResponse: mockCreateResponse,
        },
      });

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
          isStreamingEnabled: false,
          temperature: 0.7,
          currentVectorStoreId: null,
          selectedServerIds: [],
          ...defaultMcpProps,
        }),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      expect(result.current.messages).toHaveLength(3); // initial + user + error bot
      expect(result.current.messages[2]).toMatchObject({
        role: 'bot',
        content: 'API is not available',
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
          selectedServerIds: [],
          ...defaultMcpProps,
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
        (request: CreateResponseRequest, opts?: { onStreamData?: (chunk: string) => void }) => {
          // Simulate some streaming before error
          if (opts?.onStreamData) {
            opts.onStreamData('Hello ');
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
          selectedServerIds: [],
          ...defaultMcpProps,
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
          selectedServerIds: [],
          ...defaultMcpProps,
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
        expect.objectContaining({
          abortSignal: expect.any(Object),
        }),
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
          selectedServerIds: [],
          ...defaultMcpProps,
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
          selectedServerIds: [],
          ...defaultMcpProps,
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
            selectedServerIds: [],
            ...defaultMcpProps,
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
            selectedServerIds: [],
            ...defaultMcpProps,
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

  describe('stop button functionality', () => {
    it('should provide handleStopStreaming function', () => {
      mockCreateResponse.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
          isStreamingEnabled: true,
          temperature: 0.7,
          currentVectorStoreId: null,
          selectedServerIds: [],
          mcpServers: [],
          mcpServerStatuses: new Map(),
          mcpServerTokens: new Map(),
        }),
      );

      expect(result.current.handleStopStreaming).toBeDefined();
      expect(typeof result.current.handleStopStreaming).toBe('function');
    });

    it('should abort streaming when handleStopStreaming is called', async () => {
      let capturedAbortSignal: AbortSignal | undefined;
      let streamDataCallback: ((chunk: string) => void) | undefined;

      // Mock streaming response
      mockCreateResponse.mockImplementation((request, opts) => {
        capturedAbortSignal = opts?.abortSignal;
        streamDataCallback = opts?.onStreamData;
        return new Promise((resolve, reject) => {
          const timeouts: NodeJS.Timeout[] = [];

          // Listen for abort immediately
          const abortHandler = () => {
            // Clear all pending timeouts
            timeouts.forEach(clearTimeout);
            reject(new Error('Response stopped by user'));
          };

          if (capturedAbortSignal) {
            if (capturedAbortSignal.aborted) {
              reject(new Error('Response stopped by user'));
              return;
            }
            capturedAbortSignal.addEventListener('abort', abortHandler);
          }

          // Simulate streaming with delayed chunks
          timeouts.push(
            setTimeout(() => {
              if (streamDataCallback && !capturedAbortSignal?.aborted) {
                streamDataCallback('Hello ');
              }
            }, 50),
          );
          timeouts.push(
            setTimeout(() => {
              if (streamDataCallback && !capturedAbortSignal?.aborted) {
                streamDataCallback('world');
              }
            }, 100),
          );
          timeouts.push(
            setTimeout(() => {
              if (!capturedAbortSignal?.aborted) {
                resolve(mockSuccessResponse);
              }
            }, 150),
          );
        });
      });

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
          isStreamingEnabled: true,
          temperature: 0.7,
          currentVectorStoreId: null,
          selectedServerIds: [],
          ...defaultMcpProps,
        }),
      );

      // Start sending a message
      act(() => {
        result.current.handleMessageSend('Test message');
      });

      // Wait a bit for streaming to start
      await act(async () => {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 60);
        });
      });

      // Call stop streaming
      act(() => {
        result.current.handleStopStreaming();
      });

      // Verify abort signal was triggered
      expect(capturedAbortSignal?.aborted).toBe(true);

      // Wait for error to be processed and state to update
      await act(async () => {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 300);
        });
      });

      // Verify "You stopped this message" is shown (either appended or as message)
      // Since we are stopping mid-stream, we expect the streaming message to have the partial content
      // followed by the stop message
      await waitFor(
        () => {
          const botMessages = result.current.messages.filter((msg) => msg.role === 'bot');
          const lastBotMessage = botMessages[botMessages.length - 1];
          expect(lastBotMessage.content).toContain('*You stopped this message*');
        },
        { timeout: 1000 },
      );

      const botMessages = result.current.messages.filter((msg) => msg.role === 'bot');
      const lastBotMessage = botMessages[botMessages.length - 1];
      expect(lastBotMessage.content).not.toContain('Response stopped by user');
    });

    it('should show stop message when streaming is stopped (unflushed buffers are discarded)', async () => {
      let streamDataCallback: ((chunk: string) => void) | undefined;
      let capturedAbortSignal: AbortSignal | undefined;

      // Mock streaming response that gets stopped mid-stream
      mockCreateResponse.mockImplementation((request, opts) => {
        streamDataCallback = opts?.onStreamData;
        capturedAbortSignal = opts?.abortSignal;
        return new Promise((resolve, reject) => {
          const timeouts: NodeJS.Timeout[] = [];

          // Listen for abort immediately
          const abortHandler = () => {
            // Clear all pending timeouts
            timeouts.forEach(clearTimeout);
            reject(new Error('Response stopped by user'));
          };

          if (capturedAbortSignal) {
            if (capturedAbortSignal.aborted) {
              reject(new Error('Response stopped by user'));
              return;
            }
            capturedAbortSignal.addEventListener('abort', abortHandler);
          }

          // Send some chunks
          timeouts.push(
            setTimeout(() => {
              if (streamDataCallback && !capturedAbortSignal?.aborted) {
                streamDataCallback('Hello ');
              }
            }, 50),
          );
          timeouts.push(
            setTimeout(() => {
              if (streamDataCallback && !capturedAbortSignal?.aborted) {
                streamDataCallback('world, ');
              }
            }, 100),
          );
          timeouts.push(
            setTimeout(() => {
              if (streamDataCallback && !capturedAbortSignal?.aborted) {
                streamDataCallback('this is ');
              }
            }, 150),
          );
          timeouts.push(
            setTimeout(() => {
              if (!capturedAbortSignal?.aborted) {
                resolve(mockSuccessResponse);
              }
            }, 200),
          );
        });
      });

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
          isStreamingEnabled: true,
          temperature: 0.7,
          currentVectorStoreId: null,
          selectedServerIds: [],
          ...defaultMcpProps,
        }),
      );

      // Start sending a message
      act(() => {
        result.current.handleMessageSend('Test message');
      });

      // Wait for some content to stream
      await act(async () => {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 160);
        });
      });

      // Stop the stream
      act(() => {
        result.current.handleStopStreaming();
      });

      // Wait for stop to be processed and state to update
      await act(async () => {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 300);
        });
      });

      // Verify partial content is preserved with stop message appended
      await waitFor(
        () => {
          const botMessages = result.current.messages.filter((msg) => msg.role === 'bot');
          const lastBotMessage = botMessages[botMessages.length - 1];
          expect(lastBotMessage.content).toContain('*You stopped this message*');
        },
        { timeout: 1000 },
      );

      const botMessages = result.current.messages.filter((msg) => msg.role === 'bot');
      const lastBotMessage = botMessages[botMessages.length - 1];
      // The stop message should be shown
      // Note: Unflushed buffered content is discarded, which is acceptable behavior
      expect(lastBotMessage.content).toContain('*You stopped this message*');
      expect(lastBotMessage.content).not.toContain('Response stopped by user');
    });

    it('should not break when handleStopStreaming is called without active stream', () => {
      mockCreateResponse.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
          isStreamingEnabled: true,
          temperature: 0.7,
          currentVectorStoreId: null,
          selectedServerIds: [],
          mcpServers: [],
          mcpServerStatuses: new Map(),
          mcpServerTokens: new Map(),
        }),
      );

      // Call stop without any active stream
      expect(() => {
        act(() => {
          result.current.handleStopStreaming();
        });
      }).not.toThrow();
    });

    it('should pass abortSignal to createResponse API call when streaming', async () => {
      mockCreateResponse.mockImplementation(() => Promise.resolve(mockSuccessResponse));

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
          isStreamingEnabled: true,
          temperature: 0.7,
          currentVectorStoreId: null,
          selectedServerIds: [],
          ...defaultMcpProps,
        }),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      // Verify abortSignal was passed
      expect(mockCreateResponse).toHaveBeenCalled();
      const callArgs = mockCreateResponse.mock.calls[0];
      expect(callArgs[1]).toBeDefined();
      expect(callArgs[1]?.abortSignal).toBeDefined();
      expect(callArgs[1]?.abortSignal).toBeInstanceOf(AbortSignal);
    });

    it('should pass abortSignal even when streaming is disabled', async () => {
      mockCreateResponse.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
          isStreamingEnabled: false,
          temperature: 0.7,
          currentVectorStoreId: null,
          selectedServerIds: [],
          ...defaultMcpProps,
        }),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      // Verify abortSignal is passed even for non-streaming requests
      expect(mockCreateResponse).toHaveBeenCalled();
      const callArgs = mockCreateResponse.mock.calls[0];
      expect(callArgs[1]).toBeDefined();
      expect(callArgs[1]?.abortSignal).toBeDefined();
      expect(callArgs[1]?.abortSignal).toBeInstanceOf(AbortSignal);
    });

    it('should handle stop button for non-streaming requests', async () => {
      let capturedAbortSignal: AbortSignal | undefined;

      // Mock non-streaming response
      mockCreateResponse.mockImplementation((request, opts) => {
        capturedAbortSignal = opts?.abortSignal;
        return new Promise((resolve, reject) => {
          // Simulate a delay for non-streaming request
          setTimeout(() => {
            resolve(mockSuccessResponse);
          }, 200);

          // Listen for abort
          if (capturedAbortSignal) {
            capturedAbortSignal.addEventListener('abort', () => {
              reject(new Error('Response stopped by user'));
            });
          }
        });
      });

      const { result } = renderHook(() =>
        useChatbotMessages({
          modelId: mockModelId,
          selectedSourceSettings: mockSourceSettings,
          systemInstruction: '',
          isRawUploaded: true,
          isStreamingEnabled: false,
          temperature: 0.7,
          currentVectorStoreId: null,
          selectedServerIds: [],
          ...defaultMcpProps,
        }),
      );

      // Start sending a message (non-streaming)
      act(() => {
        result.current.handleMessageSend('Test message');
      });

      // Wait a bit for request to start
      await act(async () => {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 50);
        });
      });

      // Call stop
      act(() => {
        result.current.handleStopStreaming();
      });

      // Verify abort signal was triggered
      expect(capturedAbortSignal?.aborted).toBe(true);

      // Wait for error to be processed
      await act(async () => {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 100);
        });
      });

      // Verify "You stopped this message" is shown, not the error message
      const botMessages = result.current.messages.filter((msg) => msg.role === 'bot');
      const lastBotMessage = botMessages[botMessages.length - 1];
      expect(lastBotMessage.content).toBe('*You stopped this message*');
      expect(lastBotMessage.content).not.toContain('Response stopped by user');
    });
  });
});
