/* eslint-disable camelcase */
import { createResponse } from '~/app/services/llamaStackService';
import { URL_PREFIX } from '~/app/utilities';
import { CreateResponseRequest } from '~/app/types';
import {
  mockRequest,
  responseWithAnnotations,
  responseWithInlineTokens,
  responseWithMultipleSources,
  responseWithoutAnnotations,
  responseWithFileSearchCall,
  streamingCompletedEventWithAnnotations,
  streamingCompletedEventWithMultipleTokens,
  streamingCompletedEventWithFileSearchCall,
} from './fileCitationHandling.fixtures';

// Mock mod-arch-core
jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  restGET: jest.fn(),
  restCREATE: jest.fn(),
  restDELETE: jest.fn(),
}));

const { restCREATE } = jest.requireMock('mod-arch-core');
const mockedRestCREATE = restCREATE as jest.Mock;

// Mock fetch for streaming tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('file citation handling', () => {
  const testNamespace = 'test-namespace';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    mockedRestCREATE.mockClear();
  });

  it('should extract sources from BFF-provided annotations in non-streaming response', async () => {
    mockedRestCREATE.mockResolvedValueOnce({ data: responseWithAnnotations });

    const result = await createResponse(URL_PREFIX, { namespace: testNamespace })(mockRequest);

    expect(result.content).toBe('Here is information from the document.');
    expect(result.sources).toHaveLength(1);
    expect(result.sources![0]).toMatchObject({
      title: 'report.pdf',
      link: '#',
    });
  });

  it('should read BFF-cleaned text without citation tokens', async () => {
    mockedRestCREATE.mockResolvedValueOnce({ data: responseWithInlineTokens });

    const result = await createResponse(URL_PREFIX, { namespace: testNamespace })(mockRequest);

    expect(result.content).toBe('Here is the info .');
    expect(result.content).not.toContain('<|');
    expect(result.sources).toHaveLength(1);
    expect(result.sources![0].title).toBe('document.pdf');
  });

  it('should handle multiple sources and deduplicate by filename', async () => {
    mockedRestCREATE.mockResolvedValueOnce({ data: responseWithMultipleSources });

    const result = await createResponse(URL_PREFIX, { namespace: testNamespace })(mockRequest);

    expect(result.content).toBe('Information from multiple sources.');
    expect(result.sources).toHaveLength(2);
    const filenames = result.sources!.map((s) => s.title);
    expect(filenames).toContain('report1.pdf');
    expect(filenames).toContain('report2.pdf');
  });

  it('should return undefined sources when no annotations exist', async () => {
    mockedRestCREATE.mockResolvedValueOnce({ data: responseWithoutAnnotations });

    const result = await createResponse(URL_PREFIX, { namespace: testNamespace })(mockRequest);

    expect(result.content).toBe('Plain response without sources.');
    expect(result.sources).toBeUndefined();
  });

  it('should extract sources from streaming response annotations', async () => {
    const streamingRequest: CreateResponseRequest = {
      ...mockRequest,
      stream: true,
    };
    const mockStreamData = jest.fn();

    const mockReader = {
      read: jest
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            'data: {"delta": "Here is the info", "type": "response.output_text.delta"}\n',
          ),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(`data: ${streamingCompletedEventWithAnnotations}\n`),
        })
        .mockResolvedValueOnce({
          done: true,
          value: undefined,
        }),
      releaseLock: jest.fn(),
    };

    const mockResponse = {
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    };

    mockFetch.mockResolvedValueOnce(mockResponse);

    const result = await createResponse(URL_PREFIX, { namespace: testNamespace })(
      streamingRequest,
      { onStreamData: mockStreamData },
    );

    expect(result.content).toBe('Here is the info');
    expect(result.sources).toHaveLength(1);
    expect(result.sources![0].title).toBe('streaming-doc.pdf');
  });

  it('should read BFF-cleaned text in streaming response with multiple sources', async () => {
    const streamingRequest: CreateResponseRequest = {
      ...mockRequest,
      stream: true,
    };
    const mockStreamData = jest.fn();

    const mockReader = {
      read: jest
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            'data: {"delta": "Info from  and .", "type": "response.output_text.delta"}\n',
          ),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(`data: ${streamingCompletedEventWithMultipleTokens}\n`),
        })
        .mockResolvedValueOnce({
          done: true,
          value: undefined,
        }),
      releaseLock: jest.fn(),
    };

    const mockResponse = {
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    };

    mockFetch.mockResolvedValueOnce(mockResponse);

    const result = await createResponse(URL_PREFIX, { namespace: testNamespace })(
      streamingRequest,
      { onStreamData: mockStreamData },
    );

    expect(result.content).not.toContain('<|');
    expect(result.content).toBe('Info from  and .');
    expect(result.sources).toHaveLength(2);
  });

  it('should extract sources from BFF-processed file_search_call response (OGX 1.0.0)', async () => {
    mockedRestCREATE.mockResolvedValueOnce({ data: responseWithFileSearchCall });

    const result = await createResponse(URL_PREFIX, { namespace: testNamespace })(mockRequest);

    expect(result.content).toBe('Here is the answer.');
    expect(result.content).not.toContain('<|');
    expect(result.sources).toHaveLength(1);
    expect(result.sources![0].title).toBe('rag-testing-story.txt');
  });

  it('should extract sources from BFF-processed streaming file_search_call (OGX 1.0.0)', async () => {
    const streamingRequest: CreateResponseRequest = {
      ...mockRequest,
      stream: true,
    };
    const mockStreamData = jest.fn();

    const mockReader = {
      read: jest
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            'data: {"delta": "Here is the answer.", "type": "response.output_text.delta"}\n',
          ),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(`data: ${streamingCompletedEventWithFileSearchCall}\n`),
        })
        .mockResolvedValueOnce({
          done: true,
          value: undefined,
        }),
      releaseLock: jest.fn(),
    };

    const mockResponse = {
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    };

    mockFetch.mockResolvedValueOnce(mockResponse);

    const result = await createResponse(URL_PREFIX, { namespace: testNamespace })(
      streamingRequest,
      { onStreamData: mockStreamData },
    );

    expect(result.content).not.toContain('<|');
    expect(result.sources).toHaveLength(1);
    expect(result.sources![0].title).toBe('rag-testing-story.txt');
  });
});
