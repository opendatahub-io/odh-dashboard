import * as React from 'react';
import { renderHook, act } from '@testing-library/react';
import useChatbotMessages from '~/app/Chatbot/hooks/useChatbotMessages';
import { CreateResponseRequest, SimplifiedResponseData, ChatbotSourceSettings } from '~/app/types';
import {
  mockModelId,
  mockSourceSettings,
  mockSuccessResponse,
  mockNamespace,
  defaultMcpProps,
} from './consts';

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

describe('useChatbotMessages - sources handling', () => {
  beforeEach(() => {
    setupMocks();
  });

  it('should include sources in bot message from non-streaming response', async () => {
    const mockResponseWithSources: SimplifiedResponseData = {
      ...mockSuccessResponse,
      content: 'Here is information from the document.',
      sources: [
        { title: 'report.pdf', link: '#', hasShowMore: false },
        { title: 'manual.pdf', link: '#', hasShowMore: false },
      ],
    };

    mockCreateResponse.mockResolvedValueOnce(mockResponseWithSources);

    const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

    await act(async () => {
      await result.current.handleMessageSend('Tell me about the document');
    });

    const botMessage = result.current.messages[2];

    expect(botMessage.content).toBe('Here is information from the document.');
    expect(botMessage.sources).toBeDefined();
    expect(botMessage.sources?.sources).toHaveLength(2);
    expect(botMessage.sources?.sources[0].title).toBe('report.pdf');
    expect(botMessage.sources?.sources[1].title).toBe('manual.pdf');
  });

  it('should include onClick handler on sources to prevent navigation', async () => {
    const mockResponseWithSources: SimplifiedResponseData = {
      ...mockSuccessResponse,
      content: 'Response with source.',
      sources: [{ title: 'doc.pdf', link: '#', hasShowMore: false }],
    };

    mockCreateResponse.mockResolvedValueOnce(mockResponseWithSources);

    const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

    await act(async () => {
      await result.current.handleMessageSend('Get info');
    });

    const botMessage = result.current.messages[2];

    expect(botMessage.sources?.sources[0].onClick).toBeDefined();
    expect(typeof botMessage.sources?.sources[0].onClick).toBe('function');
  });

  it('should not include sources in bot message when response has no sources', async () => {
    mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);

    const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

    await act(async () => {
      await result.current.handleMessageSend('Hello');
    });

    const botMessage = result.current.messages[2];

    expect(botMessage.sources).toBeUndefined();
  });

  it('should include sources in streaming response', async () => {
    const mockStreamingResponseWithSources: SimplifiedResponseData = {
      ...mockSuccessResponse,
      content: 'Streamed content with source.',
      sources: [{ title: 'streaming-doc.pdf', link: '#', hasShowMore: false }],
    };

    mockCreateResponse.mockImplementation(
      (request: CreateResponseRequest, opts?: { onStreamData?: (chunk: string) => void }) => {
        if (opts?.onStreamData) {
          opts.onStreamData('Streamed content with source.');
        }
        return Promise.resolve(mockStreamingResponseWithSources);
      },
    );

    const { result } = renderHook(() =>
      useChatbotMessages(createDefaultHookProps({ isStreamingEnabled: true })),
    );

    await act(async () => {
      await result.current.handleMessageSend('Stream with sources');
    });

    const botMessage = result.current.messages[2];

    expect(botMessage.content).toBe('Streamed content with source.');
    expect(botMessage.sources).toBeDefined();
    expect(botMessage.sources?.sources).toHaveLength(1);
    expect(botMessage.sources?.sources[0].title).toBe('streaming-doc.pdf');
  });

  it('should handle multiple sources correctly', async () => {
    const mockResponseWithMultipleSources: SimplifiedResponseData = {
      ...mockSuccessResponse,
      content: 'Multi-source response.',
      sources: [
        { title: 'source1.pdf', link: '#', hasShowMore: false },
        { title: 'source2.docx', link: '#', hasShowMore: false },
        { title: 'source3.txt', link: '#', hasShowMore: false },
      ],
    };

    mockCreateResponse.mockResolvedValueOnce(mockResponseWithMultipleSources);

    const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

    await act(async () => {
      await result.current.handleMessageSend('Multiple sources query');
    });

    const botMessage = result.current.messages[2];

    expect(botMessage.sources?.sources).toHaveLength(3);
    const titles = botMessage.sources?.sources.map((s) => s.title);
    expect(titles).toContain('source1.pdf');
    expect(titles).toContain('source2.docx');
    expect(titles).toContain('source3.txt');
  });

  it('should not include sources for error responses', async () => {
    mockCreateResponse.mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

    await act(async () => {
      await result.current.handleMessageSend('This will fail');
    });

    const botMessage = result.current.messages[2];

    expect(botMessage.content).toBe('API Error');
    expect(botMessage.sources).toBeUndefined();
  });

  it('should handle empty sources array (no sources in response)', async () => {
    const mockResponseWithEmptySources: SimplifiedResponseData = {
      ...mockSuccessResponse,
      content: 'Response with no actual sources.',
      sources: [],
    };

    mockCreateResponse.mockResolvedValueOnce(mockResponseWithEmptySources);

    const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

    await act(async () => {
      await result.current.handleMessageSend('Query');
    });

    const botMessage = result.current.messages[2];

    // Empty sources array should not create sources prop
    expect(botMessage.sources).toBeUndefined();
  });
});
