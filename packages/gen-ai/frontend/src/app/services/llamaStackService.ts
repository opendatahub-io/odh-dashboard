/* eslint-disable camelcase */
/* eslint-disable no-relative-import-paths/no-relative-import-paths */
import {
  VectorStore,
  ChatbotSourceSettings,
  CreateResponseRequest,
  SimplifiedResponseData,
  BackendResponseData,
  OutputItem,
  LlamaModel,
  FileUploadResult,
  CodeExportRequest,
  CodeExportResponse,
  LlamaStackDistributionModel,
  AAModelResponse,
} from '../types';
import axios from '../utilities/axios';
import { URL_PREFIX } from '../utilities/const';

/**
 * Extracts text content from the backend response output array
 * @param output - Array of output items from backend response
 * @returns string - Concatenated text content
 */
const extractContentFromOutput = (output?: OutputItem[]): string => {
  if (!output || output.length === 0) {
    return '';
  }

  let content = '';
  for (const item of output) {
    if (item.content && Array.isArray(item.content)) {
      for (const contentItem of item.content) {
        if (contentItem.type === 'output_text' && contentItem.text) {
          content += contentItem.text;
        }
      }
    }
  }

  return content;
};

/**
 * Transforms backend response to frontend-friendly format
 * @param backendResponse - Response from backend API
 * @returns SimplifiedResponseData - Frontend-friendly response
 */
const transformBackendResponse = (
  backendResponse: BackendResponseData,
): SimplifiedResponseData => ({
  id: backendResponse.id,
  model: backendResponse.model,
  status: backendResponse.status,
  created_at: backendResponse.created_at,
  content: extractContentFromOutput(backendResponse.output),
  usage: backendResponse.usage,
});

/**
 * Fetches all available models from the Llama Stack API
 * @returns Promise<LlamaModel[]> - Array of available models with their metadata
 * @throws Error - When the API request fails or returns an error response
 */
export const getModels = (namespace: string): Promise<LlamaModel[]> => {
  const url = `${URL_PREFIX}/api/v1/models?namespace=${namespace}`;
  return axios
    .get(url)
    .then((response) => response.data.data ?? [])
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to fetch models',
      );
    });
};

/**
 * Fetches all available vector stores from the Llama Stack API
 * @param namespace - The namespace to fetch vector stores from
 * @returns Promise<VectorStore[]> - Array of available vector stores with their metadata
 * @throws Error - When the API request fails or returns an error response
 */
export const getVectorStores = (namespace: string): Promise<VectorStore[]> => {
  const url = `${URL_PREFIX}/api/v1/vectorstores?namespace=${namespace}`;
  return axios
    .get(url)
    .then((response) => response.data.data)
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to fetch vector stores',
      );
    });
};

/**
 * Creates a vector store with the Llama Stack API
 * @param vectorName - The name of the vector store to create
 * @param namespace - The namespace to create the vector store in
 * @returns Promise<VectorStore> - A promise that resolves with the created vector store
 * @throws Error - When the API request fails or returns an error response
 */
export const createVectorStore = (vectorName: string, namespace: string): Promise<VectorStore> => {
  const url = `${URL_PREFIX}/api/v1/vectorstores?namespace=${namespace}`;
  return axios
    .post(url, {
      name: vectorName,
    })
    .then((response) => response.data.data)
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to create vector store',
      );
    });
};

/**
 * Uploads a source to the Llama Stack API
 * @param file - The file to upload
 * @param settings - The settings for the source
 * @param namespace - The namespace to upload the source to
 * @returns Promise<FileUploadResult> - A promise that resolves when the source is uploaded
 * @throws Error - When the API request fails or returns an error response
 */
export const uploadSource = (
  file: File,
  settings: ChatbotSourceSettings,
  namespace: string,
): Promise<FileUploadResult> => {
  const url = `${URL_PREFIX}/api/v1/files/upload?namespace=${namespace}`;

  // Create FormData for multipart/form-data upload
  const formData = new FormData();
  formData.append('file', file);
  if (settings.chunkOverlap) {
    formData.append('chunk_overlap_tokens', String(settings.chunkOverlap));
  }
  if (settings.maxChunkLength) {
    formData.append('max_chunk_size_tokens', String(settings.maxChunkLength));
  }
  formData.append('vector_store_id', settings.vectorStore);

  return axios
    .post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    .then((response) => response.data.data)
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to upload source',
      );
    });
};

/**
 * Request to generate AI responses with RAG and conversation context.
 * @param request - CreateResponseRequest payload for /gen-ai/api/v1/responses.
 * @param namespace - The namespace to generate responses in
 * @param onStreamData - Optional callback for streaming data chunks
 * @returns Promise<SimplifiedResponseData> - The generated response object.
 * @throws Error - When the API request fails or returns an error response.
 */
export const createResponse = (
  request: CreateResponseRequest,
  namespace: string,
  onStreamData?: (chunk: string) => void,
): Promise<SimplifiedResponseData> => {
  const url = `${URL_PREFIX}/api/v1/responses?namespace=${namespace}`;

  if (request.stream && onStreamData) {
    // Handle streaming response using fetch with text/event-stream
    return new Promise((resolve, reject) => {
      // Get axios default headers to maintain consistency
      const axiosHeaders = axios.defaults.headers.common;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      };

      // Add axios headers if they exist, converting to string format
      Object.entries(axiosHeaders).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers[key] = value;
        }
      });

      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      })
        .then(async (response) => {
          if (!response.ok) {
            // Try to get error message from response body if available
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
              const errorBody = await response.text();
              const errorData = JSON.parse(errorBody);
              errorMessage = errorData?.error?.message || errorMessage;
            } catch {
              // Use default error message if parsing fails
            }
            throw new Error(errorMessage);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('Unable to read stream');
          }

          let fullContent = '';
          const decoder = new TextDecoder();

          try {
            let done = false;
            while (!done) {
              const result = await reader.read();
              done = result.done;

              if (!done && result.value) {
                const chunk = decoder.decode(result.value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(line.slice(6));
                      // Handle streaming deltas from response.output_text.delta events
                      if (data.delta && data.type === 'response.output_text.delta') {
                        fullContent += data.delta;
                        onStreamData(data.delta);
                      }
                    } catch {
                      // Ignore parsing errors for individual chunks - this is expected for malformed chunks
                    }
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }

          resolve({
            id: 'streaming-response',
            model: request.model,
            status: 'completed',
            created_at: Date.now(),
            content: fullContent,
          });
        })
        .catch((error) => {
          // Use consistent error handling with non-streaming path
          const errorMessage = error.message || 'Failed to generate streaming response';
          reject(new Error(errorMessage));
        });
    });
  }

  // Handle non-streaming response
  return axios
    .post(url, request)
    .then((response) => {
      const backendResponse: BackendResponseData = response.data.data;
      return transformBackendResponse(backendResponse);
    })
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to generate responses',
      );
    });
};

/**
 * Export code based on user input and configuration
 * @param request - CodeExportRequest payload for /genai/v1/code-exporter.
 * @returns Promise<CodeExportResponse> - The generated code export response.
 * @throws Error - When the API request fails or returns an error response.
 */
export const exportCode = (
  request: CodeExportRequest,
  namespace: string,
): Promise<CodeExportResponse> => {
  const url = `${URL_PREFIX}/api/v1/code-exporter?namespace=${namespace}`;
  return axios
    .post(url, request)
    .then((response) => response.data)
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to export code',
      );
    });
};

export const getLSDstatus = (project: string): Promise<LlamaStackDistributionModel> => {
  const url = `${URL_PREFIX}/api/v1/llamastack-distribution/status?namespace=${project}`;
  return axios
    .get(url)
    .then((response) => response.data.data)
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to fetch LSD status',
      );
    });
};

/**
 * Fetches all available AI models from the AI Assets API
 * @param namespace - The namespace to fetch models for
 * @returns Promise<AAModelResponse[]> - Array of available AI models with their metadata
 * @throws Error - When the API request fails or returns an error response
 */
export const getAAModels = (namespace: string): Promise<AAModelResponse[]> => {
  const url = `${URL_PREFIX}/api/v1/aa/models?namespace=${namespace}`;
  return axios
    .get(url)
    .then((response) => response.data.data ?? [])
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to fetch AA models',
      );
    });
};

export const installLSD = (
  project: string,
  models: string[],
): Promise<LlamaStackDistributionModel> => {
  const url = `${URL_PREFIX}/api/v1/llamastack-distribution/install?namespace=${project}`;
  return axios
    .post(url, { models })
    .then((response) => response.data.data)
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to install LSD',
      );
    });
};

export const deleteLSD = (project: string, lsdName: string): Promise<string> => {
  const url = `${URL_PREFIX}/api/v1/llamastack-distribution/delete?namespace=${project}`;
  return axios
    .delete(url, {
      data: { name: lsdName },
    })
    .then((response) => response.data)
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to delete LSD',
      );
    });
};
