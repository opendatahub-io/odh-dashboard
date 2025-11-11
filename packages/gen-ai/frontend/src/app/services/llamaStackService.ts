/* eslint-disable camelcase */
import {
  APIOptions,
  handleRestFailures,
  isModArchResponse,
  restCREATE,
  restDELETE,
  restGET,
} from 'mod-arch-core';
import {
  BackendResponseData,
  CodeExportRequest,
  CreateResponseRequest,
  FileUploadResult,
  LlamaModel,
  LlamaStackDistributionModel,
  MaaSModel,
  MaaSTokenRequest,
  MaaSTokenResponse,
  MCPConnectionStatus,
  MCPServersResponse,
  MCPToolsStatus,
  OutputItem,
  SimplifiedResponseData,
  VectorStore,
  VectorStoreFile,
  CodeExportData,
  InstallLSDRequest,
  DeleteLSDRequest,
  AAModelResponse,
  CreateVectorStoreRequest,
  ModArchRestDELETE,
  ModArchRestCREATE,
  ModArchRestGET,
} from '~/app/types';
import { URL_PREFIX, extractMCPToolCallData } from '~/app/utilities';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getStatusCodeFromError = (error: unknown): number | undefined => {
  if (isRecord(error) && 'status' in error) {
    const raw = error.status;
    if (typeof raw === 'number') {
      return raw;
    }
  }
  return undefined;
};

const getMessageFromError = (error: unknown): string | undefined => {
  if (isRecord(error)) {
    const nestedCandidate = error.error;
    if (isRecord(nestedCandidate) && 'message' in nestedCandidate) {
      const nestedMsg = nestedCandidate.message;
      if (typeof nestedMsg === 'string') {
        return nestedMsg;
      }
    }
    if ('message' in error) {
      const topMsg = error.message;
      if (typeof topMsg === 'string') {
        return topMsg;
      }
    }
  }
  return undefined;
};

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

// Non-streaming POST path via mod-arch restCREATE
const toCreateResponseRecord = (r: CreateResponseRequest): Record<string, unknown> => ({
  input: r.input,
  model: r.model,
  vector_store_ids: r.vector_store_ids,
  chat_context: r.chat_context,
  temperature: r.temperature,
  instructions: r.instructions,
  stream: r.stream,
  mcp_servers: r.mcp_servers,
});

const postCreateResponse = (
  hostPath: string,
  baseQueryParams: Record<string, unknown>,
  request: CreateResponseRequest,
  opts?: APIOptions,
): Promise<SimplifiedResponseData> =>
  modArchRestCREATE<BackendResponseData, Record<string, unknown>>('/lsd/responses')(
    hostPath,
    baseQueryParams,
  )(toCreateResponseRecord(request), opts).then((data) => transformBackendResponse(data));

// Streaming POST path via fetch (SSE text/event-stream)
const streamCreateResponse = (
  url: string,
  request: CreateResponseRequest,
  onStreamData: (chunk: string) => void,
): Promise<SimplifiedResponseData> =>
  new Promise((resolve, reject) => {
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
          let errorMessage = `HTTP error! status: ${response.status}`;
          try {
            const errorBody = await response.text();
            const errorData = JSON.parse(errorBody);
            errorMessage = errorData?.error?.message || errorMessage;
          } catch {
            // ignore
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

                    if (data.error) {
                      await reader.cancel('Streaming error');
                      const errMsg = data.error.message || 'An error occurred during streaming';
                      reject(new Error(errMsg));
                      return;
                    }

                    if (data.delta && data.type === 'response.output_text.delta') {
                      fullContent += data.delta;
                      onStreamData(data.delta);
                    } else if (data.type === 'response.completed' && data.response) {
                      completeResponseData = data.response;
                    }
                  } catch {
                    // ignore malformed lines
                  }
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

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
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to generate streaming response';
        reject(new Error(errorMessage));
      });
  });

/**
 * Request to generate AI responses with RAG and conversation context.
 * @param request - CreateResponseRequest payload for /gen-ai/api/v1/lsd/responses.
 * @param namespace - The namespace to generate responses in
 * @param onStreamData - Optional callback for streaming data chunks
 * @returns Promise<SimplifiedResponseData> - The generated response object.
 * @throws Error - When the API request fails or returns an error response.
 */
export const createResponse =
  (hostPath: string, baseQueryParams: Record<string, unknown> = {}) =>
  (
    data: CreateResponseRequest,
    opts: APIOptions & { onStreamData?: (chunk: string) => void } = {},
  ): Promise<SimplifiedResponseData> => {
    if (data.stream && opts.onStreamData) {
      const url = buildApiUrl(hostPath, '/lsd/responses', baseQueryParams);
      return streamCreateResponse(url, data, opts.onStreamData);
    }
    return postCreateResponse(hostPath, baseQueryParams, data, opts);
  };

const modArchRestGET =
  <T>(path: string) =>
  (hostPath: string, baseQueryParams: Record<string, unknown> = {}): ModArchRestGET<T> =>
  (queryParams: Record<string, unknown> = {}, opts: APIOptions = {}) =>
    handleRestFailures(
      restGET<T>(hostPath, path, { ...baseQueryParams, ...queryParams }, opts),
    ).then((response) => {
      if (isModArchResponse<T>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

const modArchRestCREATE =
  <T, D extends Record<string, unknown> | FormData>(path: string) =>
  (hostPath: string, baseQueryParams: Record<string, unknown> = {}): ModArchRestCREATE<T, D> =>
  (data: D, opts: APIOptions = {}) =>
    handleRestFailures(restCREATE<T>(hostPath, path, data, baseQueryParams, opts)).then(
      (response) => {
        if (isModArchResponse<T>(response)) {
          return response.data;
        }
        throw new Error('Invalid response format');
      },
    );

const modArchRestDELETE =
  <T, D extends Record<string, unknown> = Record<string, unknown>>(path: string) =>
  (hostPath: string, baseQueryParams: Record<string, unknown> = {}): ModArchRestDELETE<T, D> =>
  (data: D, queryParams: Record<string, unknown> = {}, opts: APIOptions = {}) =>
    handleRestFailures(
      restDELETE<T>(hostPath, path, data, { ...baseQueryParams, ...queryParams }, opts),
    ).then((response) => {
      if (isModArchResponse<T>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

// Axios-backed CREATE for non-JSON payloads (e.g., multipart/form-data), aligned with mod-arch shape
const buildApiUrl = (
  hostPath: string,
  path: string,
  queryParams: Record<string, unknown> = {},
): string => {
  const base = hostPath && hostPath.length > 0 ? hostPath : URL_PREFIX;
  const qs = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((v) => qs.append(key, String(v)));
      } else if (typeof value === 'object') {
        qs.append(key, JSON.stringify(value));
      } else if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        qs.append(key, String(value));
      }
    }
  });
  const queryString = qs.toString();
  return `${base}${path}${queryString ? `?${queryString}` : ''}`;
};

/** LSD endpoints */
// Llama Stack Distribution
export const getLSDStatus = modArchRestGET<LlamaStackDistributionModel>('/lsd/status');
export const installLSD = modArchRestCREATE<LlamaStackDistributionModel, InstallLSDRequest>(
  '/lsd/install',
);
export const deleteLSD = modArchRestDELETE<string, DeleteLSDRequest>('/lsd/delete');

// Vector Stores
export const listVectorStores = modArchRestGET<VectorStore[]>('/lsd/vectorstores');
export const createVectorStore = modArchRestCREATE<VectorStore, CreateVectorStoreRequest>(
  '/lsd/vectorstores',
);
export const listVectorStoreFiles = modArchRestGET<VectorStoreFile[]>('/lsd/vectorstores/files');
export const deleteVectorStoreFile = modArchRestDELETE<string, Record<string, never>>(
  '/lsd/vectorstores/files/delete',
);
export const uploadSource = modArchRestCREATE<FileUploadResult, FormData>('/lsd/files/upload');

// LSD Models
export const getLSDModels = modArchRestGET<LlamaModel[]>('/lsd/models');

/** Code Exporter Endpoints */
export const exportCode = modArchRestCREATE<CodeExportData, CodeExportRequest>('/code-exporter');

/** AI Assets Endpoints */
export const getAAModels = modArchRestGET<AAModelResponse[]>('/aaa/models');

export const getMCPServers = (
  hostPath: string,
  baseQueryParams: Record<string, unknown> = {},
): ModArchRestGET<MCPServersResponse> => {
  const baseGetter = modArchRestGET<MCPServersResponse>('/aaa/mcps')(hostPath, baseQueryParams);
  return (queryParams: Record<string, unknown> = {}, opts: APIOptions = {}) =>
    baseGetter(queryParams, opts).catch((error) => {
      const status = getStatusCodeFromError(error);
      const message = getMessageFromError(error);
      const allQueryParams = { ...queryParams, ...baseQueryParams };
      const { namespace } = allQueryParams;

      if (status === 404) {
        throw new Error(
          `ConfigMap not found in namespace '${namespace}'. The MCP servers ConfigMap may not be deployed yet.`,
        );
      }
      if (status === 403) {
        throw new Error(
          `Access denied to ConfigMap in namespace '${namespace}'. Check your permissions.`,
        );
      }
      if (status === 400) {
        throw new Error(`Invalid namespace parameter: ${namespace}`);
      }
      throw new Error(`Failed to fetch MCP servers: ${message || 'Unknown error'}`);
    });
};
export const getMCPServerStatus = (
  hostPath: string,
  baseQueryParams: Record<string, unknown> = {},
): ModArchRestGET<MCPConnectionStatus> => {
  const baseGetter = modArchRestGET<MCPConnectionStatus>('/mcp/status')(hostPath, baseQueryParams);
  return (queryParams: Record<string, unknown> = {}, opts: APIOptions = {}) =>
    baseGetter(queryParams, opts).catch((error) => {
      const status = getStatusCodeFromError(error);
      const message = getMessageFromError(error);
      const allQueryParams = { ...queryParams, ...baseQueryParams };
      const { namespace } = allQueryParams;
      const serverUrl = allQueryParams.server_url;

      // Handle BFF-level errors
      if (status === 404) {
        throw new Error(`Server not found in ConfigMap: ${queryParams.server_url}`);
      }

      if (status === 401) {
        throw new Error(`Authentication failed for namespace '${namespace}'`);
      }

      if (status === 403) {
        throw new Error(`Access denied to namespace '${namespace}'`);
      }

      if (status === 400) {
        throw new Error(
          message || `Invalid parameters: namespace=${namespace}, server_url=${serverUrl}`,
        );
      }

      // Generic error handling
      throw new Error(`Failed to check MCP server status: ${message || 'Unknown error'}`);
    });
};
export const getMCPServerTools = modArchRestGET<MCPToolsStatus>('/mcp/tools');

/** MaaS Endpoints */
export const getMaaSModels = modArchRestGET<MaaSModel[]>('/maas/models');
export const generateMaaSToken = modArchRestCREATE<MaaSTokenResponse, MaaSTokenRequest>(
  '/maas/tokens',
);
