/* eslint-disable camelcase */
/* eslint-disable no-relative-import-paths/no-relative-import-paths */
import {
  LlamaModel,
  LlamaModelType,
  VectorDB,
  ChatbotSourceSettings,
  Source,
  Query,
  QueryResponse,
  SuccessResponse,
} from '../types';
import axios from '../utilities/axios';
import { URL_PREFIX } from '../utilities/const';

/**
 * Fetches all available models from the Llama Stack API
 * @returns Promise<LlamaModel[]> - Array of available models with their metadata
 * @throws Error - When the API request fails or returns an error response
 */
export const getModels = (): Promise<LlamaModel[]> => {
  const url = `${URL_PREFIX}/api/v1/models`;
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
 * Fetches all available vector dbs from the Llama Stack API
 * @returns Promise<VectorDB[]> - Array of available vector dbs with their metadata
 * @throws Error - When the API request fails or returns an error response
 */
export const getVectorDBs = (): Promise<VectorDB[]> => {
  const url = `${URL_PREFIX}/api/v1/vector-dbs`;
  return axios
    .get(url)
    .then((response) => response.data.data.items)
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to fetch vector dbs',
      );
    });
};

/**
 * Registers a vector db with the Llama Stack API
 * @param vectorDB - The vector db to register
 * @returns Promise<void> - A promise that resolves when the vector db is registered
 * @throws Error - When the API request fails or returns an error response
 */
export const registerVectorDB = (
  vectorDBId: VectorDB,
  embeddingModel: string,
): Promise<{ message: string; vector_db_id: string }> => {
  const url = `${URL_PREFIX}/api/v1/vector-dbs`;
  return axios
    .post(url, {
      vector_db_id: vectorDBId,
      embedding_model: embeddingModel,
    })
    .then((response) => response.data)
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to register vector db',
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
  source: Source,
  settings: ChatbotSourceSettings,
): Promise<SuccessResponse> => {
  const url = `${URL_PREFIX}/api/v1/upload`;
  const payload = {
    documents: source.documents,
    vector_db_id: settings.vectorDB,
    embedding_model: settings.embeddingModel,
    chunk_size_in_tokens: parseInt(settings.maxChunkLength) || 500,
  };

  return axios
    .post(url, payload)
    .then((response) => response.data)
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
