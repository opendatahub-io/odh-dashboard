/* eslint-disable camelcase */
/* eslint-disable no-relative-import-paths/no-relative-import-paths */
import { isAxiosError } from 'axios';
import {
  LlamaModelType,
  VectorStore,
  ChatbotSourceSettings,
  CreateResponseRequest,
  SimplifiedResponseData,
  LlamaModel,
  NamespaceModel,
  FileUploadResult,
  LlamaStackDistributionModel,
  MCPServersResponse,
  MCPErrorResponse,
  MCPConnectionStatus,
  MCPToolsStatus,
  MCPToolsResponse,
} from '../types';
import axios from '../utilities/axios';
import { URL_PREFIX } from '../utilities/const';

/**
 * Fetches all available namespaces from the Llama Stack API
 * @returns Promise<NamespaceModel[]> - Array of available namespaces with their metadata
 * @throws Error - When the API request fails or returns an error response
 */
export const getNamespaces = (): Promise<NamespaceModel[]> => {
  const url = `${URL_PREFIX}/api/v1/namespaces`;
  return axios
    .get<{ data: NamespaceModel[] }>(url)
    .then((response) => response.data.data)
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to fetch namespaces',
      );
    });
};

/**
 * Fetches all available models from the Llama Stack API
 * @returns Promise<LlamaModel[]> - Array of available models with their metadata
 * @throws Error - When the API request fails or returns an error response
 */
export const getModels = (): Promise<LlamaModel[]> => {
  const url = `${URL_PREFIX}/api/v1/models`;
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
 * Fetches MCP servers from the cluster ConfigMap for a specific namespace
 * @param namespace - The namespace (project) to fetch MCP servers from
 * @returns Promise<MCPServersResponse> - MCP servers data with ConfigMap metadata
 * @throws Error - When the API request fails, ConfigMap doesn't exist, or insufficient permissions
 */
export const getMCPServers = (namespace: string): Promise<MCPServersResponse> => {
  if (!namespace || namespace.trim() === '') {
    throw new Error('Namespace parameter is required');
  }

  const url = `${URL_PREFIX}/api/v1/aa/mcps`;
  return axios
    .get<{ data: MCPServersResponse }>(url, {
      params: { namespace: namespace.trim() },
    })
    .then((response) => response.data.data)
    .catch((error) => {
      // Handle specific error cases from the BFF
      if (error.response?.status === 404) {
        const errorData: MCPErrorResponse = error.response.data;
        throw new Error(
          errorData.error.message ||
            `ConfigMap not found in namespace '${namespace}'. The MCP servers ConfigMap may not be deployed yet.`,
        );
      }

      if (error.response?.status === 403) {
        const errorData: MCPErrorResponse = error.response.data;
        throw new Error(
          errorData.error.message ||
            `Access denied to ConfigMap in namespace '${namespace}'. Check your permissions.`,
        );
      }

      if (error.response?.status === 400) {
        throw new Error(`Invalid namespace parameter: ${namespace}`);
      }

      // Generic error handling
      const message = error.response?.data?.error?.message || error.message;
      throw new Error(`Failed to fetch MCP servers: ${message}`);
    });
};

export const getMCPServerStatus = (
  namespace: string,
  serverUrl: string,
  mcpBearerToken?: string,
): Promise<MCPConnectionStatus> => {
  if (!namespace || namespace.trim() === '') {
    throw new Error('Namespace parameter is required');
  }
  if (!serverUrl || serverUrl.trim() === '') {
    throw new Error('Server URL parameter is required');
  }

  const url = `${URL_PREFIX}/api/v1/mcp/status`;
  const encodedServerUrl = encodeURIComponent(serverUrl.trim());

  // Prepare headers
  const headers: Record<string, string> = {};
  if (mcpBearerToken) {
    headers['X-MCP-Bearer'] = mcpBearerToken.startsWith('Bearer ')
      ? mcpBearerToken
      : `Bearer ${mcpBearerToken}`;
  }

  return axios
    .get<{ data: MCPConnectionStatus }>(url, {
      params: {
        namespace: namespace.trim(),
        server_url: encodedServerUrl,
      },
      headers,
    })
    .then((response) => response.data.data)
    .catch((error) => {
      // Handle BFF-level errors
      if (error.response?.status === 404) {
        const errorData: MCPErrorResponse = error.response.data;
        throw new Error(errorData.error.message || `Server not found in ConfigMap: ${serverUrl}`);
      }

      if (error.response?.status === 401) {
        throw new Error(`Authentication failed for namespace '${namespace}'`);
      }

      if (error.response?.status === 403) {
        throw new Error(`Access denied to namespace '${namespace}'`);
      }

      if (error.response?.status === 400) {
        const errorData: MCPErrorResponse = error.response.data;
        throw new Error(
          errorData.error.message ||
            `Invalid parameters: namespace=${namespace}, server_url=${serverUrl}`,
        );
      }

      // Generic error handling
      const message = error.response?.data?.error?.message || error.message;
      throw new Error(`Failed to check MCP server status: ${message}`);
    });
};

export const getMCPServerTools = (
  namespace: string,
  serverUrl: string,
  mcpBearerToken?: string,
): Promise<MCPToolsStatus> => {
  const encodedServerUrl = encodeURIComponent(serverUrl);
  const url = `/gen-ai/api/v1/mcp/tools?namespace=${encodeURIComponent(namespace)}&server_url=${encodedServerUrl}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add MCP Bearer token if provided
  if (mcpBearerToken && mcpBearerToken.trim() !== '') {
    const token = mcpBearerToken.startsWith('Bearer ')
      ? mcpBearerToken
      : `Bearer ${mcpBearerToken}`;
    headers['X-MCP-Bearer'] = token;
  }

  return axios
    .get(url, { headers })
    .then((response) => {
      const responseData: MCPToolsResponse = response.data;
      return responseData.data;
    })
    .catch((error) => {
      if (isAxiosError(error) && error.response) {
        const { status } = error.response;
        const errorData: MCPErrorResponse = error.response.data;

        // Create a structured error response that matches MCPToolsStatus
        const errorResponse: MCPToolsStatus = {
          server_url: serverUrl,
          status: 'error',
          message: errorData.error.message || `HTTP ${status}: Server error`,
          last_checked: Date.now(),
          server_info: {
            name: 'unknown',
            version: 'N/A',
            protocol_version: '',
          },
          tools: [],
          error_details: {
            code: errorData.error.code || 'CONNECTION_FAILED',
            status_code: status,
            raw_error: errorData.error.message || `HTTP ${status}: Server error`,
          },
        };

        return errorResponse;
      }

      // Network or other errors
      const errorResponse: MCPToolsStatus = {
        server_url: serverUrl,
        status: 'error',
        message: 'Connection failed',
        last_checked: Date.now(),
        server_info: {
          name: 'unknown',
          version: 'N/A',
          protocol_version: '',
        },
        tools: [],
        error_details: {
          code: 'CONNECTION_FAILED',
          status_code: 503,
          raw_error: error instanceof Error ? error.message : 'Unknown connection error',
        },
      };

      return errorResponse;
    });
};
