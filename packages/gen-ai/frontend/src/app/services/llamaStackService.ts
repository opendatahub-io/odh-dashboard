/* eslint-disable camelcase */
/* eslint-disable no-relative-import-paths/no-relative-import-paths */
import {
  LlamaModelType,
  VectorStore,
  ChatbotSourceSettings,
  CreateResponseRequest,
  SimplifiedResponseData,
  LlamaModel,
  FileUploadResult,
  CodeExportRequest,
  CodeExportResponse,
  LlamaStackDistributionModel,
} from '../types';
import axios from '../utilities/axios';
import { URL_PREFIX } from '../utilities/const';

/**
 * Fetches all available models from the Llama Stack API
 * @returns Promise<LlamaModel[]> - Array of available models with their metadata
 * @throws Error - When the API request fails or returns an error response
 */
export const getModels = (namespace: string): Promise<LlamaModel[]> => {
  const url = `${URL_PREFIX}/api/v1/models?namespace=${namespace}`;
  return axios
    .get(url)
    .then((response) => response.data.data)
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to fetch models',
      );
    });
};

/**
 * Fetches models filtered by a specific model type from the Llama Stack API
 * @param modelType - The type of models to fetch (e.g., 'llm' or 'embedding')
 * @returns Promise<LlamaModel[]> - Array of models matching the specified type
 * @throws Error - When the API request fails or returns an error response
 */
//TODO: This does not work as expected. It returns all models, not just the ones of the specified type.
//Should be fixed by updating the API to return only the models of the specified type.
//Leaving this here as a reminder for now as it is not being used anywhere.
export const getModelsByType = (modelType: LlamaModelType): Promise<LlamaModel[]> => {
  const url = `${URL_PREFIX}/api/v1/models?model_type=${modelType}`;
  return axios
    .get(url)
    .then((response) => response.data.data)
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
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(request),
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
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
                      if (data.content) {
                        fullContent += data.content;
                        onStreamData(data.content);
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
          reject(new Error(error.message || 'Failed to generate streaming response'));
        });
    });
  }

  // Handle non-streaming response
  return axios
    .post(url, request)
    .then((response) => response.data.data)
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
