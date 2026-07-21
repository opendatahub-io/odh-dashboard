import * as React from 'react';
import { renderHook, act } from '@testing-library/react';
import useChatbotMessages from '~/app/Chatbot/hooks/useChatbotMessages';
import { CreateResponseRequest, FileCitationAnnotation, SimplifiedResponseData } from '~/app/types';
import { mockModelId, mockSuccessResponse, mockNamespace, defaultMcpProps } from './consts';

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

const mockAnnotations: FileCitationAnnotation[] = [
  // eslint-disable-next-line camelcase
  { type: 'file_citation', file_id: 'report.pdf', filename: 'report.pdf', index: 30 },
  // eslint-disable-next-line camelcase
  { type: 'file_citation', file_id: 'manual.pdf', filename: 'manual.pdf', index: 60 },
];

describe('useChatbotMessages - citations handling', () => {
  beforeEach(() => {
    setupMocks();
  });

  it('should include annotations and citationMap in bot message from non-streaming response', async () => {
    const citationMap = new Map([
      ['report.pdf', 1],
      ['manual.pdf', 2],
    ]);
    const mockResponseWithAnnotations: SimplifiedResponseData = {
      ...mockSuccessResponse,
      content: 'Here is information from {{citation:1}} the document {{citation:2}}.',
      annotations: mockAnnotations,
      citationMap,
    };

    mockCreateResponse.mockResolvedValueOnce(mockResponseWithAnnotations);

    const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

    await act(async () => {
      await result.current.handleMessageSend('Tell me about the document');
    });

    const botMessage = result.current.messages[1];

    expect(botMessage.annotations).toBeDefined();
    expect(botMessage.annotations).toHaveLength(2);
    expect(botMessage.citationMap).toBeDefined();
    expect(botMessage.citationMap?.get('report.pdf')).toBe(1);
    expect(botMessage.citationMap?.get('manual.pdf')).toBe(2);
  });

  it('should not include annotations when response has no citations', async () => {
    mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);

    const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

    await act(async () => {
      await result.current.handleMessageSend('Hello');
    });

    const botMessage = result.current.messages[1];

    expect(botMessage.annotations).toBeUndefined();
    expect(botMessage.citationMap).toBeUndefined();
  });

  it('should include annotations in streaming response', async () => {
    const citationMap = new Map([['streaming-doc.pdf', 1]]);
    const mockStreamingResponseWithAnnotations: SimplifiedResponseData = {
      ...mockSuccessResponse,
      content: 'Streamed content with source {{citation:1}}.',
      annotations: [
        {
          type: 'file_citation',
          file_id: 'streaming-doc.pdf', // eslint-disable-line camelcase
          filename: 'streaming-doc.pdf',
          index: 28,
        },
      ],
      citationMap,
    };

    mockCreateResponse.mockImplementation(
      (request: CreateResponseRequest, opts?: { onStreamData?: (chunk: string) => void }) => {
        if (opts?.onStreamData) {
          opts.onStreamData('Streamed content with source.');
        }
        return Promise.resolve(mockStreamingResponseWithAnnotations);
      },
    );

    const { result } = renderHook(() =>
      useChatbotMessages(createDefaultHookProps({ isStreamingEnabled: true })),
    );

    await act(async () => {
      await result.current.handleMessageSend('Stream with sources');
    });

    const botMessage = result.current.messages[1];

    expect(botMessage.annotations).toBeDefined();
    expect(botMessage.annotations).toHaveLength(1);
    expect(botMessage.citationMap?.get('streaming-doc.pdf')).toBe(1);
  });

  it('should not include annotations for error responses', async () => {
    mockCreateResponse.mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

    await act(async () => {
      await result.current.handleMessageSend('This will fail');
    });

    const botMessage = result.current.messages[1];

    expect(botMessage.content).toBe(''); // Error shown via errorClassification
    expect(botMessage.errorClassification).toBeDefined();
    expect(botMessage.sources).toBeUndefined();
    expect(botMessage.annotations).toBeUndefined();
    expect(botMessage.citationMap).toBeUndefined();
  });

  it('should not pass sources prop to message even when response contains sources', async () => {
    const mockResponseWithSources: SimplifiedResponseData = {
      ...mockSuccessResponse,
      content: 'Response with sources.',
      sources: [{ title: 'doc.pdf', link: '' }],
      fileSearchData: {
        queries: ['test'],
        results: [
          // eslint-disable-next-line camelcase
          { score: 0.9, text: 'chunk', file_id: 'f1', filename: 'doc.pdf' },
        ],
      },
    };

    mockCreateResponse.mockResolvedValueOnce(mockResponseWithSources);

    const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

    await act(async () => {
      await result.current.handleMessageSend('Query');
    });

    const botMessage = result.current.messages[1];

    // Sources prop should not be set — file search results are shown via fileSearchData instead
    expect(botMessage.sources).toBeUndefined();
    expect(botMessage.fileSearchData).toBeDefined();
    expect(botMessage.fileSearchData!.results).toHaveLength(1);
  });

  it('should include fileSearchData in bot message when present in response', async () => {
    const fileSearchData = {
      queries: ['test query'],
      results: [
        // eslint-disable-next-line camelcase
        { score: 0.9, text: 'chunk text', file_id: 'f1', filename: 'doc.pdf' },
      ],
    };
    const mockResponseWithFileSearch: SimplifiedResponseData = {
      ...mockSuccessResponse,
      content: 'Response with file search.',
      fileSearchData,
    };

    mockCreateResponse.mockResolvedValueOnce(mockResponseWithFileSearch);

    const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

    await act(async () => {
      await result.current.handleMessageSend('Search query');
    });

    const botMessage = result.current.messages[1];

    expect(botMessage.fileSearchData).toBeDefined();
    expect(botMessage.fileSearchData!.queries).toEqual(['test query']);
    expect(botMessage.fileSearchData!.results).toHaveLength(1);
    expect(botMessage.fileSearchData!.results[0].filename).toBe('doc.pdf');
  });

  it('should not include fileSearchData when response has none', async () => {
    mockCreateResponse.mockResolvedValueOnce(mockSuccessResponse);

    const { result } = renderHook(() => useChatbotMessages(createDefaultHookProps()));

    await act(async () => {
      await result.current.handleMessageSend('Plain query');
    });

    const botMessage = result.current.messages[1];

    expect(botMessage.fileSearchData).toBeUndefined();
  });

  it('should include fileSearchData in streaming response', async () => {
    const fileSearchData = {
      queries: ['streaming query'],
      results: [
        // eslint-disable-next-line camelcase
        { score: 0.85, text: 'streamed chunk', file_id: 'sf1', filename: 'stream.pdf' },
      ],
    };
    const mockStreamingResponseWithSearch: SimplifiedResponseData = {
      ...mockSuccessResponse,
      content: 'Streamed content with search.',
      fileSearchData,
    };

    mockCreateResponse.mockImplementation(
      (_request: CreateResponseRequest, opts?: { onStreamData?: (data: string) => void }) => {
        if (opts?.onStreamData) {
          opts.onStreamData('Streamed content with search.');
        }
        return Promise.resolve(mockStreamingResponseWithSearch);
      },
    );

    const { result } = renderHook(() =>
      useChatbotMessages(createDefaultHookProps({ isStreamingEnabled: true })),
    );

    await act(async () => {
      await result.current.handleMessageSend('Stream search');
    });

    const botMessage = result.current.messages[1];

    expect(botMessage.fileSearchData).toBeDefined();
    expect(botMessage.fileSearchData!.queries).toEqual(['streaming query']);
    expect(botMessage.fileSearchData!.results[0].filename).toBe('stream.pdf');
  });
});
