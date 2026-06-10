/* eslint-disable camelcase */
import {
  getLSDModels,
  listVectorStores,
  createVectorStore,
  uploadSource,
  createResponse,
  createPassthroughResponse,
  exportCode,
  getLSDStatus,
  installLSD,
  deleteLSD,
  getMaaSModels,
  getAAModels,
  getMCPServers,
  getMCPServerStatus,
  getMCPServerTools,
  looksLikeRawToolCall,
  RAW_TOOL_CALL_WARNING,
  uploadMediaFile,
  transcribeAudio,
} from '~/app/services/llamaStackService';
import { URL_PREFIX } from '~/app/utilities';
import { mockLlamaModels } from '~/__mocks__/mockLlamaStackModels';
import { mockVectorStores } from '~/__mocks__/mockVectorStores';
import { mockLlamaStackDistribution } from '~/__mocks__/mockLlamaStackDistribution';
import {
  TEST_NAMESPACE,
  mockCreateResponseRequest,
  mockBackendResponse,
  expectedSimplifiedResponse,
  mockStreamingRequest,
  mockUploadResult,
  mockCodeExportRequest,
  mockCodeExportResponseData,
  mockInstallModels,
  mockMaaSModelsForInstall,
  mockMaaSModels,
  mockAAModels,
  mockMCPServers,
  mockEmptyMCPServers,
  MOCK_MCP_SERVER_URL,
  mockMCPConnectionStatus,
  mockMCPConnectionErrorStatus,
  mockMCPTools,
} from './llamaStackService.fixtures';

// Mock mod-arch-core
jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  restGET: jest.fn(),
  restCREATE: jest.fn(),
  restDELETE: jest.fn(),
}));

const { restGET, restCREATE, restDELETE } = jest.requireMock('mod-arch-core');
const mockedRestGET = restGET as jest.Mock;
const mockedRestCREATE = restCREATE as jest.Mock;
const mockedRestDELETE = restDELETE as jest.Mock;

// Mock fetch for streaming tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('llamaStackService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    mockedRestGET.mockClear();
    mockedRestCREATE.mockClear();
    mockedRestDELETE.mockClear();
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getModels', () => {
    it('should fetch models successfully', async () => {
      mockedRestGET.mockResolvedValueOnce({ data: mockLlamaModels });

      const result = await getLSDModels(URL_PREFIX, { namespace: TEST_NAMESPACE })();

      expect(result).toEqual(mockLlamaModels);
      expect(mockedRestGET).toHaveBeenCalledWith(
        URL_PREFIX,
        '/lsd/models',
        expect.objectContaining({ namespace: TEST_NAMESPACE }),
        {},
      );
    });

    it('should handle API error with error message', async () => {
      const mockError = new Error('Models not found');
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(getLSDModels(URL_PREFIX, { namespace: TEST_NAMESPACE })()).rejects.toThrow();
    });

    it('should handle network error', async () => {
      const mockError = new Error('Network error');
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(getLSDModels(URL_PREFIX, { namespace: TEST_NAMESPACE })()).rejects.toThrow();
    });

    it('should handle error without response', async () => {
      const mockError = new Error('Failed to fetch models');
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(getLSDModels(URL_PREFIX, { namespace: TEST_NAMESPACE })()).rejects.toThrow();
    });
  });

  describe('getVectorStores', () => {
    it('should fetch vector stores successfully', async () => {
      mockedRestGET.mockResolvedValueOnce({ data: mockVectorStores });

      const result = await listVectorStores(URL_PREFIX, { namespace: TEST_NAMESPACE })();

      expect(result).toEqual(mockVectorStores);
      expect(mockedRestGET).toHaveBeenCalledWith(
        URL_PREFIX,
        '/lsd/vectorstores',
        expect.objectContaining({ namespace: TEST_NAMESPACE }),
        {},
      );
    });

    it('should handle API error with error message', async () => {
      const mockError = new Error('Vector stores not found');
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(listVectorStores(URL_PREFIX, { namespace: TEST_NAMESPACE })()).rejects.toThrow();
    });

    it('should handle error without response', async () => {
      const mockError = new Error('Failed to fetch vector stores');
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(listVectorStores(URL_PREFIX, { namespace: TEST_NAMESPACE })()).rejects.toThrow();
    });
  });

  describe('createVectorStore', () => {
    const vectorName = 'test-vector-store';

    it('should create vector store successfully', async () => {
      mockedRestCREATE.mockResolvedValueOnce({ data: mockVectorStores[0] });

      const result = await createVectorStore(URL_PREFIX, { namespace: TEST_NAMESPACE })({
        name: vectorName,
      });

      expect(result).toEqual(mockVectorStores[0]);
      expect(mockedRestCREATE).toHaveBeenCalledWith(
        URL_PREFIX,
        '/lsd/vectorstores',
        { name: vectorName },
        expect.objectContaining({ namespace: TEST_NAMESPACE }),
        {},
      );
    });

    it('should handle API error with error message', async () => {
      const mockError = new Error('Vector store creation failed');
      mockedRestCREATE.mockRejectedValueOnce(mockError);

      await expect(
        createVectorStore(URL_PREFIX, { namespace: TEST_NAMESPACE })({ name: vectorName }),
      ).rejects.toThrow();
    });

    it('should handle error without response', async () => {
      const mockError = new Error('Failed to create vector store');
      mockedRestCREATE.mockRejectedValueOnce(mockError);

      await expect(
        createVectorStore(URL_PREFIX, { namespace: TEST_NAMESPACE })({ name: vectorName }),
      ).rejects.toThrow();
    });
  });

  describe('uploadSource', () => {
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

    it('should upload source successfully with all settings', async () => {
      mockedRestCREATE.mockResolvedValueOnce({ data: mockUploadResult });

      const formData = new FormData();
      formData.append('file', mockFile);
      formData.append('chunk_overlap_tokens', '100');
      formData.append('max_chunk_size_tokens', '1000');
      formData.append('vector_store_id', 'test-vector-store');

      const result = await uploadSource(URL_PREFIX, { namespace: TEST_NAMESPACE })(formData);

      expect(result).toEqual(mockUploadResult);
      expect(mockedRestCREATE).toHaveBeenCalledWith(
        URL_PREFIX,
        '/lsd/files/upload',
        expect.any(FormData),
        expect.objectContaining({ namespace: TEST_NAMESPACE }),
        {},
      );

      // Verify FormData content
      const formDataCall = mockedRestCREATE.mock.calls[0][2] as FormData;
      expect(formDataCall.get('file')).toBe(mockFile);
      expect(formDataCall.get('chunk_overlap_tokens')).toBe('100');
      expect(formDataCall.get('max_chunk_size_tokens')).toBe('1000');
      expect(formDataCall.get('vector_store_id')).toBe('test-vector-store');
    });

    it('should upload source successfully with minimal settings', async () => {
      mockedRestCREATE.mockResolvedValueOnce({ data: mockUploadResult });

      const formData = new FormData();
      formData.append('file', mockFile);
      formData.append('vector_store_id', 'test-vector-store');

      const result = await uploadSource(URL_PREFIX, { namespace: TEST_NAMESPACE })(formData);

      expect(result).toEqual(mockUploadResult);

      // Verify FormData content without optional fields
      const formDataCall = mockedRestCREATE.mock.calls[0][2] as FormData;
      expect(formDataCall.get('file')).toBe(mockFile);
      expect(formDataCall.get('chunk_overlap_tokens')).toBeNull();
      expect(formDataCall.get('max_chunk_size_tokens')).toBeNull();
      expect(formDataCall.get('vector_store_id')).toBe('test-vector-store');
    });

    it('should handle upload error', async () => {
      const mockError = new Error('File upload failed');
      mockedRestCREATE.mockRejectedValueOnce(mockError);

      const formData = new FormData();
      formData.append('file', mockFile);

      await expect(
        uploadSource(URL_PREFIX, { namespace: TEST_NAMESPACE })(formData),
      ).rejects.toThrow();
    });

    it('should handle error without response', async () => {
      const mockError = new Error('Request failed');
      mockedRestCREATE.mockRejectedValueOnce(mockError);

      const formData = new FormData();
      formData.append('file', mockFile);

      await expect(
        uploadSource(URL_PREFIX, { namespace: TEST_NAMESPACE })(formData),
      ).rejects.toThrow();
    });
  });

  describe('createResponse', () => {
    describe('non-streaming', () => {
      it('should create response successfully', async () => {
        mockedRestCREATE.mockResolvedValueOnce({ data: mockBackendResponse });

        const result = await createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(
          mockCreateResponseRequest,
        );

        expect(result).toEqual(expectedSimplifiedResponse);
        expect(mockedRestCREATE).toHaveBeenCalledWith(
          URL_PREFIX,
          '/lsd/responses',
          expect.objectContaining({
            input: mockCreateResponseRequest.input,
            model: mockCreateResponseRequest.model,
            model_source_type: mockCreateResponseRequest.model_source_type,
          }),
          expect.objectContaining({ namespace: TEST_NAMESPACE }),
          {},
        );
      });

      it('should handle response with no output', async () => {
        const responseWithoutOutput = {
          ...mockBackendResponse,
          output: undefined,
        };
        mockedRestCREATE.mockResolvedValueOnce({ data: responseWithoutOutput });

        const result = await createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(
          mockCreateResponseRequest,
        );

        expect(result.content).toBe('');
      });

      it('should handle response with empty output array', async () => {
        const responseWithEmptyOutput = {
          ...mockBackendResponse,
          output: [],
        };
        mockedRestCREATE.mockResolvedValueOnce({ data: responseWithEmptyOutput });

        const result = await createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(
          mockCreateResponseRequest,
        );

        expect(result.content).toBe('');
      });

      it('should handle API error', async () => {
        const mockError = new Error('Response generation failed');
        mockedRestCREATE.mockRejectedValueOnce(mockError);

        await expect(
          createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(mockCreateResponseRequest),
        ).rejects.toThrow();
      });

      it('should handle error without response', async () => {
        const mockError = new Error('Request failed');
        mockedRestCREATE.mockRejectedValueOnce(mockError);

        await expect(
          createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(mockCreateResponseRequest),
        ).rejects.toThrow();
      });

      describe('think-tag stripping', () => {
        it('extracts reasoning from <think>...</think> and returns remaining content', async () => {
          const response = {
            ...mockBackendResponse,
            output: [
              {
                id: 'out-1',
                type: 'completion_message',
                content: [
                  {
                    type: 'output_text',
                    text: '<think>I need to reason about this</think>Here is the answer',
                  },
                ],
              },
            ],
          };
          mockedRestCREATE.mockResolvedValueOnce({ data: response });

          const result = await createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(
            mockCreateResponseRequest,
          );

          expect(result.content).toBe('Here is the answer');
          expect(result.reasoningContent).toBe('I need to reason about this');
        });

        it('extracts bare reasoning before </think> (no opening tag)', async () => {
          const response = {
            ...mockBackendResponse,
            output: [
              {
                id: 'out-1',
                type: 'completion_message',
                content: [
                  {
                    type: 'output_text',
                    text: 'Some reasoning here</think>Actual answer',
                  },
                ],
              },
            ],
          };
          mockedRestCREATE.mockResolvedValueOnce({ data: response });

          const result = await createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(
            mockCreateResponseRequest,
          );

          expect(result.content).toBe('Actual answer');
          expect(result.reasoningContent).toBe('Some reasoning here');
        });

        it('returns content as-is when no think tags present', async () => {
          mockedRestCREATE.mockResolvedValueOnce({ data: mockBackendResponse });

          const result = await createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(
            mockCreateResponseRequest,
          );

          expect(result.content).toBe('This is a test response');
          expect(result.reasoningContent).toBeUndefined();
        });

        it('handles empty think tag and returns content only', async () => {
          const response = {
            ...mockBackendResponse,
            output: [
              {
                id: 'out-1',
                type: 'completion_message',
                content: [
                  {
                    type: 'output_text',
                    text: '<think></think>Direct answer without reasoning',
                  },
                ],
              },
            ],
          };
          mockedRestCREATE.mockResolvedValueOnce({ data: response });

          const result = await createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(
            mockCreateResponseRequest,
          );

          expect(result.content).toBe('Direct answer without reasoning');
          expect(result.reasoningContent).toBeUndefined();
        });
      });
    });

    describe('streaming', () => {
      it('should handle streaming response successfully', async () => {
        const mockStreamData = jest.fn();

        // Mock ReadableStream
        const mockReader = {
          read: jest
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: {"delta": "Hello", "type": "response.output_text.delta"}\n',
              ),
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: {"delta": " World", "type": "response.output_text.delta"}\n',
              ),
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

        const result = await createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(
          mockStreamingRequest,
          { onStreamData: mockStreamData },
        );

        expect(result).toEqual({
          id: 'streaming-response',
          model: 'test-model',
          status: 'completed',
          created_at: expect.any(Number),
          content: 'Hello World',
        });

        expect(mockStreamData).toHaveBeenCalledWith('Hello');
        expect(mockStreamData).toHaveBeenCalledWith(' World');
        expect(mockStreamData).toHaveBeenCalledTimes(2);

        expect(mockFetch).toHaveBeenCalledWith(
          `/gen-ai/lsd/responses?namespace=${TEST_NAMESPACE}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'text/event-stream',
            },
            body: JSON.stringify(mockStreamingRequest),
          },
        );
      });

      it('should handle streaming response with malformed JSON chunks', async () => {
        const mockStreamData = jest.fn();

        const mockReader = {
          read: jest
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: {"delta": "Hello", "type": "response.output_text.delta"}\n',
              ),
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('data: invalid json\n'),
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: {"delta": " World", "type": "response.output_text.delta"}\n',
              ),
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

        const result = await createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(
          mockStreamingRequest,
          { onStreamData: mockStreamData },
        );

        expect(result.content).toBe('Hello World');
        expect(mockStreamData).toHaveBeenCalledTimes(2); // Only valid chunks processed
      });

      it('should handle streaming response with non-delta events', async () => {
        const mockStreamData = jest.fn();

        const mockReader = {
          read: jest
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('data: {"delta": "Hello", "type": "other.event"}\n'),
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: {"delta": " World", "type": "response.output_text.delta"}\n',
              ),
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

        const result = await createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(
          mockStreamingRequest,
          { onStreamData: mockStreamData },
        );

        expect(result.content).toBe(' World');
        expect(mockStreamData).toHaveBeenCalledTimes(1); // Only delta events processed
      });

      it('should handle streaming HTTP error', async () => {
        const mockStreamData = jest.fn();

        const mockResponse = {
          ok: false,
          status: 500,
          text: jest
            .fn()
            .mockResolvedValue(
              '{"error": {"component": "bff", "code": "internal_error", "message": "Internal server error", "retriable": false}}',
            ),
        };

        mockFetch.mockResolvedValueOnce(mockResponse);

        await expect(
          createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(mockStreamingRequest, {
            onStreamData: mockStreamData,
          }),
        ).rejects.toMatchObject({
          error: {
            component: 'bff',
            code: 'internal_error',
            message: 'Internal server error',
            retriable: false,
          },
        });
      });

      it('should handle streaming HTTP error with unparseable response', async () => {
        const mockStreamData = jest.fn();

        const mockResponse = {
          ok: false,
          status: 500,
          text: jest.fn().mockResolvedValue('Invalid JSON'),
        };

        mockFetch.mockResolvedValueOnce(mockResponse);

        await expect(
          createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(mockStreamingRequest, {
            onStreamData: mockStreamData,
          }),
        ).rejects.toMatchObject({
          error: {
            component: 'bff',
            code: 'http_500',
            message: 'HTTP error! status: 500',
            retriable: false,
          },
        });
      });

      it('should handle streaming error when no reader available', async () => {
        const mockStreamData = jest.fn();

        const mockResponse = {
          ok: true,
          body: null,
        };

        mockFetch.mockResolvedValueOnce(mockResponse);

        await expect(
          createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(mockStreamingRequest, {
            onStreamData: mockStreamData,
          }),
        ).rejects.toThrow('Unable to read stream');
      });

      it('should handle fetch network error', async () => {
        const mockStreamData = jest.fn();

        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        await expect(
          createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(mockStreamingRequest, {
            onStreamData: mockStreamData,
          }),
        ).rejects.toThrow('Network error');
      });

      it('should handle streaming error from server', async () => {
        const mockStreamData = jest.fn();

        const mockReader = {
          read: jest
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: {"delta": "Hello", "type": "response.output_text.delta"}\n',
              ),
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: {"error":{"component":"model","code":"model_error","message":"Streaming error occurred","retriable":true}}\n',
              ),
            }),
          cancel: jest.fn().mockResolvedValueOnce(undefined),
          releaseLock: jest.fn(),
        };

        const mockResponse = {
          ok: true,
          body: {
            getReader: () => mockReader,
          },
        };

        mockFetch.mockResolvedValueOnce(mockResponse);

        await expect(
          createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(mockStreamingRequest, {
            onStreamData: mockStreamData,
          }),
        ).rejects.toMatchObject({
          error: {
            component: 'model',
            code: 'model_error',
            message: 'Streaming error occurred',
            retriable: true,
          },
        });

        expect(mockStreamData).toHaveBeenCalledWith('Hello');
        expect(mockStreamData).toHaveBeenCalledTimes(1);
        expect(mockReader.cancel).toHaveBeenCalledWith('Streaming error');
        // releaseLock is still called once in the finally block, which is correct
        expect(mockReader.releaseLock).toHaveBeenCalledTimes(1);
      });

      it('should handle streaming error without message', async () => {
        const mockStreamData = jest.fn();

        const mockReader = {
          read: jest.fn().mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"error":{"component":"bff","code":"stream_error","message":"An error occurred during streaming","retriable":false}}\n',
            ),
          }),
          cancel: jest.fn().mockResolvedValueOnce(undefined),
          releaseLock: jest.fn(),
        };

        const mockResponse = {
          ok: true,
          body: {
            getReader: () => mockReader,
          },
        };

        mockFetch.mockResolvedValueOnce(mockResponse);

        await expect(
          createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(mockStreamingRequest, {
            onStreamData: mockStreamData,
          }),
        ).rejects.toMatchObject({
          error: {
            component: 'bff',
            code: 'stream_error',
            message: 'An error occurred during streaming',
            retriable: false,
          },
        });

        expect(mockStreamData).not.toHaveBeenCalled();
        expect(mockReader.cancel).toHaveBeenCalledWith('Streaming error');
        // releaseLock is still called once in the finally block, which is correct
        expect(mockReader.releaseLock).toHaveBeenCalledTimes(1);
      });

      it('should use fetch for streaming requests', async () => {
        const mockStreamData = jest.fn();

        const mockReader = {
          read: jest.fn().mockResolvedValueOnce({ done: true, value: undefined }),
          releaseLock: jest.fn(),
        };

        const mockResponse = {
          ok: true,
          body: {
            getReader: () => mockReader,
          },
        };

        mockFetch.mockResolvedValueOnce(mockResponse);

        await createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(mockStreamingRequest, {
          onStreamData: mockStreamData,
        });

        expect(mockFetch).toHaveBeenCalledWith(
          `/gen-ai/lsd/responses?namespace=${TEST_NAMESPACE}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'text/event-stream',
            },
            body: JSON.stringify(mockStreamingRequest),
          },
        );
      });
    });

    describe('reasoning streaming', () => {
      // Wiring smoke tests: verify streamCreateResponse correctly calls onStreamData
      // and populates result.reasoningContent. Chunk-level edge cases live in
      // packages/gen-ai/frontend/src/app/services/__tests__/thinkTagParser.spec.ts

      it('accumulates reasoning from reasoning_text.delta and wires onStreamData', async () => {
        const mockStreamData = jest.fn();

        const mockReader = {
          read: jest
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: {"delta": "Let me think", "type": "response.reasoning_text.delta"}\n',
              ),
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: {"delta": " step by step", "type": "response.reasoning_text.delta"}\n',
              ),
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: {"delta": "The answer is 42", "type": "response.output_text.delta"}\n',
              ),
            })
            .mockResolvedValueOnce({ done: true, value: undefined }),
          releaseLock: jest.fn(),
        };

        mockFetch.mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } });

        const result = await createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(
          mockStreamingRequest,
          { onStreamData: mockStreamData },
        );

        expect(result.reasoningContent).toBe('Let me think step by step');
        expect(result.content).toBe('The answer is 42');
        expect(mockStreamData).toHaveBeenCalledWith('Let me think', false, true);
        expect(mockStreamData).toHaveBeenCalledWith(' step by step', false, true);
        expect(mockStreamData).toHaveBeenCalledWith('The answer is 42');
      });

      it('no reasoningContent when no reasoning events are present', async () => {
        const mockStreamData = jest.fn();

        const mockReader = {
          read: jest
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: {"delta": "Hello", "type": "response.output_text.delta"}\n',
              ),
            })
            .mockResolvedValueOnce({ done: true, value: undefined }),
          releaseLock: jest.fn(),
        };

        mockFetch.mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } });

        const result = await createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(
          mockStreamingRequest,
          { onStreamData: mockStreamData },
        );

        expect(result.reasoningContent).toBeUndefined();
        expect(result.content).toBe('Hello');
        expect(mockStreamData).not.toHaveBeenCalledWith(expect.anything(), false, true);
      });

      it('wires embedded <think> tags — splits reasoning and content via onStreamData', async () => {
        const mockStreamData = jest.fn();

        const mockReader = {
          read: jest
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: {"delta": "<think>Let me reason", "type": "response.output_text.delta"}\n',
              ),
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: {"delta": " about this</think>The answer", "type": "response.output_text.delta"}\n',
              ),
            })
            .mockResolvedValueOnce({ done: true, value: undefined }),
          releaseLock: jest.fn(),
        };

        mockFetch.mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } });

        const result = await createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(
          mockStreamingRequest,
          { onStreamData: mockStreamData },
        );

        expect(result.reasoningContent).toBe('Let me reason about this');
        expect(result.content).toBe('The answer');
        expect(mockStreamData).toHaveBeenCalledWith('Let me reason', false, true);
        expect(mockStreamData).toHaveBeenCalledWith('The answer');
      });
    });
  });

  describe('exportCode', () => {
    it('should export code successfully', async () => {
      mockedRestCREATE.mockResolvedValueOnce({ data: mockCodeExportResponseData });

      const result = await exportCode(URL_PREFIX, { namespace: TEST_NAMESPACE })(
        mockCodeExportRequest,
      );

      expect(result).toEqual(mockCodeExportResponseData);
      expect(mockedRestCREATE).toHaveBeenCalledWith(
        URL_PREFIX,
        '/code-exporter',
        mockCodeExportRequest,
        expect.objectContaining({ namespace: TEST_NAMESPACE }),
        {},
      );
    });

    it('should handle API error', async () => {
      const mockError = new Error('Code export failed');
      mockedRestCREATE.mockRejectedValueOnce(mockError);

      await expect(
        exportCode(URL_PREFIX, { namespace: TEST_NAMESPACE })(mockCodeExportRequest),
      ).rejects.toThrow();
    });

    it('should handle error without response', async () => {
      const mockError = new Error('Request failed');
      mockedRestCREATE.mockRejectedValueOnce(mockError);

      await expect(
        exportCode(URL_PREFIX, { namespace: TEST_NAMESPACE })(mockCodeExportRequest),
      ).rejects.toThrow();
    });
  });

  describe('getLSDStatus', () => {
    const project = 'test-project';

    it('should get LSD status successfully', async () => {
      mockedRestGET.mockResolvedValueOnce({ data: mockLlamaStackDistribution });

      const result = await getLSDStatus(URL_PREFIX, { namespace: project })();

      expect(result).toEqual(mockLlamaStackDistribution);
      expect(mockedRestGET).toHaveBeenCalledWith(
        URL_PREFIX,
        '/lsd/status',
        expect.objectContaining({ namespace: project }),
        {},
      );
    });

    it('should handle API error', async () => {
      const mockError = new Error('LSD status fetch failed');
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(getLSDStatus(URL_PREFIX, { namespace: project })()).rejects.toThrow();
    });

    it('should handle error without response', async () => {
      const mockError = new Error('Failed to fetch LSD status');
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(getLSDStatus(URL_PREFIX, { namespace: project })()).rejects.toThrow();
    });
  });

  describe('installLSD', () => {
    const project = 'test-project';

    it('should install LSD successfully', async () => {
      mockedRestCREATE.mockResolvedValueOnce({ data: mockLlamaStackDistribution });

      const result = await installLSD(URL_PREFIX, { namespace: project })({
        models: mockInstallModels,
        enable_guardrails: true,
      });

      expect(result).toEqual(mockLlamaStackDistribution);
      expect(mockedRestCREATE).toHaveBeenCalledWith(
        URL_PREFIX,
        '/lsd/install',
        { models: mockInstallModels, enable_guardrails: true },
        expect.objectContaining({ namespace: project }),
        {},
      );
    });

    it('should handle API error with error message', async () => {
      const mockError = new Error('Installation failed due to insufficient resources');
      mockedRestCREATE.mockRejectedValueOnce(mockError);

      await expect(
        installLSD(URL_PREFIX, { namespace: project })({ models: mockInstallModels }),
      ).rejects.toThrow();
    });

    it('should handle network error', async () => {
      const mockError = new Error('Network connection failed');
      mockedRestCREATE.mockRejectedValueOnce(mockError);

      await expect(
        installLSD(URL_PREFIX, { namespace: project })({ models: mockInstallModels }),
      ).rejects.toThrow();
    });

    it('should handle error without response', async () => {
      const mockError = new Error('Request failed');
      mockedRestCREATE.mockRejectedValueOnce(mockError);

      await expect(
        installLSD(URL_PREFIX, { namespace: project })({ models: mockInstallModels }),
      ).rejects.toThrow();
    });

    it('should handle empty models array', async () => {
      mockedRestCREATE.mockResolvedValueOnce({ data: mockLlamaStackDistribution });

      const result = await installLSD(URL_PREFIX, { namespace: project })({ models: [] });

      expect(result).toEqual(mockLlamaStackDistribution);
      expect(mockedRestCREATE).toHaveBeenCalledWith(
        URL_PREFIX,
        '/lsd/install',
        { models: [] },
        expect.objectContaining({ namespace: project }),
        {},
      );
    });

    it('should handle MaaS models', async () => {
      mockedRestCREATE.mockResolvedValueOnce({ data: mockLlamaStackDistribution });

      const result = await installLSD(URL_PREFIX, { namespace: project })({
        models: mockMaaSModelsForInstall,
      });

      expect(result).toEqual(mockLlamaStackDistribution);
      expect(mockedRestCREATE).toHaveBeenCalledWith(
        URL_PREFIX,
        '/lsd/install',
        { models: mockMaaSModelsForInstall },
        expect.objectContaining({ namespace: project }),
        {},
      );
    });
  });

  describe('getMaaSModels', () => {
    it('should fetch MaaS models successfully', async () => {
      mockedRestGET.mockResolvedValueOnce({ data: mockMaaSModels });

      const result = await getMaaSModels(URL_PREFIX, { namespace: TEST_NAMESPACE })();

      expect(result).toEqual(mockMaaSModels);
      expect(mockedRestGET).toHaveBeenCalledWith(
        URL_PREFIX,
        '/maas/models',
        expect.objectContaining({ namespace: TEST_NAMESPACE }),
        {},
      );
    });

    it('should handle empty MaaS models response', async () => {
      mockedRestGET.mockResolvedValueOnce({ data: null });

      const result = await getMaaSModels(URL_PREFIX, { namespace: TEST_NAMESPACE })();

      expect(result).toBeNull();
    });

    it('should handle API error with error message', async () => {
      const mockError = new Error('MaaS service unavailable');
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(getMaaSModels(URL_PREFIX, { namespace: TEST_NAMESPACE })()).rejects.toThrow();
    });

    it('should handle network error', async () => {
      const mockError = new Error('Network error');
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(getMaaSModels(URL_PREFIX, { namespace: TEST_NAMESPACE })()).rejects.toThrow();
    });

    it('should handle error without response', async () => {
      const mockError = new Error('Failed to fetch MaaS models');
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(getMaaSModels(URL_PREFIX, { namespace: TEST_NAMESPACE })()).rejects.toThrow();
    });
  });

  describe('getAAModels', () => {
    it('should fetch AA models successfully', async () => {
      mockedRestGET.mockResolvedValueOnce({ data: mockAAModels });

      const result = await getAAModels(URL_PREFIX, { namespace: TEST_NAMESPACE })();

      expect(result).toEqual(mockAAModels);
      expect(mockedRestGET).toHaveBeenCalledWith(
        URL_PREFIX,
        '/aaa/models',
        expect.objectContaining({ namespace: TEST_NAMESPACE }),
        {},
      );
    });

    it('should handle empty AA models response', async () => {
      mockedRestGET.mockResolvedValueOnce({ data: null });

      const result = await getAAModels(URL_PREFIX, { namespace: TEST_NAMESPACE })();

      expect(result).toBeNull();
    });

    it('should handle API error with error message', async () => {
      const mockError = new Error('AA models not found');
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(getAAModels(URL_PREFIX, { namespace: TEST_NAMESPACE })()).rejects.toThrow();
    });

    it('should handle network error', async () => {
      const mockError = new Error('Network error');
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(getAAModels(URL_PREFIX, { namespace: TEST_NAMESPACE })()).rejects.toThrow();
    });

    it('should handle error without response', async () => {
      const mockError = new Error('Failed to fetch AA models');
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(getAAModels(URL_PREFIX, { namespace: TEST_NAMESPACE })()).rejects.toThrow();
    });
  });

  describe('getMCPServers', () => {
    it('should fetch MCP servers successfully', async () => {
      const servers = mockMCPServers(TEST_NAMESPACE);
      mockedRestGET.mockResolvedValueOnce({ data: servers });

      const result = await getMCPServers(URL_PREFIX, { namespace: TEST_NAMESPACE })();

      expect(result).toEqual(servers);
      expect(mockedRestGET).toHaveBeenCalledWith(
        URL_PREFIX,
        '/aaa/mcps',
        expect.objectContaining({ namespace: TEST_NAMESPACE }),
        {},
      );
    });

    it('should handle 404 error (namespace not found)', async () => {
      const mockError = { status: 404, message: 'Namespace not found' };
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(getMCPServers(URL_PREFIX, { namespace: TEST_NAMESPACE })()).rejects.toThrow();
    });

    it('should handle 401 error (authentication failed)', async () => {
      const mockError = { status: 401, message: 'Unauthorized' };
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(getMCPServers(URL_PREFIX, { namespace: TEST_NAMESPACE })()).rejects.toThrow();
    });

    it('should handle 403 error (access denied)', async () => {
      const mockError = { status: 403, message: 'Forbidden' };
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(getMCPServers(URL_PREFIX, { namespace: TEST_NAMESPACE })()).rejects.toThrow();
    });

    it('should handle generic error with message', async () => {
      const mockError = { error: { message: 'Custom error message' } };
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(getMCPServers(URL_PREFIX, { namespace: TEST_NAMESPACE })()).rejects.toThrow();
    });

    it('should handle generic error without message', async () => {
      const mockError = new Error('Network error');
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(getMCPServers(URL_PREFIX, { namespace: TEST_NAMESPACE })()).rejects.toThrow();
    });

    it('should handle empty servers list', async () => {
      const emptyResponse = mockEmptyMCPServers(TEST_NAMESPACE);
      mockedRestGET.mockResolvedValueOnce({ data: emptyResponse });

      const result = await getMCPServers(URL_PREFIX, { namespace: TEST_NAMESPACE })();

      expect(result).toEqual(emptyResponse);
    });
  });

  describe('getMCPServerStatus', () => {
    it('should fetch MCP server status successfully', async () => {
      mockedRestGET.mockResolvedValueOnce({ data: mockMCPConnectionStatus });

      const result = await getMCPServerStatus(URL_PREFIX, { namespace: TEST_NAMESPACE })({
        server_url: MOCK_MCP_SERVER_URL,
      });

      expect(result).toEqual(mockMCPConnectionStatus);
      expect(mockedRestGET).toHaveBeenCalledWith(
        URL_PREFIX,
        '/mcp/status',
        expect.objectContaining({ namespace: TEST_NAMESPACE, server_url: MOCK_MCP_SERVER_URL }),
        {},
      );
    });

    it('should handle 404 error (server not found)', async () => {
      const mockError = { status: 404, message: 'Server not found' };
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(
        getMCPServerStatus(URL_PREFIX, { namespace: TEST_NAMESPACE })({
          server_url: MOCK_MCP_SERVER_URL,
        }),
      ).rejects.toThrow();
    });

    it('should handle 401 error (authentication failed)', async () => {
      const mockError = { status: 401, message: 'Unauthorized' };
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(
        getMCPServerStatus(URL_PREFIX, { namespace: TEST_NAMESPACE })({
          server_url: MOCK_MCP_SERVER_URL,
        }),
      ).rejects.toThrow();
    });

    it('should handle 403 error (access denied)', async () => {
      const mockError = { status: 403, message: 'Forbidden' };
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(
        getMCPServerStatus(URL_PREFIX, { namespace: TEST_NAMESPACE })({
          server_url: MOCK_MCP_SERVER_URL,
        }),
      ).rejects.toThrow();
    });

    it('should handle 400 error with custom message', async () => {
      const customMessage = 'Invalid server URL format';
      const mockError = { status: 400, error: { message: customMessage } };
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(
        getMCPServerStatus(URL_PREFIX, { namespace: TEST_NAMESPACE })({
          server_url: MOCK_MCP_SERVER_URL,
        }),
      ).rejects.toThrow();
    });

    it('should handle 400 error without custom message', async () => {
      const mockError = { status: 400 };
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(
        getMCPServerStatus(URL_PREFIX, { namespace: TEST_NAMESPACE })({
          server_url: MOCK_MCP_SERVER_URL,
        }),
      ).rejects.toThrow();
    });

    it('should handle generic error with message', async () => {
      const mockError = { error: { message: 'Connection timeout' } };
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(
        getMCPServerStatus(URL_PREFIX, { namespace: TEST_NAMESPACE })({
          server_url: MOCK_MCP_SERVER_URL,
        }),
      ).rejects.toThrow();
    });

    it('should handle generic error without message', async () => {
      const mockError = new Error('Unknown error');
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(
        getMCPServerStatus(URL_PREFIX, { namespace: TEST_NAMESPACE })({
          server_url: MOCK_MCP_SERVER_URL,
        }),
      ).rejects.toThrow();
    });

    it('should handle error status', async () => {
      mockedRestGET.mockResolvedValueOnce({ data: mockMCPConnectionErrorStatus });

      const result = await getMCPServerStatus(URL_PREFIX, { namespace: TEST_NAMESPACE })({
        server_url: MOCK_MCP_SERVER_URL,
      });

      expect(result).toEqual(mockMCPConnectionErrorStatus);
      expect(result.status).toBe('error');
    });
  });

  describe('getMCPServerTools', () => {
    it('should fetch MCP server tools successfully', async () => {
      mockedRestGET.mockResolvedValueOnce({ data: mockMCPTools });

      const result = await getMCPServerTools(URL_PREFIX, { namespace: TEST_NAMESPACE })();

      expect(result).toEqual(mockMCPTools);
      expect(mockedRestGET).toHaveBeenCalledWith(
        URL_PREFIX,
        '/mcp/tools',
        expect.objectContaining({ namespace: TEST_NAMESPACE }),
        {},
      );
    });

    it('should handle error when fetching tools', async () => {
      const mockError = new Error('Failed to fetch tools');
      mockedRestGET.mockRejectedValueOnce(mockError);

      await expect(
        getMCPServerTools(URL_PREFIX, { namespace: TEST_NAMESPACE })(),
      ).rejects.toThrow();
    });
  });

  describe('deleteLSD', () => {
    const project = 'test-project';
    const lsdName = 'test-distribution';

    it('should delete LSD successfully', async () => {
      mockedRestDELETE.mockResolvedValueOnce({ data: 'LSD deleted successfully' });

      const result = await deleteLSD(URL_PREFIX, { namespace: project })({ name: lsdName });

      expect(result).toBe('LSD deleted successfully');
      expect(mockedRestDELETE).toHaveBeenCalledWith(
        URL_PREFIX,
        '/lsd/delete',
        { name: lsdName },
        expect.objectContaining({ namespace: project }),
        {},
      );
    });

    it('should handle API error with error message', async () => {
      const mockError = new Error('Distribution not found');
      mockedRestDELETE.mockRejectedValueOnce(mockError);

      await expect(
        deleteLSD(URL_PREFIX, { namespace: project })({ name: lsdName }),
      ).rejects.toThrow();
    });

    it('should handle network error', async () => {
      const mockError = new Error('Connection timeout');
      mockedRestDELETE.mockRejectedValueOnce(mockError);

      await expect(
        deleteLSD(URL_PREFIX, { namespace: project })({ name: lsdName }),
      ).rejects.toThrow();
    });

    it('should handle error without response', async () => {
      const mockError = new Error('Request failed');
      mockedRestDELETE.mockRejectedValueOnce(mockError);

      await expect(
        deleteLSD(URL_PREFIX, { namespace: project })({ name: lsdName }),
      ).rejects.toThrow();
    });

    it('should handle server error response', async () => {
      const mockError = new Error('Internal server error');
      mockedRestDELETE.mockRejectedValueOnce(mockError);

      await expect(
        deleteLSD(URL_PREFIX, { namespace: project })({ name: lsdName }),
      ).rejects.toThrow();
    });

    it('should handle malformed error response', async () => {
      const mockError = new Error('Request failed');
      mockedRestDELETE.mockRejectedValueOnce(mockError);

      await expect(
        deleteLSD(URL_PREFIX, { namespace: project })({ name: lsdName }),
      ).rejects.toThrow();
    });
  });

  describe('URL_PREFIX environment variable', () => {
    it('should use custom URL_PREFIX when provided', async () => {
      // Test that the function accepts custom hostPath parameter
      mockedRestGET.mockResolvedValueOnce({ data: mockLlamaModels });

      await getLSDModels('/custom-prefix', { namespace: TEST_NAMESPACE })();

      expect(mockedRestGET).toHaveBeenCalledWith(
        '/custom-prefix',
        '/lsd/models',
        expect.objectContaining({ namespace: TEST_NAMESPACE }),
        {},
      );
    });
  });

  describe('createPassthroughResponse', () => {
    const mockBody = {
      model: 'test-model',
      stream: true,
      store: false,
      input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Hello' }] }],
    };

    it('should construct the correct URL with namespace and secretName', async () => {
      const mockReader = {
        read: jest.fn().mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader },
      });

      await createPassthroughResponse(
        '/gen-ai/api/v1',
        'test-ns',
        'my-secret',
        mockBody,
        jest.fn(),
      );

      expect(mockFetch).toHaveBeenCalledWith(
        '/gen-ai/api/v1/lsd/responses/passthrough?namespace=test-ns&secretName=my-secret',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should append /api/v1 if bffBasePath does not end with it', async () => {
      const mockReader = {
        read: jest.fn().mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader },
      });

      await createPassthroughResponse('/gen-ai', 'test-ns', 'my-secret', mockBody, jest.fn());

      expect(mockFetch).toHaveBeenCalledWith(
        '/gen-ai/api/v1/lsd/responses/passthrough?namespace=test-ns&secretName=my-secret',
        expect.anything(),
      );
    });

    it('should stream text delta events and resolve with content', async () => {
      const onStreamData = jest.fn();
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"delta": "Hello", "type": "response.output_text.delta"}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"delta": " World", "type": "response.output_text.delta"}\n',
            ),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader },
      });

      const result = await createPassthroughResponse(
        '/gen-ai/api/v1',
        'test-ns',
        'my-secret',
        mockBody,
        onStreamData,
      );

      expect(onStreamData).toHaveBeenCalledWith('Hello');
      expect(onStreamData).toHaveBeenCalledWith(' World');
      expect(result.content).toBe('Hello World');
      expect(result.id).toBe('passthrough-response');
    });

    it('should reassemble a JSON event split across two SSE chunks', async () => {
      const onStreamData = jest.fn();
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"delta": "Hello'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(' World", "type":"response.output_text.delta"}\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader },
      });

      const result = await createPassthroughResponse(
        '/gen-ai/api/v1',
        'test-ns',
        'my-secret',
        mockBody,
        onStreamData,
      );

      expect(onStreamData).toHaveBeenCalledWith('Hello World');
      expect(result.content).toBe('Hello World');
    });

    it('should throw differentiated error for 502/503 (OGX unreachable)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: () => Promise.resolve(''),
      });

      await expect(
        createPassthroughResponse('/gen-ai/api/v1', 'ns', 'secret', mockBody, jest.fn()),
      ).rejects.toThrow('OGX instance is not responding');
    });

    it('should throw differentiated error for 404 (secret not found)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve(''),
      });

      await expect(
        createPassthroughResponse(
          '/gen-ai/api/v1',
          'test-ns',
          'missing-secret',
          mockBody,
          jest.fn(),
        ),
      ).rejects.toThrow("connection secret 'missing-secret' was not found in namespace 'test-ns'");
    });

    it('should throw differentiated error for 403 (RBAC denied)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve(''),
      });

      await expect(
        createPassthroughResponse('/gen-ai/api/v1', 'ns', 'secret', mockBody, jest.fn()),
      ).rejects.toThrow('do not have permission');
    });

    it('should reject on streaming error event', async () => {
      const mockReader = {
        read: jest.fn().mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            'data: {"error": {"code": "server_error", "message": "tool_choice requires --tool-call-parser"}}\n',
          ),
        }),
        releaseLock: jest.fn(),
        cancel: jest.fn().mockResolvedValue(undefined),
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader },
      });

      await expect(
        createPassthroughResponse('/gen-ai/api/v1', 'ns', 'secret', mockBody, jest.fn()),
      ).rejects.toThrow('tool_choice requires --tool-call-parser');
    });

    it('should reject with "Response stopped by user" on AbortError', async () => {
      const abortError = new Error('The user aborted a request.');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      await expect(
        createPassthroughResponse('/gen-ai/api/v1', 'ns', 'secret', mockBody, jest.fn()),
      ).rejects.toThrow('Response stopped by user');
    });

    it('should include metrics from response.metrics event', async () => {
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type": "response.metrics", "metrics": {"latency_ms": 500, "time_to_first_token_ms": 100}}\n',
            ),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader },
      });

      const result = await createPassthroughResponse(
        '/gen-ai/api/v1',
        'ns',
        'secret',
        mockBody,
        jest.fn(),
      );

      expect(result.metrics).toEqual({ latency_ms: 500, time_to_first_token_ms: 100 });
    });
  });

  describe('looksLikeRawToolCall', () => {
    it('should detect a raw file_search tool call', () => {
      const raw = '{"name": "file_search", "parameters": {"query": "IBM HashiCorp"}}';
      expect(looksLikeRawToolCall(raw)).toBe(true);
    });

    it('should detect with extra whitespace', () => {
      const raw = '  {"name": "file_search", "parameters": {"query": "test"}}  ';
      expect(looksLikeRawToolCall(raw)).toBe(true);
    });

    it('should return false for normal text', () => {
      expect(looksLikeRawToolCall('Hello, how can I help you?')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(looksLikeRawToolCall('')).toBe(false);
    });

    it('should return false for JSON without name/parameters', () => {
      expect(looksLikeRawToolCall('{"key": "value"}')).toBe(false);
    });

    it('should return false for JSON with only name', () => {
      expect(looksLikeRawToolCall('{"name": "file_search"}')).toBe(false);
    });

    it('should return false for invalid JSON', () => {
      expect(looksLikeRawToolCall('{name: file_search}')).toBe(false);
    });

    it('should return false for text containing JSON-like content', () => {
      expect(
        looksLikeRawToolCall('Here is some info: {"name": "file_search", "parameters": {}}'),
      ).toBe(false);
    });
  });

  describe('RAW_TOOL_CALL_WARNING', () => {
    it('should be a non-empty string', () => {
      expect(RAW_TOOL_CALL_WARNING).toBeTruthy();
      expect(typeof RAW_TOOL_CALL_WARNING).toBe('string');
    });
  });

  describe('uploadMediaFile', () => {
    let mockXhr: {
      open: jest.Mock;
      send: jest.Mock;
      abort: jest.Mock;
      status: number;
      statusText: string;
      responseText: string;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      onabort: (() => void) | null;
      upload: { onprogress: ((e: Partial<ProgressEvent>) => void) | null };
    };

    beforeEach(() => {
      mockXhr = {
        open: jest.fn(),
        send: jest.fn(),
        abort: jest.fn(),
        status: 200,
        statusText: 'OK',
        responseText: '{"data":{"id":"file-abc123"}}',
        onload: null,
        onerror: null,
        onabort: null,
        upload: { onprogress: null },
      };
      jest
        .spyOn(window, 'XMLHttpRequest')
        .mockImplementation(() => mockXhr as unknown as XMLHttpRequest);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should upload a vision file and include type in FormData', async () => {
      const file = new File(['image-data'], 'test.png', { type: 'image/png' });
      const { promise } = uploadMediaFile('/api/upload', file, 'vision');

      expect(mockXhr.open).toHaveBeenCalledWith('POST', '/api/upload');
      expect(mockXhr.send).toHaveBeenCalled();

      const sentFormData = mockXhr.send.mock.calls[0][0] as FormData;
      expect(sentFormData.get('file')).toBe(file);
      expect(sentFormData.get('type')).toBe('vision');

      mockXhr.onload!();

      const result = await promise;
      expect(result).toEqual({ data: { id: 'file-abc123' } });
    });

    it('should upload an audio file with type=audio', async () => {
      const file = new File(['audio-data'], 'recording.mp3', { type: 'audio/mpeg' });
      const { promise } = uploadMediaFile('/api/upload', file, 'audio');

      const sentFormData = mockXhr.send.mock.calls[0][0] as FormData;
      expect(sentFormData.get('file')).toBe(file);
      expect(sentFormData.get('type')).toBe('audio');

      mockXhr.onload!();

      const result = await promise;
      expect(result).toEqual({ data: { id: 'file-abc123' } });
    });

    it('should call onProgress with percentage', async () => {
      const onProgress = jest.fn();
      const file = new File(['image-data'], 'test.png', { type: 'image/png' });
      const { promise } = uploadMediaFile('/api/upload', file, 'vision', onProgress);

      mockXhr.upload.onprogress!({ lengthComputable: true, loaded: 50, total: 100 });
      expect(onProgress).toHaveBeenCalledWith(50);

      mockXhr.upload.onprogress!({ lengthComputable: true, loaded: 100, total: 100 });
      expect(onProgress).toHaveBeenCalledWith(100);

      mockXhr.onload!();
      await promise;
    });

    it('should not call onProgress when lengthComputable is false', async () => {
      const onProgress = jest.fn();
      const file = new File(['data'], 'test.png', { type: 'image/png' });
      const { promise } = uploadMediaFile('/api/upload', file, 'vision', onProgress);

      mockXhr.upload.onprogress!({ lengthComputable: false, loaded: 0, total: 0 });
      expect(onProgress).not.toHaveBeenCalled();

      mockXhr.onload!();
      await promise;
    });

    it('should reject on HTTP error status', async () => {
      const file = new File(['data'], 'test.png', { type: 'image/png' });
      mockXhr.status = 413;
      mockXhr.statusText = 'Payload Too Large';

      const { promise } = uploadMediaFile('/api/upload', file, 'vision');
      mockXhr.onload!();

      await expect(promise).rejects.toThrow('Upload failed: 413 Payload Too Large');
    });

    it('should reject on invalid JSON response', async () => {
      const file = new File(['data'], 'test.png', { type: 'image/png' });
      mockXhr.responseText = 'not json';

      const { promise } = uploadMediaFile('/api/upload', file, 'vision');
      mockXhr.onload!();

      await expect(promise).rejects.toThrow('Invalid response from server');
    });

    it('should reject on malformed response shape', async () => {
      const file = new File(['data'], 'test.png', { type: 'image/png' });
      mockXhr.responseText = JSON.stringify({ result: 'ok' });

      const { promise } = uploadMediaFile('/api/upload', file, 'vision');
      mockXhr.onload!();

      await expect(promise).rejects.toThrow('Invalid response shape: missing data.id');
    });

    it('should reject on network error', async () => {
      const file = new File(['data'], 'test.png', { type: 'image/png' });
      const { promise } = uploadMediaFile('/api/upload', file, 'vision');
      mockXhr.onerror!();

      await expect(promise).rejects.toThrow('Network error during upload');
    });

    it('should reject on abort', async () => {
      const file = new File(['data'], 'test.png', { type: 'image/png' });
      const { promise } = uploadMediaFile('/api/upload', file, 'vision');
      mockXhr.onabort!();

      await expect(promise).rejects.toThrow('Upload aborted');
    });

    it('should return an xhr object that can be aborted', () => {
      const file = new File(['data'], 'test.png', { type: 'image/png' });
      const { xhr } = uploadMediaFile('/api/upload', file, 'vision');

      xhr.abort();
      expect(mockXhr.abort).toHaveBeenCalled();
    });
  });

  describe('transcribeAudio', () => {
    beforeEach(() => {
      mockFetch.mockReset();
    });

    it('sends POST with file_id and asr_model_id', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: 'Hello world' }),
      });

      const result = await transcribeAudio('/api/transcriptions', 'file-123', 'whisper-model');

      expect(mockFetch).toHaveBeenCalledWith('/api/transcriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: 'file-123', asr_model_id: 'whisper-model' }),
        signal: undefined,
      });
      expect(result).toEqual({ text: 'Hello world' });
    });

    it('passes AbortSignal when provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: 'result' }),
      });

      const controller = new AbortController();
      await transcribeAudio('/api/transcriptions', 'file-123', 'model', controller.signal);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/transcriptions',
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('throws ApiErrorClass for structured FrontendErrorResponse', async () => {
      const structuredError = {
        error: {
          component: 'asr',
          code: 'unreachable',
          message: 'ASR endpoint unreachable',
          retriable: true,
        },
      };
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.resolve(structuredError),
      });

      try {
        await transcribeAudio('/api/transcriptions', 'file-123', 'model');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toHaveProperty('error');
        expect((error as { error: { component: string } }).error.component).toBe('asr');
        expect((error as { error: { code: string } }).error.code).toBe('unreachable');
        expect((error as { error: { retriable: boolean } }).error.retriable).toBe(true);
      }
    });

    it('throws legacy error with server message on non-structured response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: 'ASR model unavailable' } }),
      });

      await expect(transcribeAudio('/api/transcriptions', 'file-123', 'model')).rejects.toThrow(
        'ASR model unavailable',
      );
    });

    it('throws fallback error when response body is not JSON', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error('not json')),
      });

      await expect(transcribeAudio('/api/transcriptions', 'file-123', 'model')).rejects.toThrow(
        'Transcription failed (502)',
      );
    });

    it('propagates AbortError when signal is aborted', async () => {
      const controller = new AbortController();
      const abortError = new DOMException('The operation was aborted.', 'AbortError');
      mockFetch.mockRejectedValue(abortError);

      await expect(
        transcribeAudio('/api/transcriptions', 'file-123', 'model', controller.signal),
      ).rejects.toEqual(abortError);
    });

    it('attaches status code to thrown error for legacy format', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        json: () => Promise.resolve({ message: 'No speech detected' }),
      });

      try {
        await transcribeAudio('/api/transcriptions', 'file-123', 'model');
        fail('Expected error to be thrown');
      } catch (error) {
        expect((error as Error & { status?: number }).status).toBe(422);
        expect((error as Error).message).toBe('No speech detected');
      }
    });
  });
});
