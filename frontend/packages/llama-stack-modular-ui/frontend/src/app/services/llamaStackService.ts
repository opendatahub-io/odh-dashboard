/* eslint-disable camelcase */
/* eslint-disable no-relative-import-paths/no-relative-import-paths */
import {
  LlamaModel,
  LlamaModelType,
  VectorStore,
  ChatbotSourceSettings,
  Query,
  QueryResponse,
  FileUploadResult,
} from '../types';
import axios from '../utilities/axios';
import { URL_PREFIX } from '../utilities/const';

/**
 * Fetches all available models from the Llama Stack API
 * @returns Promise<LlamaModel[]> - Array of available models with their metadata
 * @throws Error - When the API request fails or returns an error response
 */
export const getModels = (): Promise<LlamaModel[]> => {
  const url = `${URL_PREFIX}/genai/v1/models`;
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
export const getModelsByType = (modelType: LlamaModelType): Promise<LlamaModel[]> => {
  const url = `${URL_PREFIX}/api/v1/models?model_type=${modelType}`;
  return axios
    .get(url)
    .then((response) => response.data.data.items)
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to fetch models',
      );
    });
};

/**
 * Fetches all available vector stores from the Llama Stack API
 * @returns Promise<VectorStore[]> - Array of available vector stores with their metadata
 * @throws Error - When the API request fails or returns an error response
 */
export const getVectorStores = (): Promise<VectorStore[]> => {
  const url = `${URL_PREFIX}/genai/v1/vectorstores`;
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
 * @param vectorStoreId - The vector store identifier
 * @param embeddingModel - The embedding model to use
 * @returns Promise<VectorStore> - A promise that resolves with the created vector store
 * @throws Error - When the API request fails or returns an error response
 */
export const createVectorStore = (vectorName: string): Promise<VectorStore> => {
  const url = `${URL_PREFIX}/genai/v1/vectorstores`;
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
 * @param source - The source to upload
 * @param settings - The settings for the source
 * @returns Promise<void> - A promise that resolves when the source is uploaded
 * @throws Error - When the API request fails or returns an error response
 */
export const uploadSource = (
  file: File,
  settings: ChatbotSourceSettings,
): Promise<FileUploadResult> => {
  const url = `${URL_PREFIX}/genai/v1/files/upload`;

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
 * Queries a source from the Llama Stack API
 * @param query - The query to execute
 * @returns Promise<QueryResponse> - A promise that resolves with the query response
 * @throws Error - When the API request fails or returns an error response
 */
export const querySource = (query: Query): Promise<QueryResponse> => {
  const url = `${URL_PREFIX}/api/v1/query`;
  return axios
    .post(url, query)
    .then((response) => response.data)
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to query source',
      );
    });
};
