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
  streamingCompletedEventWithAnnotations,
  streamingCompletedEventWithMultipleTokens,
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

  it('should extract sources from annotations in non-streaming response', async () => {
    mockedRestCREATE.mockResolvedValueOnce({ data: responseWithAnnotations });

    const result = await createResponse(URL_PREFIX, { namespace: testNamespace })(mockRequest);

    expect(result.content).toBe('Here is information from the document.');
    expect(result.sources).toHaveLength(1);
    expect(result.sources![0]).toMatchObject({
      title: 'report.pdf',
      link: '#',
    });
  });

  it('should remove inline file citation tokens from content', async () => {
    mockedRestCREATE.mockResolvedValueOnce({ data: responseWithInlineTokens });

    const result = await createResponse(URL_PREFIX, { namespace: testNamespace })(mockRequest);

    // Token should be removed from content
    expect(result.content).toBe('Here is the info .');
    expect(result.content).not.toContain('<|file-');
    expect(result.sources).toHaveLength(1);
    expect(result.sources![0].title).toBe('document.pdf');
  });

  it('should handle multiple sources and deduplicate by filename', async () => {
    mockedRestCREATE.mockResolvedValueOnce({ data: responseWithMultipleSources });

    const result = await createResponse(URL_PREFIX, { namespace: testNamespace })(mockRequest);

    expect(result.content).toBe('Information from multiple sources.');
    expect(result.sources).toHaveLength(2); // Deduplicated
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

    // Simulate streaming with annotations in completed response
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

  it('should remove multiple file citation tokens from streaming content', async () => {
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
            'data: {"delta": "Info from <|file-aaa111|> and <|file-bbb222|>.", "type": "response.output_text.delta"}\n',
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

    // Both tokens should be removed
    expect(result.content).not.toContain('<|file-');
    expect(result.content).toBe('Info from  and .');
    expect(result.sources).toHaveLength(2);
  });
});
