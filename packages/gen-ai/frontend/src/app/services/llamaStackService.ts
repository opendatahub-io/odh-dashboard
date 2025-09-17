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
  LlamaStackDistributionModel,
} from '../types';
import { AIModel } from '../AIAssets/types';
import axios from '../utilities/axios';
import { URL_PREFIX } from '../utilities/const';

// Interface for the raw API response from BFF
interface AAModelResponse {
  model_name: string;
  serving_runtime: string;
  api_protocol: string;
  version: string;
  usecase: string;
  description: string;
  endpoints: string[];
}

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
 * @returns Promise<VectorStore[]> - Array of available vector stores with their metadata
 * @throws Error - When the API request fails or returns an error response
 */
export const getVectorStores = (): Promise<VectorStore[]> => {
  const url = `${URL_PREFIX}/api/v1/vectorstores`;
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
  const url = `${URL_PREFIX}/api/v1/vectorstores`;
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
  const url = `${URL_PREFIX}/api/v1/files/upload`;

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
 * @returns Promise<SimplifiedResponseData> - The generated response object.
 * @throws Error - When the API request fails or returns an error response.
 */
export const createResponse = (request: CreateResponseRequest): Promise<SimplifiedResponseData> => {
  const url = `${URL_PREFIX}/api/v1/responses`;
  return axios
    .post(url, request)
    .then((response) => response.data.data)
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to generate responses',
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
 * @returns Promise<AIModel[]> - Array of available AI models with their metadata
 * @throws Error - When the API request fails or returns an error response
 */
export const getAIModels = (namespace: string): Promise<AIModel[]> => {
  const url = `${URL_PREFIX}/api/v1/aa/models?namespace=${namespace}`;
  return axios
    .get(url)
    .then((response) => {
      // Transform the API response to match our AIModel interface
      const data = response.data.data || response.data;
      return data.map((item: AAModelResponse, index: number) => {
        // Parse endpoints to extract internal and external endpoints
        const internalEndpoint =
          item.endpoints.find((ep) => ep.startsWith('internal:'))?.replace('internal: ', '') ||
          null;
        const externalEndpoint =
          item.endpoints.find((ep) => ep.startsWith('external:'))?.replace('external: ', '') ||
          null;

        return {
          id: `model-${index}`,
          name: item.model_name,
          description: item.description || 'No description available',
          internalEndpoint,
          externalEndpoint,
          useCase: item.usecase || 'General purpose',
          playgroundStatus: 'available', // All models are available for playground
          deploymentName: item.model_name,
          // Fields from BFF API response
          modelName: item.model_name,
          apiProtocol: item.api_protocol,
          version: item.version,
          servingRuntime: item.serving_runtime,
          endpoints: item.endpoints,
        };
      });
    })
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to fetch AI models',
      );
    });
};
