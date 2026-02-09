/* eslint-disable camelcase */
import {
  getLSDModels,
  listVectorStores,
  createVectorStore,
  uploadSource,
  createResponse,
  exportCode,
  getLSDStatus,
  installLSD,
  deleteLSD,
  getMaaSModels,
  getAAModels,
  getMCPServers,
  getMCPServerStatus,
  getMCPServerTools,
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

        expect(result.content).toBe('World');
        expect(mockStreamData).toHaveBeenCalledTimes(1); // Only delta events processed
      });

      it('should handle streaming HTTP error', async () => {
        const mockStreamData = jest.fn();

        const mockResponse = {
          ok: false,
          status: 500,
          text: jest.fn().mockResolvedValue('{"error": {"message": "Internal server error"}}'),
        };

        mockFetch.mockResolvedValueOnce(mockResponse);

        await expect(
          createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(mockStreamingRequest, {
            onStreamData: mockStreamData,
          }),
        ).rejects.toThrow('Internal server error');
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
        ).rejects.toThrow('HTTP error! status: 500');
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
                'data: {"error":{"code":"500","message":"Streaming error occurred"}}\n',
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
        ).rejects.toThrow('Streaming error occurred');

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
            value: new TextEncoder().encode('data: {"error":{"code":"500"}}\n'),
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
        ).rejects.toThrow('An error occurred during streaming');

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
});
