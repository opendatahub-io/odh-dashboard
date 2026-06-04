/* eslint-disable camelcase, @typescript-eslint/no-require-imports */
import * as React from 'react';
import { renderHook, act } from '@testing-library/react';
import useChatbotMessages from '~/app/Chatbot/hooks/useChatbotMessages';
import { CreateResponseRequest, SimplifiedResponseData } from '~/app/types';
import {
  mockModelId,
  mockSuccessResponse,
  mockMetrics,
  mockNamespace,
  defaultMcpProps,
} from './consts';

// Mock external dependencies
jest.mock('@patternfly/chatbot', () => ({
  FileDetailsLabel: jest.fn(({ fileName }: { fileName: string }) => fileName),
}));
jest.mock('~/app/services/llamaStackService');
jest.mock('~/app/hooks/useGenAiAPI');
jest.mock('~/app/utilities/utils', () => ({
  getId: jest.fn(() => 'mock-id'),
  getLlamaModelDisplayName: jest.fn((modelId: string) => modelId || 'Bot'),
  splitLlamaModelId: jest.fn((modelId: string) => ({
    providerId: 'provider-id',
    id: modelId,
  })),
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

// Setup function to be called in beforeEach
const setupMocks = (): void => {
  jest.clearAllMocks();
  // Ensure createResponse mock is properly reset
  mockCreateResponse.mockReset();
  // Mock useContext for ChatbotContext (aiModels) and other contexts (namespace)
  mockUseContext.mockReturnValue({ namespace: mockNamespace, aiModels: [] });

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
  configId?: string;
  modelId?: string;
  systemInstruction?: string;
  isRagEnabled?: boolean;
  isStreamingEnabled?: boolean;
  temperature?: number;
  currentVectorStoreId?: string | null;
  knowledgeMode?: 'inline' | 'external';
  selectedServerIds?: string[];
  subscription?: string;
}) => ({
  ...defaultMcpProps,
  configId: 'default',
  modelId: mockModelId,
  systemInstruction: '',
  isRagEnabled: true,
  isStreamingEnabled: false,
  temperature: 0.7,
  currentVectorStoreId: 'test-vector-db',
  knowledgeMode: 'inline' as const,
  selectedServerIds: [],
  ...overrides,
});

describe('useChatbotMessages', () => {
  beforeEach(() => {
    setupMocks();
  });

  describe('initialization', () => {
    it('should initialize with correct default values', () => {
      mockCreateResponse.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      expect(result.current.messages).toHaveLength(0);
      expect(result.current.isMessageSendButtonDisabled).toBe(false);
      expect(result.current.scrollToBottomRef).toBeDefined();
      expect(result.current.handleMessageSend).toBeDefined();
    });
  });

  describe('handleMessageSend', () => {
    it('should successfully send a message and receive a bot response', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Hello, bot!');
      });

      expect(result.current.messages).toHaveLength(2); // user + bot (placeholder removed on first send)

      // Test user message - only check what matters
      expect(result.current.messages[0]).toMatchObject({
        role: 'user',
        content: 'Hello, bot!',
        name: 'User',
      });

      // Test bot response - only check what matters (name shows selected model)
      expect(result.current.messages[1]).toMatchObject({
        role: 'bot',
        content: 'This is a bot response',
        name: mockModelId,
      });
      expect(result.current.isMessageSendButtonDisabled).toBe(false);
    });

    it('should disable and re-enable send button during message sending', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

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

      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Test query');
      });

      // Check that createResponse was called with the correct request data
      expect(mockCreateResponse).toHaveBeenCalledWith(
        {
          input: 'Test query',
          model: 'test-model-id',
          vector_store_ids: ['test-vector-db'],
          chat_context: [],
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
        useChatbotMessages(createDefaultHookProps({ modelId: '' })),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      expect(result.current.messages).toHaveLength(2); // user + error bot (placeholder removed on first send)
      expect(result.current.messages[1]).toMatchObject({
        role: 'bot',
        content: 'No model or source settings selected',
        name: 'Bot',
      });
      expect(result.current.isMessageSendButtonDisabled).toBe(false);
      expect(mockCreateResponse).not.toHaveBeenCalled();
    });

    it('should call createResponse without vector_store_ids when RAG is disabled', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages(
          createDefaultHookProps({
            isRagEnabled: false,
          }),
        ),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      expect(result.current.messages).toHaveLength(2); // user + bot (placeholder removed on first send)
      expect(result.current.messages[1]).toMatchObject({
        role: 'bot',
        content: 'This is a bot response',
        name: mockModelId,
      });
      expect(result.current.isMessageSendButtonDisabled).toBe(false);
      expect(mockCreateResponse).toHaveBeenCalledWith(
        {
          input: 'Test message',
          model: 'test-model-id',
          chat_context: [],
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

      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      expect(result.current.messages).toHaveLength(2); // user + error bot (placeholder removed on first send)
      expect(result.current.messages[1]).toMatchObject({
        role: 'bot',
        content: 'API Error',
        name: mockModelId,
      });
      expect(result.current.isMessageSendButtonDisabled).toBe(false);
    });

    it('should re-enable send button even when errors occur', async () => {
      mockCreateResponse.mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

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

      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      expect(result.current.messages).toHaveLength(2); // user + error bot (placeholder removed on first send)
      expect(result.current.messages[1]).toMatchObject({
        role: 'bot',
        content: 'API is not available',
        name: mockModelId,
      });
      expect(result.current.isMessageSendButtonDisabled).toBe(false);
      expect(mockCreateResponse).not.toHaveBeenCalled();
    });

    it('should display error message from streaming error', async () => {
      const customErrorMessage = 'Custom streaming error message';
      mockCreateResponse.mockRejectedValueOnce(new Error(customErrorMessage));

      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      expect(result.current.messages).toHaveLength(2); // user + error bot (placeholder removed on first send)
      expect(result.current.messages[1]).toMatchObject({
        role: 'bot',
        content: customErrorMessage,
        name: mockModelId,
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
        useChatbotMessages(createDefaultHookProps({ isStreamingEnabled: true })),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      // Should have user + bot (placeholder removed; bot updated with error, not added separately)
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1]).toMatchObject({
        role: 'bot',
        content: streamingErrorMessage,
        name: mockModelId,
      });
      expect(result.current.isMessageSendButtonDisabled).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isStreamingWithoutContent).toBe(false);
    });

    it('should use currentVectorStoreId when RAG is enabled', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages(
          createDefaultHookProps({
            currentVectorStoreId: 'vs_current_store_123',
          }),
        ),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      expect(result.current.messages).toHaveLength(2); // user + bot (placeholder removed on first send)
      expect(mockCreateResponse).toHaveBeenCalledWith(
        {
          input: 'Test message',
          model: 'test-model-id',
          vector_store_ids: ['vs_current_store_123'],
          chat_context: [],
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

  describe('conversation context', () => {
    it('should include conversation history in system prompt', async () => {
      mockCreateResponse.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages(
          createDefaultHookProps({ systemInstruction: 'You are a helpful assistant.' }),
        ),
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
      expect(firstCall.chat_context).toHaveLength(0);
      const secondCall = mockCreateResponse.mock.calls[1][0];
      expect(secondCall.chat_context).toHaveLength(2);
      expect(secondCall.chat_context![0]).toMatchObject({
        role: 'user',
        content: 'Hello',
      });
      expect(secondCall.chat_context![1]).toMatchObject({
        role: 'assistant',
        content: 'This is a bot response',
      });
    });

    it('should handle empty system instruction correctly', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      const call = mockCreateResponse.mock.calls[0][0];
      expect(call.instructions).toBe('');
      expect(call.chat_context).toHaveLength(0);
    });

    it('should maintain conversation context when modelId changes', async () => {
      mockCreateResponse.mockResolvedValue(mockSuccessResponse);

      const { result, rerender } = renderHook(
        ({ modelId }) =>
          useChatbotMessages(
            createDefaultHookProps({
              modelId,
              systemInstruction: 'Be helpful.',
            }),
          ),
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

      // Verify conversation context is preserved (placeholder excluded after first send)
      const secondCall = mockCreateResponse.mock.calls[1][0];
      expect(secondCall.chat_context).toHaveLength(2);
      expect(secondCall.chat_context![0]).toMatchObject({
        role: 'user',
        content: 'Hello with model 1',
      });
      expect(secondCall.chat_context![1]).toMatchObject({
        role: 'assistant',
        content: 'This is a bot response',
      });
      expect(secondCall.model).toBe('model-2');
    });

    it('should maintain conversation context when system instruction changes', async () => {
      mockCreateResponse.mockResolvedValue(mockSuccessResponse);

      const { result, rerender } = renderHook(
        ({ systemInstruction }) =>
          useChatbotMessages(
            createDefaultHookProps({
              systemInstruction,
            }),
          ),
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

      // Verify conversation context is preserved (placeholder excluded after first send)
      const secondCall = mockCreateResponse.mock.calls[1][0];
      expect(secondCall.instructions).toBe('Be detailed.');
      expect(secondCall.chat_context).toHaveLength(2);
      expect(secondCall.chat_context![0]).toMatchObject({
        role: 'user',
        content: 'Hello with concise instruction',
      });
      expect(secondCall.chat_context![1]).toMatchObject({
        role: 'assistant',
        content: 'This is a bot response',
      });
    });
  });

  describe('tool response handling', () => {
    it('should create tool response with isDefaultExpanded set to false', async () => {
      const mockResponseWithToolData: SimplifiedResponseData = {
        ...mockSuccessResponse,
        toolCallData: {
          serverLabel: 'MCP Server',
          toolName: 'calculator_tool',
          toolArguments: '{"operation": "add"}',
          toolOutput: '{"result": 8}',
        },
      };

      mockCreateResponse.mockResolvedValueOnce(mockResponseWithToolData);

      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Calculate');
      });

      const botMessage = result.current.messages[1];

      // Verify isDefaultExpanded is set to false (key change)
      expect(botMessage.toolResponse?.isDefaultExpanded).toBe(false);
    });

    it('should create tool response with isDefaultExpanded false in streaming mode', async () => {
      const mockStreamingResponseWithToolData: SimplifiedResponseData = {
        ...mockSuccessResponse,
        toolCallData: {
          serverLabel: 'Streaming Server',
          toolName: 'stream_tool',
          toolArguments: '{"param": "test"}',
          toolOutput: '{"status": "completed"}',
        },
      };

      mockCreateResponse.mockImplementation(
        (request: CreateResponseRequest, opts?: { onStreamData?: (chunk: string) => void }) => {
          if (opts?.onStreamData) {
            opts.onStreamData('Streaming content');
          }
          return Promise.resolve(mockStreamingResponseWithToolData);
        },
      );

      const { result } = renderHook(() =>
        useChatbotMessages(createDefaultHookProps({ isStreamingEnabled: true })),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test streaming');
      });

      const botMessage = result.current.messages[1];

      // Verify isDefaultExpanded is false in streaming mode too
      expect(botMessage.toolResponse?.isDefaultExpanded).toBe(false);
    });
  });

  describe('metrics handling', () => {
    it('should include metrics in non-streaming response', async () => {
      const mockResponseWithMetrics: SimplifiedResponseData = {
        ...mockSuccessResponse,
        metrics: mockMetrics,
      };

      mockCreateResponse.mockResolvedValueOnce(mockResponseWithMetrics);

      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Test message');
      });

      const botMessage = result.current.messages[1];

      expect(botMessage.metrics).toBeDefined();
      expect(botMessage.metrics?.latency_ms).toBe(1500);
      expect(botMessage.metrics?.usage?.total_tokens).toBe(60);
    });

    it('should include metrics in streaming response', async () => {
      const mockStreamingResponseWithMetrics: SimplifiedResponseData = {
        ...mockSuccessResponse,
        metrics: {
          ...mockMetrics,
          time_to_first_token_ms: 200,
        },
      };

      mockCreateResponse.mockImplementation(
        (request: CreateResponseRequest, opts?: { onStreamData?: (chunk: string) => void }) => {
          if (opts?.onStreamData) {
            opts.onStreamData('Streaming content');
          }
          return Promise.resolve(mockStreamingResponseWithMetrics);
        },
      );

      const { result } = renderHook(() =>
        useChatbotMessages(createDefaultHookProps({ isStreamingEnabled: true })),
      );

      await act(async () => {
        await result.current.handleMessageSend('Test streaming');
      });

      const botMessage = result.current.messages[1];

      expect(botMessage.metrics).toBeDefined();
      expect(botMessage.metrics?.latency_ms).toBe(1500);
      expect(botMessage.metrics?.time_to_first_token_ms).toBe(200);
    });
  });

  describe('subscription', () => {
    it('should include subscription in payload when provided', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages(createDefaultHookProps({ subscription: 'premium-subscription' })),
      );

      await act(async () => {
        await result.current.handleMessageSend('Hello with subscription');
      });

      expect(mockCreateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          input: 'Hello with subscription',
          subscription: 'premium-subscription',
        }),
        expect.objectContaining({
          abortSignal: expect.any(Object),
        }),
      );
    });

    it('should omit subscription from payload when not provided', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Hello without subscription');
      });

      const payload = mockCreateResponse.mock.calls[0][0];
      expect(payload).not.toHaveProperty('subscription');
    });

    it('should omit subscription from payload when subscription is empty string', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() =>
        useChatbotMessages(createDefaultHookProps({ subscription: '' })),
      );

      await act(async () => {
        await result.current.handleMessageSend('Hello with empty subscription');
      });

      expect(mockCreateResponse.mock.calls[0][0]).not.toHaveProperty('subscription');
    });
  });

  describe('multimodal input (vision)', () => {
    it('should construct multimodal input when fileId is provided', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Describe this image', undefined, 'file-vision-123');
      });

      const payload = mockCreateResponse.mock.calls[0][0];
      expect(Array.isArray(payload.input)).toBe(true);
      expect(payload.input).toEqual([
        { type: 'input_text', text: 'Describe this image' },
        { type: 'input_image', file_id: 'file-vision-123' },
      ]);
    });

    it('should send only input_image when message text is empty', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('', undefined, 'file-vision-456');
      });

      const payload = mockCreateResponse.mock.calls[0][0];
      expect(payload.input).toEqual([{ type: 'input_image', file_id: 'file-vision-456' }]);
    });

    it('should send plain string input when no fileId is provided', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Plain text message');
      });

      const payload = mockCreateResponse.mock.calls[0][0];
      expect(typeof payload.input).toBe('string');
      expect(payload.input).toBe('Plain text message');
    });

    it('should preserve multimodal content in chat_context for subsequent turns', async () => {
      // Need unique IDs so the multimodalContentRef map distinguishes user vs bot messages
      const mockGetId = jest.requireMock('~/app/utilities/utils').getId as jest.Mock;
      let idCounter = 0;
      mockGetId.mockImplementation(() => `msg-${idCounter++}`);

      try {
        mockCreateResponse.mockResolvedValue(mockSuccessResponse);

        const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

        // First turn: multimodal message with image
        await act(async () => {
          await result.current.handleMessageSend(
            'What is in this image?',
            undefined,
            'file-img-789',
          );
        });

        // Second turn: plain text follow-up
        await act(async () => {
          await result.current.handleMessageSend('Tell me more about it');
        });

        const secondPayload = mockCreateResponse.mock.calls[1][0];
        expect(secondPayload.chat_context).toHaveLength(2);
        expect(secondPayload.chat_context![0]).toMatchObject({
          role: 'user',
          content: [
            { type: 'input_text', text: 'What is in this image?' },
            { type: 'input_image', file_id: 'file-img-789' },
          ],
        });
        expect(secondPayload.chat_context![1]).toMatchObject({
          role: 'assistant',
          content: 'This is a bot response',
        });
      } finally {
        mockGetId.mockImplementation(() => 'mock-id');
      }
    });
  });

  describe('inline image rendering', () => {
    it('should set extraContent.beforeMainContent as img element when imagePreview is provided', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);
      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Describe this image', undefined, 'file-123', {
          previewUrl: 'blob:http://localhost/abc',
          fileName: 'photo.png',
        });
      });

      const userMessage = result.current.messages[0];
      expect(userMessage.role).toBe('user');
      expect(userMessage.content).toBe('Describe this image');
      expect(userMessage.extraContent).toBeDefined();
      expect(React.isValidElement(userMessage.extraContent?.beforeMainContent)).toBe(true);
    });

    it('should not include markdown image syntax in content when imagePreview is provided', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);
      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Describe this image', undefined, 'file-123', {
          previewUrl: 'blob:http://localhost/abc',
          fileName: 'photo.png',
        });
      });

      const userMessage = result.current.messages[0];
      expect(userMessage.content).not.toContain('![');
      expect(userMessage.content).not.toContain('blob:');
    });

    it('should render content as empty string when only an image (no text) is sent', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);
      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('', undefined, 'file-123', {
          previewUrl: 'blob:http://localhost/abc',
          fileName: 'photo.png',
        });
      });

      const userMessage = result.current.messages[0];
      expect(userMessage.role).toBe('user');
      expect(userMessage.content).toBe('');
      expect(React.isValidElement(userMessage.extraContent?.beforeMainContent)).toBe(true);
    });

    it('should set content to text message when both image and text are provided', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);
      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('What is this?', undefined, 'file-123', {
          previewUrl: 'blob:http://localhost/abc',
          fileName: 'photo.png',
        });
      });

      const userMessage = result.current.messages[0];
      expect(userMessage.content).toBe('What is this?');
      expect(React.isValidElement(userMessage.extraContent?.beforeMainContent)).toBe(true);
    });

    it('should not set extraContent when no imagePreview is provided', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);
      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Hello, bot!');
      });

      const userMessage = result.current.messages[0];
      expect(userMessage.content).toBe('Hello, bot!');
      expect(userMessage.extraContent).toBeUndefined();
    });
  });

  describe('thinking collapsible (non-streaming)', () => {
    it('should set extraContent.beforeMainContent on bot message when reasoningContent exists', async () => {
      const responseWithReasoning: SimplifiedResponseData = {
        ...mockSuccessResponse,
        reasoningContent: 'I need to think about this step by step...',
      };
      mockCreateResponse.mockResolvedValueOnce(responseWithReasoning);
      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Solve this puzzle');
      });

      const botMessage = result.current.messages[1];
      expect(botMessage.role).toBe('bot');
      expect(botMessage.extraContent).toBeDefined();
      expect(botMessage.extraContent?.beforeMainContent).toBeDefined();
      expect(botMessage.deepThinking).toBeUndefined();
    });

    it('should not set extraContent.beforeMainContent when no reasoningContent exists', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);
      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Hello');
      });

      const botMessage = result.current.messages[1];
      expect(botMessage.role).toBe('bot');
      expect(botMessage.extraContent?.beforeMainContent).toBeUndefined();
      expect(botMessage.deepThinking).toBeUndefined();
    });
  });

  describe('streaming thinking collapsible', () => {
    it('should show reasoning in extraContent.beforeMainContent during streaming (not in content)', async () => {
      mockCreateResponse.mockImplementation(
        (
          _request: CreateResponseRequest,
          opts?: {
            onStreamData?: (chunk: string, clearPrevious?: boolean, isReasoning?: boolean) => void;
            abortSignal?: AbortSignal;
          },
        ) => {
          if (opts?.onStreamData) {
            opts.onStreamData('Let me think about this\n', false, true);
            opts.onStreamData('Step 1: analyze\n', false, true);
            opts.onStreamData('The answer is 42', false, false);
          }
          return Promise.resolve({
            ...mockSuccessResponse,
            content: 'The answer is 42',
            reasoningContent: 'Let me think about this\nStep 1: analyze',
          });
        },
      );

      const { result } = renderHook(() =>
        useChatbotMessages(createDefaultHookProps({ isStreamingEnabled: true })),
      );

      await act(async () => {
        await result.current.handleMessageSend('What is the meaning of life?');
      });

      const botMessage = result.current.messages[1];
      expect(botMessage.role).toBe('bot');
      expect(botMessage.extraContent?.beforeMainContent).toBeDefined();
      expect(React.isValidElement(botMessage.extraContent?.beforeMainContent)).toBe(true);
      expect(botMessage.deepThinking).toBeUndefined();
    });

    it('should include final answer in content after reasoning completes', async () => {
      mockCreateResponse.mockImplementation(
        (
          _request: CreateResponseRequest,
          opts?: {
            onStreamData?: (chunk: string, clearPrevious?: boolean, isReasoning?: boolean) => void;
            abortSignal?: AbortSignal;
          },
        ) => {
          if (opts?.onStreamData) {
            opts.onStreamData('thinking...\n', false, true);
            opts.onStreamData('The answer is 42', false, false);
          }
          return Promise.resolve({
            ...mockSuccessResponse,
            content: 'The answer is 42',
            reasoningContent: 'thinking...',
          });
        },
      );

      const { result } = renderHook(() =>
        useChatbotMessages(createDefaultHookProps({ isStreamingEnabled: true })),
      );

      await act(async () => {
        await result.current.handleMessageSend('Question');
      });

      const botMessage = result.current.messages[1];
      expect(botMessage.content).toBe('The answer is 42');
      expect(botMessage.extraContent?.beforeMainContent).toBeDefined();
    });

    it('should handle responses with no reasoning (direct answer)', async () => {
      mockCreateResponse.mockImplementation(
        (
          _request: CreateResponseRequest,
          opts?: {
            onStreamData?: (chunk: string, clearPrevious?: boolean, isReasoning?: boolean) => void;
            abortSignal?: AbortSignal;
          },
        ) => {
          if (opts?.onStreamData) {
            opts.onStreamData('Hello! How can I help?', false, false);
          }
          return Promise.resolve({
            ...mockSuccessResponse,
            content: 'Hello! How can I help?',
          });
        },
      );

      const { result } = renderHook(() =>
        useChatbotMessages(createDefaultHookProps({ isStreamingEnabled: true })),
      );

      await act(async () => {
        await result.current.handleMessageSend('Hi');
      });

      const botMessage = result.current.messages[1];
      expect(botMessage.content).toBe('Hello! How can I help?');
      expect(botMessage.extraContent?.beforeMainContent).toBeUndefined();
    });

    it('should handle responses with only reasoning (no answer tokens)', async () => {
      mockCreateResponse.mockImplementation(
        (
          _request: CreateResponseRequest,
          opts?: {
            onStreamData?: (chunk: string, clearPrevious?: boolean, isReasoning?: boolean) => void;
            abortSignal?: AbortSignal;
          },
        ) => {
          if (opts?.onStreamData) {
            opts.onStreamData('Deep thoughts...\n', false, true);
          }
          return Promise.resolve({
            ...mockSuccessResponse,
            content: '',
            reasoningContent: 'Deep thoughts...',
          });
        },
      );

      const { result } = renderHook(() =>
        useChatbotMessages(createDefaultHookProps({ isStreamingEnabled: true })),
      );

      await act(async () => {
        await result.current.handleMessageSend('Think');
      });

      const botMessage = result.current.messages[1];
      expect(botMessage.extraContent?.beforeMainContent).toBeDefined();
    });
  });

  describe('reasoning effort in payload', () => {
    it('reasoning field is never sent in request payload', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);
      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Hello');
      });

      const payload = mockCreateResponse.mock.calls[0][0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((payload as any).reasoning).toBeUndefined();
    });
  });

  describe('inline document chips in sent message', () => {
    it('should set extraContent.afterMainContent when docAttachments are provided', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);
      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend(
          'Check these files',
          undefined,
          undefined,
          undefined,
          ['PR_STYLE_GUIDE.md', 'rag-testing.txt'],
        );
      });

      const userMessage = result.current.messages[0];
      expect(userMessage.role).toBe('user');
      expect(userMessage.content).toBe('Check these files');
      expect(userMessage.extraContent).toBeDefined();
      expect(React.isValidElement(userMessage.extraContent?.afterMainContent)).toBe(true);
    });

    it('should not set extraContent.afterMainContent when no docAttachments are provided', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);
      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Hello without docs');
      });

      const userMessage = result.current.messages[0];
      expect(userMessage.extraContent).toBeUndefined();
    });

    it('should not set afterMainContent when docAttachments is empty array', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);
      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('No docs', undefined, undefined, undefined, []);
      });

      const userMessage = result.current.messages[0];
      expect(userMessage.extraContent).toBeUndefined();
    });

    it('should set both beforeMainContent and afterMainContent when image and docs are provided', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);
      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend(
          'Image and docs',
          undefined,
          'file-123',
          { previewUrl: 'blob:http://localhost/abc', fileName: 'photo.png' },
          ['report.pdf'],
        );
      });

      const userMessage = result.current.messages[0];
      expect(userMessage.extraContent).toBeDefined();
      expect(React.isValidElement(userMessage.extraContent?.beforeMainContent)).toBe(true);
      expect(React.isValidElement(userMessage.extraContent?.afterMainContent)).toBe(true);
    });

    it('should create FileDetailsLabel elements with correct fileName and hasTruncation for each attachment', async () => {
      const { FileDetailsLabel } = require('@patternfly/chatbot');

      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);
      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Files here', undefined, undefined, undefined, [
          'report.pdf',
          'data.csv',
        ]);
      });

      const wrapper = result.current.messages[0].extraContent
        ?.afterMainContent as React.ReactElement;
      const children = wrapper.props.children as React.ReactElement[];
      expect(children).toHaveLength(2);
      expect(children[0].type).toBe(FileDetailsLabel);
      expect(children[0].props).toEqual(
        expect.objectContaining({ fileName: 'report.pdf', hasTruncation: true }),
      );
      expect(children[1].type).toBe(FileDetailsLabel);
      expect(children[1].props).toEqual(
        expect.objectContaining({ fileName: 'data.csv', hasTruncation: true }),
      );
    });

    it('should create exactly N FileDetailsLabel elements for N doc attachments', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);
      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Three docs', undefined, undefined, undefined, [
          'a.pdf',
          'b.txt',
          'c.csv',
        ]);
      });

      const wrapper = result.current.messages[0].extraContent
        ?.afterMainContent as React.ReactElement;
      const children = wrapper.props.children as React.ReactElement[];
      expect(children).toHaveLength(3);
    });

    it('afterMainContent wrapper div has correct flex styles', async () => {
      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);
      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Check styles', undefined, undefined, undefined, [
          'doc.pdf',
        ]);
      });

      const userMessage = result.current.messages[0];
      const wrapper = userMessage.extraContent?.afterMainContent as React.ReactElement;
      expect(wrapper.type).toBe('div');
      expect(wrapper.props.style).toEqual({
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        marginTop: '0.5rem',
      });
    });

    it('works correctly with a single doc attachment', async () => {
      const { FileDetailsLabel } = require('@patternfly/chatbot');

      mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);
      const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

      await act(async () => {
        await result.current.handleMessageSend('Single doc', undefined, undefined, undefined, [
          'only-one.pdf',
        ]);
      });

      const userMessage = result.current.messages[0];
      expect(userMessage.extraContent).toBeDefined();
      expect(React.isValidElement(userMessage.extraContent?.afterMainContent)).toBe(true);

      const wrapper = userMessage.extraContent?.afterMainContent as React.ReactElement;
      // With React.createElement spread args, single child is in props.children
      const children = Array.isArray(wrapper.props.children)
        ? wrapper.props.children
        : [wrapper.props.children];
      expect(children).toHaveLength(1);
      expect(children[0].type).toBe(FileDetailsLabel);
      expect(children[0].props).toEqual(
        expect.objectContaining({ fileName: 'only-one.pdf', hasTruncation: true }),
      );
    });
  });
});
