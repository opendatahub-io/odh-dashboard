/* eslint-disable camelcase */
import { isAxiosError } from 'axios';
import axiosInstance from '~/app/utilities/axios';
import {
  BackendResponseData,
  ChatbotSourceSettings,
  CodeExportRequest,
  CodeExportResponse,
  CreateResponseRequest,
  FileUploadResult,
  FileModel,
  LlamaModel,
  LlamaModelType,
  LlamaStackDistributionModel,
  AAModelResponse,
  MCPConnectionStatus,
  MCPErrorResponse,
  MCPServersResponse,
  MCPToolsResponse,
  MCPToolsStatus,
  OutputItem,
  SimplifiedResponseData,
  VectorStore,
  VectorStoreFile,
} from '~/app/types';
import { URL_PREFIX, extractMCPToolCallData } from '~/app/utilities';

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
const transformBackendResponse = (backendResponse: BackendResponseData): SimplifiedResponseData => {
  const toolCallData = extractMCPToolCallData(backendResponse.output);

  return {
    id: backendResponse.id,
    model: backendResponse.model,
    status: backendResponse.status,
    created_at: backendResponse.created_at,
    content: extractContentFromOutput(backendResponse.output),
    usage: backendResponse.usage,
    ...(toolCallData && { toolCallData }),
  };
};

/**
 * Fetches all available models from the Llama Stack API
 * @returns Promise<LlamaModel[]> - Array of available models with their metadata
 * @throws Error - When the API request fails or returns an error response
 */
export const getModels = (namespace: string): Promise<LlamaModel[]> => {
  const url = `${URL_PREFIX}/api/v1/lsd/models?namespace=${namespace}`;
  return axiosInstance
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
  const url = `${URL_PREFIX}/api/v1/aaa/models?model_type=${modelType}`;
  return axiosInstance
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
  const url = `${URL_PREFIX}/api/v1/lsd/vectorstores?namespace=${namespace}`;
  return axiosInstance
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
  const url = `${URL_PREFIX}/api/v1/lsd/vectorstores?namespace=${namespace}`;
  return axiosInstance
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
 * Fetches files from a specific vector store
 * @param namespace - The namespace containing the vector store
 * @param vectorStoreId - The ID of the vector store to get files from
 * @param limit - Optional limit for number of files to return (default: 20)
 * @param order - Optional sort order by creation timestamp (asc/desc, default: desc)
 * @param filter - Optional filter by file status (completed, in_progress, failed, cancelled)
 * @returns Promise<VectorStoreFile[]> - Array of files in the vector store
 * @throws Error - When the API request fails or returns an error response
 */
export const listVectorStoreFiles = (
  namespace: string,
  vectorStoreId: string,
  limit?: number,
  order?: 'asc' | 'desc',
  filter?: string,
): Promise<VectorStoreFile[]> => {
  const params = new URLSearchParams();
  params.append('namespace', namespace);
  params.append('vector_store_id', vectorStoreId);
  if (limit) {
    params.append('limit', limit.toString());
  }
  if (order) {
    params.append('order', order);
  }
  if (filter) {
    params.append('filter', filter);
  }

  const url = `${URL_PREFIX}/api/v1/lsd/vectorstores/files?${params.toString()}`;
  return axiosInstance
    .get(url)
    .then((response) => response.data.data)
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message ||
          error.message ||
          'Failed to fetch vector store files',
      );
    });
};

/**
 * Deletes a file from a vector store
 * @param namespace - The namespace containing the vector store
 * @param vectorStoreId - The ID of the vector store containing the file
 * @param fileId - The ID of the file to delete
 * @returns Promise<{deleted: boolean, id: string, object: string}> - Delete confirmation response
 * @throws Error - When the API request fails or returns an error response
 */
export const deleteVectorStoreFile = (
  namespace: string,
  vectorStoreId: string,
  fileId: string,
): Promise<{ deleted: boolean; id: string; object: string }> => {
  const params = new URLSearchParams();
  params.append('namespace', namespace);
  params.append('vector_store_id', vectorStoreId);
  params.append('file_id', fileId);

  const url = `${URL_PREFIX}/api/v1/lsd/vectorstores/files/delete?${params.toString()}`;
  return axiosInstance
    .delete(url)
    .then((response) => response.data.data)
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message ||
          error.message ||
          'Failed to delete vector store file',
      );
    });
};

/**
 * Fetches all uploaded files from the Llama Stack API
 * @param namespace - The namespace to fetch files from
 * @param limit - Optional limit for number of files to return (default: 20)
 * @param order - Optional sort order by creation timestamp (asc/desc, default: desc)
 * @param purpose - Optional filter by file purpose (e.g., "assistants")
 * @returns Promise<FileModel[]> - Array of uploaded files with their metadata
 * @throws Error - When the API request fails or returns an error response
 */
export const listFiles = (
  namespace: string,
  limit?: number,
  order?: 'asc' | 'desc',
  purpose?: string,
): Promise<FileModel[]> => {
  const params = new URLSearchParams();
  params.append('namespace', namespace);
  if (limit) {
    params.append('limit', limit.toString());
  }
  if (order) {
    params.append('order', order);
  }
  if (purpose) {
    params.append('purpose', purpose);
  }

  const url = `${URL_PREFIX}/api/v1/lsd/files?${params.toString()}`;
  return axiosInstance
    .get(url)
    .then((response) => response.data.data)
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to fetch files',
      );
    });
};

/**
 * Deletes a file from the Llama Stack API
 * @param fileId - The ID of the file to delete
 * @param namespace - The namespace containing the file
 * @returns Promise<void> - A promise that resolves when the file is deleted
 * @throws Error - When the API request fails or returns an error response
 */
export const deleteFile = (fileId: string, namespace: string): Promise<void> => {
  const url = `${URL_PREFIX}/api/v1/lsd/files/delete?namespace=${namespace}&file_id=${fileId}`;
  return axiosInstance
    .delete(url)
    .then(() => undefined)
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to delete file',
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
  const url = `${URL_PREFIX}/api/v1/lsd/files/upload?namespace=${namespace}`;

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

  return axiosInstance
    .post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    .then((response) => response.data.data)
    .catch((error) => {
      throw new Error(error.response?.data?.message || error.message || 'Failed to upload source');
    });
};

/**
 * Request to generate AI responses with RAG and conversation context.
 * @param request - CreateResponseRequest payload for /gen-ai/api/v1/lsd/responses.
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
  const url = `${URL_PREFIX}/api/v1/lsd/responses?namespace=${namespace}`;

  if (request.stream && onStreamData) {
    // Handle streaming response using fetch with text/event-stream
    return new Promise((resolve, reject) => {
      // Get axios default headers to maintain consistency
      const axiosHeaders = axiosInstance.defaults.headers.common;
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
          let completeResponseData: BackendResponseData | null = null;
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
                      // Capture the complete response data when streaming completes
                      else if (data.type === 'response.completed' && data.response) {
                        completeResponseData = data.response;
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

          // Extract tool call data from complete response if available
          const toolCallData = completeResponseData?.output
            ? extractMCPToolCallData(completeResponseData.output)
            : undefined;

          resolve({
            id: completeResponseData?.id || 'streaming-response',
            model: completeResponseData?.model || request.model,
            status: completeResponseData?.status || 'completed',
            created_at: completeResponseData?.created_at || Date.now(),
            content: fullContent,
            ...(toolCallData && { toolCallData }),
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
  return axiosInstance
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
  return axiosInstance
    .post(url, request)
    .then((response) => response.data)
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to export code',
      );
    });
};

export const getLSDstatus = (project: string): Promise<LlamaStackDistributionModel> => {
  const url = `${URL_PREFIX}/api/v1/lsd/status?namespace=${project}`;
  return axiosInstance
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
  const url = `${URL_PREFIX}/api/v1/aaa/models?namespace=${namespace}`;
  return axiosInstance
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
  const url = `${URL_PREFIX}/api/v1/lsd/install?namespace=${project}`;
  return axiosInstance
    .post(url, { models })
    .then((response) => response.data.data)
    .catch((error) => {
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Failed to install LSD',
      );
    });
};

export const deleteLSD = (project: string, lsdName: string): Promise<string> => {
  const url = `${URL_PREFIX}/api/v1/lsd/delete?namespace=${project}`;
  return axiosInstance
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

  const url = `${URL_PREFIX}/api/v1/aaa/mcps`;
  return axiosInstance
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

  return axiosInstance
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

  return axiosInstance
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
