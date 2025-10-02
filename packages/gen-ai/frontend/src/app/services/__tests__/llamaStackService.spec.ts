/* eslint-disable camelcase */
import axios from '~/app/utilities/axios';
import {
  getModels,
  getVectorStores,
  createVectorStore,
  uploadSource,
  createResponse,
  exportCode,
  getLSDstatus,
  installLSD,
  deleteLSD,
} from '~/app/services/llamaStackService';
import { mockLlamaModels } from '~/__mocks__/mockLlamaStackModels';
import { mockVectorStores } from '~/__mocks__/mockVectorStores';
import { mockLlamaStackDistribution } from '~/__mocks__/mockLlamaStackDistribution';
import {
  BackendResponseData,
  SimplifiedResponseData,
  CreateResponseRequest,
  ChatbotSourceSettings,
  FileUploadResult,
  CodeExportRequest,
  CodeExportResponse,
} from '~/app/types';

// Mock axios
jest.mock('~/app/utilities/axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock fetch for streaming tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('llamaStackService', () => {
  const testNamespace = 'test-namespace';
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getModels', () => {
    it('should fetch models successfully', async () => {
      const mockResponse = { data: { data: mockLlamaModels } };
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await getModels(testNamespace);

      expect(result).toEqual(mockLlamaModels);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `/gen-ai/api/v1/lsd/models?namespace=${testNamespace}`,
      );
    });

    it('should handle API error with error message', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: 'Models not found',
            },
          },
        },
      };
      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(getModels(testNamespace)).rejects.toThrow('Models not found');
    });

    it('should handle network error', async () => {
      const mockError = new Error('Network error');
      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(getModels(testNamespace)).rejects.toThrow('Network error');
    });

    it('should handle error without response', async () => {
      const mockError = {};
      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(getModels(testNamespace)).rejects.toThrow('Failed to fetch models');
    });
  });

  describe('getVectorStores', () => {
    it('should fetch vector stores successfully', async () => {
      const mockResponse = { data: { data: mockVectorStores } };
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await getVectorStores(testNamespace);

      expect(result).toEqual(mockVectorStores);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `/gen-ai/api/v1/lsd/vectorstores?namespace=${testNamespace}`,
      );
    });

    it('should handle API error with error message', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: 'Vector stores not found',
            },
          },
        },
      };
      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(getVectorStores(testNamespace)).rejects.toThrow('Vector stores not found');
    });

    it('should handle error without response', async () => {
      const mockError = {};
      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(getVectorStores(testNamespace)).rejects.toThrow('Failed to fetch vector stores');
    });
  });

  describe('createVectorStore', () => {
    const vectorName = 'test-vector-store';

    it('should create vector store successfully', async () => {
      const mockResponse = { data: { data: mockVectorStores[0] } };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await createVectorStore(vectorName, testNamespace);

      expect(result).toEqual(mockVectorStores[0]);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/gen-ai/api/v1/lsd/vectorstores?namespace=${testNamespace}`,
        { name: vectorName },
      );
    });

    it('should handle API error with error message', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: 'Vector store creation failed',
            },
          },
        },
      };
      mockedAxios.post.mockRejectedValueOnce(mockError);

      await expect(createVectorStore(vectorName, testNamespace)).rejects.toThrow(
        'Vector store creation failed',
      );
    });

    it('should handle error without response', async () => {
      const mockError = {};
      mockedAxios.post.mockRejectedValueOnce(mockError);

      await expect(createVectorStore(vectorName, testNamespace)).rejects.toThrow(
        'Failed to create vector store',
      );
    });
  });

  describe('uploadSource', () => {
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const mockSettings: ChatbotSourceSettings = {
      embeddingModel: 'test-model',
      vectorStore: 'test-vector-store',
      chunkOverlap: 100,
      maxChunkLength: 1000,
    };
    const mockUploadResult: FileUploadResult = {
      file_id: 'test-file-id',
      vector_store_file: {
        id: 'test-file-id',
        object: 'vector_store.file',
        created_at: 1755721063,
        vector_store_id: 'test-vector-store',
        status: 'pending',
        usage_bytes: 1024,
        chunking_strategy: {
          type: 'static',
          static: {
            max_chunk_size_tokens: 1000,
            chunk_overlap_tokens: 100,
          },
        },
        attributes: {
          description: 'Test file',
        },
      },
    };

    it('should upload source successfully with all settings', async () => {
      const mockResponse = { data: { data: mockUploadResult } };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await uploadSource(mockFile, mockSettings, testNamespace);

      expect(result).toEqual(mockUploadResult);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/gen-ai/api/v1/lsd/files/upload?namespace=${testNamespace}`,
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      // Verify FormData content
      const formData = mockedAxios.post.mock.calls[0][1] as FormData;
      expect(formData.get('file')).toBe(mockFile);
      expect(formData.get('chunk_overlap_tokens')).toBe('100');
      expect(formData.get('max_chunk_size_tokens')).toBe('1000');
      expect(formData.get('vector_store_id')).toBe('test-vector-store');
    });

    it('should upload source successfully with minimal settings', async () => {
      const minimalSettings: ChatbotSourceSettings = {
        embeddingModel: 'test-model',
        vectorStore: 'test-vector-store',
      };
      const mockResponse = { data: { data: mockUploadResult } };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await uploadSource(mockFile, minimalSettings, testNamespace);

      expect(result).toEqual(mockUploadResult);

      // Verify FormData content without optional fields
      const formData = mockedAxios.post.mock.calls[0][1] as FormData;
      expect(formData.get('file')).toBe(mockFile);
      expect(formData.get('chunk_overlap_tokens')).toBeNull();
      expect(formData.get('max_chunk_size_tokens')).toBeNull();
      expect(formData.get('vector_store_id')).toBe('test-vector-store');
    });

    it('should handle upload error', async () => {
      const mockError = {
        response: {
          data: {
            message: 'File upload failed',
          },
        },
      };
      mockedAxios.post.mockRejectedValueOnce(mockError);

      await expect(uploadSource(mockFile, mockSettings, testNamespace)).rejects.toThrow(
        'File upload failed',
      );
    });

    it('should handle error without response', async () => {
      const mockError = {};
      mockedAxios.post.mockRejectedValueOnce(mockError);

      await expect(uploadSource(mockFile, mockSettings, testNamespace)).rejects.toThrow(
        'Failed to upload source',
      );
    });
  });

  describe('createResponse', () => {
    const mockRequest: CreateResponseRequest = {
      input: 'Test input',
      model: 'test-model',
      vector_store_ids: ['vector-store-1'],
      temperature: 0.7,
      stream: false,
    };

    const mockBackendResponse: BackendResponseData = {
      id: 'response-123',
      model: 'test-model',
      status: 'completed',
      created_at: 1755721063,
      output: [
        {
          id: 'output-1',
          type: 'completion_message',
          content: [
            {
              type: 'output_text',
              text: 'This is a test response',
            },
          ],
        },
      ],
      usage: {
        input_tokens: 10,
        output_tokens: 20,
        total_tokens: 30,
      },
    };

    const expectedSimplifiedResponse: SimplifiedResponseData = {
      id: 'response-123',
      model: 'test-model',
      status: 'completed',
      created_at: 1755721063,
      content: 'This is a test response',
      usage: {
        input_tokens: 10,
        output_tokens: 20,
        total_tokens: 30,
      },
    };

    describe('non-streaming', () => {
      it('should create response successfully', async () => {
        const mockResponse = { data: { data: mockBackendResponse } };
        mockedAxios.post.mockResolvedValueOnce(mockResponse);

        const result = await createResponse(mockRequest, testNamespace);

        expect(result).toEqual(expectedSimplifiedResponse);
        expect(mockedAxios.post).toHaveBeenCalledWith(
          `/gen-ai/api/v1/lsd/responses?namespace=${testNamespace}`,
          mockRequest,
        );
      });

      it('should handle response with no output', async () => {
        const responseWithoutOutput = {
          ...mockBackendResponse,
          output: undefined,
        };
        const mockResponse = { data: { data: responseWithoutOutput } };
        mockedAxios.post.mockResolvedValueOnce(mockResponse);

        const result = await createResponse(mockRequest, testNamespace);

        expect(result.content).toBe('');
      });

      it('should handle response with empty output array', async () => {
        const responseWithEmptyOutput = {
          ...mockBackendResponse,
          output: [],
        };
        const mockResponse = { data: { data: responseWithEmptyOutput } };
        mockedAxios.post.mockResolvedValueOnce(mockResponse);

        const result = await createResponse(mockRequest, testNamespace);

        expect(result.content).toBe('');
      });

      it('should handle API error', async () => {
        const mockError = {
          response: {
            data: {
              error: {
                message: 'Response generation failed',
              },
            },
          },
        };
        mockedAxios.post.mockRejectedValueOnce(mockError);

        await expect(createResponse(mockRequest, testNamespace)).rejects.toThrow(
          'Response generation failed',
        );
      });

      it('should handle error without response', async () => {
        const mockError = {};
        mockedAxios.post.mockRejectedValueOnce(mockError);

        await expect(createResponse(mockRequest, testNamespace)).rejects.toThrow(
          'Failed to generate responses',
        );
      });
    });

    describe('streaming', () => {
      const streamingRequest: CreateResponseRequest = {
        ...mockRequest,
        stream: true,
      };

      it('should handle streaming response successfully', async () => {
        const mockStreamData = jest.fn();

        // Clear axios defaults to prevent interference with fetch headers
        mockedAxios.defaults.headers.common = {};

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

        const result = await createResponse(streamingRequest, testNamespace, mockStreamData);

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
          `/gen-ai/api/v1/lsd/responses?namespace=${testNamespace}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'text/event-stream',
            },
            body: JSON.stringify(streamingRequest),
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

        const result = await createResponse(streamingRequest, testNamespace, mockStreamData);

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

        const result = await createResponse(streamingRequest, testNamespace, mockStreamData);

        expect(result.content).toBe(' World');
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
          createResponse(streamingRequest, testNamespace, mockStreamData),
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
          createResponse(streamingRequest, testNamespace, mockStreamData),
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
          createResponse(streamingRequest, testNamespace, mockStreamData),
        ).rejects.toThrow('Unable to read stream');
      });

      it('should handle fetch network error', async () => {
        const mockStreamData = jest.fn();

        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        await expect(
          createResponse(streamingRequest, testNamespace, mockStreamData),
        ).rejects.toThrow('Network error');
      });

      it('should include axios headers in streaming request', async () => {
        const mockStreamData = jest.fn();

        // Set up axios default headers
        mockedAxios.defaults.headers.common = {
          Authorization: 'Bearer test-token',
          'X-Custom-Header': 'custom-value',
        };

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

        await createResponse(streamingRequest, testNamespace, mockStreamData);

        expect(mockFetch).toHaveBeenCalledWith(
          `/gen-ai/api/v1/lsd/responses?namespace=${testNamespace}`,
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              Accept: 'text/event-stream',
              Authorization: 'Bearer test-token',
              'X-Custom-Header': 'custom-value',
            }),
            body: JSON.stringify(streamingRequest),
          }),
        );
      });
    });
  });

  describe('exportCode', () => {
    const mockRequest: CodeExportRequest = {
      input: 'Create a simple function',
      model: 'test-model',
      instructions: 'Generate Python code',
      temperature: 0.5,
    };

    const mockResponse: CodeExportResponse = {
      data: {
        code: 'def simple_function():\n    return "Hello World"',
      },
    };

    it('should export code successfully', async () => {
      const mockAxiosResponse = { data: mockResponse };
      mockedAxios.post.mockResolvedValueOnce(mockAxiosResponse);

      const result = await exportCode(mockRequest, testNamespace);

      expect(result).toEqual(mockResponse);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/gen-ai/api/v1/code-exporter?namespace=${testNamespace}`,
        mockRequest,
      );
    });

    it('should handle API error', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: 'Code export failed',
            },
          },
        },
      };
      mockedAxios.post.mockRejectedValueOnce(mockError);

      await expect(exportCode(mockRequest, testNamespace)).rejects.toThrow('Code export failed');
    });

    it('should handle error without response', async () => {
      const mockError = {};
      mockedAxios.post.mockRejectedValueOnce(mockError);

      await expect(exportCode(mockRequest, testNamespace)).rejects.toThrow('Failed to export code');
    });
  });

  describe('getLSDstatus', () => {
    const project = 'test-project';

    it('should get LSD status successfully', async () => {
      const mockResponse = { data: { data: mockLlamaStackDistribution } };
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await getLSDstatus(project);

      expect(result).toEqual(mockLlamaStackDistribution);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `/gen-ai/api/v1/lsd/status?namespace=${project}`,
      );
    });

    it('should handle API error', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: 'LSD status fetch failed',
            },
          },
        },
      };
      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(getLSDstatus(project)).rejects.toThrow('LSD status fetch failed');
    });

    it('should handle error without response', async () => {
      const mockError = {};
      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(getLSDstatus(project)).rejects.toThrow('Failed to fetch LSD status');
    });
  });

  describe('installLSD', () => {
    const project = 'test-project';
    const models = ['model-1', 'model-2', 'model-3'];

    it('should install LSD successfully', async () => {
      const mockResponse = { data: { data: mockLlamaStackDistribution } };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await installLSD(project, models);

      expect(result).toEqual(mockLlamaStackDistribution);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/gen-ai/api/v1/lsd/install?namespace=${project}`,
        { models },
      );
    });

    it('should handle API error with error message', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: 'Installation failed due to insufficient resources',
            },
          },
        },
      };
      mockedAxios.post.mockRejectedValueOnce(mockError);

      await expect(installLSD(project, models)).rejects.toThrow(
        'Installation failed due to insufficient resources',
      );
    });

    it('should handle network error', async () => {
      const mockError = new Error('Network connection failed');
      mockedAxios.post.mockRejectedValueOnce(mockError);

      await expect(installLSD(project, models)).rejects.toThrow('Network connection failed');
    });

    it('should handle error without response', async () => {
      const mockError = {};
      mockedAxios.post.mockRejectedValueOnce(mockError);

      await expect(installLSD(project, models)).rejects.toThrow('Failed to install LSD');
    });

    it('should handle empty models array', async () => {
      const mockResponse = { data: { data: mockLlamaStackDistribution } };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await installLSD(project, []);

      expect(result).toEqual(mockLlamaStackDistribution);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/gen-ai/api/v1/lsd/install?namespace=${project}`,
        { models: [] },
      );
    });
  });

  describe('deleteLSD', () => {
    const project = 'test-project';
    const lsdName = 'test-distribution';

    it('should delete LSD successfully', async () => {
      const mockResponse = { data: 'LSD deleted successfully' };
      mockedAxios.delete.mockResolvedValueOnce(mockResponse);

      const result = await deleteLSD(project, lsdName);

      expect(result).toBe('LSD deleted successfully');
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        `/gen-ai/api/v1/lsd/delete?namespace=${project}`,
        {
          data: { name: lsdName },
        },
      );
    });

    it('should handle API error with error message', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: 'Distribution not found',
            },
          },
        },
      };
      mockedAxios.delete.mockRejectedValueOnce(mockError);

      await expect(deleteLSD(project, lsdName)).rejects.toThrow('Distribution not found');
    });

    it('should handle network error', async () => {
      const mockError = new Error('Connection timeout');
      mockedAxios.delete.mockRejectedValueOnce(mockError);

      await expect(deleteLSD(project, lsdName)).rejects.toThrow('Connection timeout');
    });

    it('should handle error without response', async () => {
      const mockError = {};
      mockedAxios.delete.mockRejectedValueOnce(mockError);

      await expect(deleteLSD(project, lsdName)).rejects.toThrow('Failed to delete LSD');
    });

    it('should handle server error response', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: 'Internal server error',
            },
          },
        },
      };
      mockedAxios.delete.mockRejectedValueOnce(mockError);

      await expect(deleteLSD(project, lsdName)).rejects.toThrow('Internal server error');
    });

    it('should handle malformed error response', async () => {
      const mockError = {
        response: {
          data: 'Invalid response format',
        },
      };
      mockedAxios.delete.mockRejectedValueOnce(mockError);

      await expect(deleteLSD(project, lsdName)).rejects.toThrow('Failed to delete LSD');
    });
  });

  describe('URL_PREFIX environment variable', () => {
    it('should use custom URL_PREFIX when provided', async () => {
      jest.resetModules();
      process.env.URL_PREFIX = '/custom-prefix';

      const axiosModule = await import('~/app/utilities/axios');
      const localMockedAxios = axiosModule.default as unknown as { get: jest.Mock };
      localMockedAxios.get.mockResolvedValueOnce({ data: { data: mockLlamaModels } });

      const { getModels: getModelsWithPrefix } = await import('~/app/services/llamaStackService');

      await getModelsWithPrefix(testNamespace);
      expect(localMockedAxios.get).toHaveBeenCalledWith(
        `/custom-prefix/api/v1/lsd/models?namespace=${testNamespace}`,
      );
    });
  });
});
