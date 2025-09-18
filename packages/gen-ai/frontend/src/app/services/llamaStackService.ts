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
 * @returns Promise<SimplifiedResponseData> - The generated response object.
 * @throws Error - When the API request fails or returns an error response.
 */
export const createResponse = (
  request: CreateResponseRequest,
  namespace: string,
): Promise<SimplifiedResponseData> => {
  const url = `${URL_PREFIX}/api/v1/responses?namespace=${namespace}`;
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
