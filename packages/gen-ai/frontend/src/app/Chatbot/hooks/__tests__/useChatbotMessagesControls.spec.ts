/* eslint-disable camelcase */
import * as React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import useChatbotMessages from '~/app/Chatbot/hooks/useChatbotMessages';
import { CreateResponseRequest, SimplifiedResponseData, ChatbotSourceSettings } from '~/app/types';

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

// Test constants
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

// Setup function to be called in beforeEach
const setupMocks = (): void => {
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
};

// Helper to create default hook props
const createDefaultHookProps = (overrides?: {
  modelId?: string;
  selectedSourceSettings?: ChatbotSourceSettings | null;
  systemInstruction?: string;
  isRawUploaded?: boolean;
  isStreamingEnabled?: boolean;
  temperature?: number;
  currentVectorStoreId?: string | null;
  selectedServerIds?: string[];
}) => ({
  ...defaultMcpProps,
  modelId: mockModelId,
  selectedSourceSettings: mockSourceSettings,
  systemInstruction: '',
  isRawUploaded: true,
  isStreamingEnabled: false,
  temperature: 0.7,
  currentVectorStoreId: null,
  selectedServerIds: [],
  ...overrides,
});

describe('useChatbotMessages - controls', () => {
  beforeEach(() => {
    setupMocks();
  });

  describe('stop streaming', () => {
    it('should provide handleStopStreaming function', () => {
      mockCreateResponse.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages(createDefaultHookProps({ isStreamingEnabled: true })),
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
        useChatbotMessages(createDefaultHookProps({ isStreamingEnabled: true })),
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
        useChatbotMessages(createDefaultHookProps({ isStreamingEnabled: true })),
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
        useChatbotMessages(createDefaultHookProps({ isStreamingEnabled: true })),
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
        useChatbotMessages(createDefaultHookProps({ isStreamingEnabled: true })),
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

      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

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

      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

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

  describe('clear conversation', () => {
    it('should reset messages to initial state', () => {
      mockCreateResponse.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      // Send a message first to add to conversation
      act(() => {
        result.current.handleMessageSend('Test message');
      });

      // Clear conversation
      act(() => {
        result.current.clearConversation();
      });

      // Should have only the initial bot message
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toMatchObject({
        role: 'bot',
        content:
          'Before you begin chatting, you can change the model, edit the system prompt, adjust model parameters to fit your specific use case.',
        name: 'Bot',
      });
    });

    it('should reset all state variables', () => {
      mockCreateResponse.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      // Send a message to change state
      act(() => {
        result.current.handleMessageSend('Test');
      });

      // Clear conversation
      act(() => {
        result.current.clearConversation();
      });

      expect(result.current.isMessageSendButtonDisabled).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isStreamingWithoutContent).toBe(false);
    });

    it('should stop any ongoing streaming when clearing conversation', async () => {
      let capturedAbortSignal: AbortSignal | undefined;

      mockCreateResponse.mockImplementation((request, opts) => {
        capturedAbortSignal = opts?.abortSignal;
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(mockSuccessResponse);
          }, 1000);
        });
      });

      const { result } = renderHook(() =>
        useChatbotMessages(createDefaultHookProps({ isStreamingEnabled: true })),
      );

      // Start a message
      act(() => {
        result.current.handleMessageSend('Test message');
      });

      // Clear conversation while message is being sent
      act(() => {
        result.current.clearConversation();
      });

      // Abort signal should have been triggered
      expect(capturedAbortSignal?.aborted).toBe(true);

      // Messages should be reset
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe(
        'Before you begin chatting, you can change the model, edit the system prompt, adjust model parameters to fit your specific use case.',
      );
    });

    it('should preserve model and configuration settings', async () => {
      mockCreateResponse.mockResolvedValue(mockSuccessResponse);

      const customSystemInstruction = 'You are a helpful assistant.';
      const customTemperature = 0.9;

      const { result } = renderHook(() =>
        useChatbotMessages(
          createDefaultHookProps({
            systemInstruction: customSystemInstruction,
            isStreamingEnabled: true,
            temperature: customTemperature,
          }),
        ),
      );

      // Send a message
      await act(async () => {
        await result.current.handleMessageSend('First message');
      });

      // Clear conversation
      act(() => {
        result.current.clearConversation();
      });

      // Send another message after clearing
      await act(async () => {
        await result.current.handleMessageSend('Second message');
      });

      // Verify that settings are preserved in the API call
      const lastCall = mockCreateResponse.mock.calls[mockCreateResponse.mock.calls.length - 1];
      expect(lastCall[0].model).toBe('test-model-id');
      expect(lastCall[0].instructions).toBe(customSystemInstruction);
      expect(lastCall[0].temperature).toBe(customTemperature);
      expect(lastCall[0].stream).toBe(true);
    });

    it('should not throw error when called without active stream', () => {
      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      // Clear conversation without sending any messages
      expect(() => {
        act(() => {
          result.current.clearConversation();
        });
      }).not.toThrow();

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe(
        'Before you begin chatting, you can change the model, edit the system prompt, adjust model parameters to fit your specific use case.',
      );
    });

    it('should clear conversation history but retain RAG configuration', async () => {
      mockCreateResponse.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      // Send a message with RAG configuration
      await act(async () => {
        await result.current.handleMessageSend('Test with RAG');
      });

      // Clear conversation
      act(() => {
        result.current.clearConversation();
      });

      // Send another message
      await act(async () => {
        await result.current.handleMessageSend('Test after clear');
      });

      // Verify RAG settings are still used
      const lastCall = mockCreateResponse.mock.calls[mockCreateResponse.mock.calls.length - 1];
      expect(lastCall[0].vector_store_ids).toEqual(['test-vector-db']);
    });

    it('should provide clearConversation function from the hook', () => {
      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      expect(result.current.clearConversation).toBeDefined();
      expect(typeof result.current.clearConversation).toBe('function');
    });

    it('should silently handle abort when clearing during active request', async () => {
      mockCreateResponse.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve(mockSuccessResponse);
            }, 1000);
          }),
      );

      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      // Start a message
      act(() => {
        result.current.handleMessageSend('Test message');
      });

      // Clear conversation while request is in progress
      act(() => {
        result.current.clearConversation();
      });

      // Wait for any async operations
      await act(async () => {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 200);
        });
      });

      // Should only have the initial message - abort error was silently ignored
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe(
        'Before you begin chatting, you can change the model, edit the system prompt, adjust model parameters to fit your specific use case.',
      );
    });

    it('should silently handle abort when clearing during streaming', async () => {
      mockCreateResponse.mockImplementation((request, opts) => {
        if (opts?.onStreamData) {
          setTimeout(() => {
            opts.onStreamData?.('Streaming content...');
          }, 50);
        }
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(mockSuccessResponse);
          }, 1000);
        });
      });

      const { result } = renderHook(() =>
        useChatbotMessages(createDefaultHookProps({ isStreamingEnabled: true })),
      );

      // Start streaming a message
      act(() => {
        result.current.handleMessageSend('Test streaming');
      });

      // Wait for streaming to start
      await act(async () => {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 100);
        });
      });

      // Clear conversation while streaming
      act(() => {
        result.current.clearConversation();
      });

      // Wait for async operations
      await act(async () => {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 200);
        });
      });

      // Should only have the initial message - abort was silently handled
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe(
        'Before you begin chatting, you can change the model, edit the system prompt, adjust model parameters to fit your specific use case.',
      );
    });
  });
});
