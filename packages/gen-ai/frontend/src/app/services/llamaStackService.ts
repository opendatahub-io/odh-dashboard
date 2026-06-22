/* eslint-disable camelcase */
import {
  APIOptions,
  handleRestFailures,
  isModArchResponse,
  restCREATE,
  restDELETE,
  restGET,
  restUPDATE,
} from 'mod-arch-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  AgentProfile,
  AgentProfileCreateRequest,
  AgentProfileCreateResponse,
  AgentProfileListResponse,
  AgentProfileUpdateRequest,
  AgentProfileUpdateResponse,
} from '~/app/agentProfile/types';
import {
  ApiErrorClass,
  BackendResponseData,
  BFFConfig,
  CodeExportRequest,
  ContentAnnotation,
  CreateResponseRequest,
  ERROR_COMPONENTS,
  FileCitationAnnotation,
  FileUploadJobResponse,
  FileUploadStatusResponse,
  isApiError,
  LlamaModel,
  LlamaStackDistributionModel,
  MCPConnectionStatus,
  MCPServersResponse,
  MCPToolsStatus,
  MLflowPromptsResponse,
  MLflowPromptVersion,
  MLflowPromptVersionsResponse,
  MLflowRegisterPromptRequest,
  OutputItem,
  ResponseMetrics,
  NemoGuardrailsStatus,
  SimplifiedResponseData,
  SourceItem,
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
  ExternalModelRequest,
  ExternalModelResponse,
  ExternalVectorStoreSummary,
  VerifyExternalModelRequest,
  VerifyExternalModelResponse,
  MaaSModel,
  MaaSTokenRequest,
  MaaSTokenResponse,
} from '~/app/types';
import { URL_PREFIX, extractMCPToolCallData } from '~/app/utilities';
import { GUARDRAIL_ERROR_CODES } from '~/app/Chatbot/const';
import { ThinkTagParser } from './thinkTagParser';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Type guard to validate ResponseMetrics from streaming data
 */
const isResponseMetrics = (value: unknown): value is ResponseMetrics => {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.latency_ms === 'number';
};

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

const isFileCitation = (annotation: ContentAnnotation): annotation is FileCitationAnnotation =>
  annotation.type === 'file_citation' &&
  'file_id' in annotation &&
  typeof annotation.file_id === 'string' &&
  'filename' in annotation &&
  typeof annotation.filename === 'string';

/**
 * Extracts file citation annotations from BFF-processed response output.
 * The BFF handles citation marker extraction and filename resolution,
 * so annotations are already populated on output_text content items.
 */
const extractAnnotationsFromOutput = (output?: OutputItem[]): FileCitationAnnotation[] => {
  if (!output || output.length === 0) {
    return [];
  }

  const annotations: FileCitationAnnotation[] = [];

  for (const item of output) {
    if (item.content && Array.isArray(item.content)) {
      for (const contentItem of item.content) {
        if (contentItem.annotations && Array.isArray(contentItem.annotations)) {
          for (const annotation of contentItem.annotations) {
            if (isFileCitation(annotation)) {
              annotations.push(annotation);
            }
          }
        }
      }
    }
  }

  return annotations;
};

/**
 * Builds sources array from BFF-provided annotations (already resolved to filenames).
 */
const buildSourcesFromAnnotations = (annotations: FileCitationAnnotation[]): SourceItem[] => {
  const uniqueFilenames = new Set<string>();
  for (const annotation of annotations) {
    if (annotation.filename) {
      uniqueFilenames.add(annotation.filename);
    }
  }
  return Array.from(uniqueFilenames).map((filename) => ({
    title: filename,
    link: '#',
    hasShowMore: false,
  }));
};

export const RAW_TOOL_CALL_WARNING =
  '⚠️ The model returned a raw tool call instead of generating a response. ' +
  'This usually indicates that the inference server is not configured to handle tool calling. ' +
  'Please contact your administrator.\n\nModel response:\n';

export const looksLikeRawToolCall = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return false;
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return (
      typeof parsed === 'object' && parsed !== null && 'name' in parsed && 'parameters' in parsed
    );
  } catch {
    return false;
  }
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
        } else if (contentItem.type === 'refusal' && contentItem.refusal) {
          content += contentItem.refusal;
        }
      }
    }
  }

  if (looksLikeRawToolCall(content)) {
    return `${RAW_TOOL_CALL_WARNING}${content}`;
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
  let content = extractContentFromOutput(backendResponse.output);
  const annotations = extractAnnotationsFromOutput(backendResponse.output);
  const sources = buildSourcesFromAnnotations(annotations);

  // Strip <think>...</think> or bare reasoning (content before </think>) from content
  let reasoningContent: string | undefined;
  const thinkMatchFull = content.match(/^<think>([\s\S]*?)<\/think>\s*/);
  const thinkMatchBare = !thinkMatchFull ? content.match(/^([\s\S]*?)<\/think>\s*/) : null;
  const thinkMatch = thinkMatchFull || thinkMatchBare;
  if (thinkMatch) {
    reasoningContent = (thinkMatchFull ? thinkMatch[1] : thinkMatch[1]).trim();
    content = content.slice(thinkMatch[0].length);
  }

  return {
    id: backendResponse.id,
    model: backendResponse.model,
    status: backendResponse.status,
    created_at: backendResponse.created_at,
    content,
    usage: backendResponse.usage,
    ...(toolCallData && { toolCallData }),
    ...(sources.length > 0 && { sources }),
    ...(backendResponse.metrics && { metrics: backendResponse.metrics }),
    ...(reasoningContent && { reasoningContent }),
  };
};

const toCreateResponseRecord = (r: CreateResponseRequest): Record<string, unknown> => ({
  input: r.input,
  model: r.model,
  vector_store_ids: r.vector_store_ids,
  chat_context: r.chat_context,
  temperature: r.temperature,
  instructions: r.instructions,
  stream: r.stream,
  mcp_servers: r.mcp_servers,
  guardrail_config: r.guardrail_config,
  model_source_type: r.model_source_type,
  subscription: r.subscription,
});

const postCreateResponse = (
  hostPath: string,
  baseQueryParams: Record<string, unknown>,
  request: CreateResponseRequest,
  opts?: APIOptions & { abortSignal?: AbortSignal },
): Promise<SimplifiedResponseData> => {
  const fetchOpts = opts?.abortSignal ? { ...opts, signal: opts.abortSignal } : opts;
  return restCREATE<{ data?: BackendResponseData; error?: ApiErrorClass['error'] }>(
    hostPath,
    '/lsd/responses',
    toCreateResponseRecord(request),
    baseQueryParams,
    fetchOpts,
  ).then((response) => {
    if (response.error) {
      // Preserve the full ApiError structure from BFF
      throw new ApiErrorClass(response.error);
    }
    if (response.data) {
      return transformBackendResponse(response.data);
    }
    throw new Error('Invalid response format');
  });
};

// Streaming POST path via fetch (SSE text/event-stream)
const streamCreateResponse = (
  url: string,
  request: CreateResponseRequest,
  onStreamData: (chunk: string, clearPrevious?: boolean, isReasoning?: boolean) => void,
  abortSignal?: AbortSignal,
): Promise<SimplifiedResponseData> =>
  new Promise((resolve, reject) => {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(request),
      signal: abortSignal,
    })
      .then(async (response) => {
        if (!response.ok) {
          let errorData: unknown = null;
          try {
            const errorBody = await response.text();
            errorData = JSON.parse(errorBody);
          } catch {
            // JSON parsing failed - will use fallback below
          }

          if (isApiError(errorData)) {
            // Preserve the full ApiError structure from BFF
            throw new ApiErrorClass(errorData.error);
          }

          // Fallback: no structured error or parsing failed
          throw new ApiErrorClass({
            component: ERROR_COMPONENTS.BFF,
            code: `http_${response.status}`,
            message: `HTTP error! status: ${response.status}`,
            retriable: false,
          });
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Unable to read stream');
        }

        let fullContent = '';
        let reasoningContent = '';
        let completeResponseData: BackendResponseData | null = null;
        let metricsData: ResponseMetrics | null = null;
        let receivedRefusal = false;
        const decoder = new TextDecoder();

        const thinkParser = new ThinkTagParser();

        try {
          let done = false;
          let partialLine = '';
          while (!done) {
            const result = await reader.read();
            done = result.done;

            if (!done && result.value) {
              const chunk = decoder.decode(result.value, { stream: true });
              const parts = (partialLine + chunk).split('\n');
              partialLine = chunk.endsWith('\n') ? '' : parts.pop()!;

              for (const line of parts) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));

                    if (data.error) {
                      await reader.cancel('Streaming error');
                      if (data.error.code === GUARDRAIL_ERROR_CODES.OUTPUT_VIOLATION) {
                        fireMiscTrackingEvent('Guardrail Activated', { violationDetected: true });
                      }
                      // Preserve the full ApiError structure from BFF
                      reject(new ApiErrorClass(data.error));
                      return;
                    }

                    if (data.type === 'response.reasoning_text.delta' && data.delta) {
                      thinkParser.notifyDedicatedReasoningEvent();
                      reasoningContent += data.delta;
                      onStreamData(data.delta, false, true);
                    } else if (data.delta && data.type === 'response.output_text.delta') {
                      const { delta } = data;
                      const parsed = thinkParser.processOutputDelta(delta);
                      if (parsed.reasoning) {
                        reasoningContent += parsed.reasoning;
                        onStreamData(parsed.reasoning, false, true);
                      }
                      if (parsed.content) {
                        fullContent += parsed.content;
                        onStreamData(parsed.content);
                      }
                    } else if (data.type === 'response.refusal.delta') {
                      if (data.delta) {
                        const isFirstRefusal = !receivedRefusal;
                        if (isFirstRefusal) {
                          receivedRefusal = true;
                          fullContent = '';
                          fireMiscTrackingEvent('Guardrail Activated', { violationDetected: true });
                        }
                        fullContent += data.delta;
                        onStreamData(data.delta, isFirstRefusal);
                      }
                    } else if (data.type === 'response.completed' && data.response) {
                      completeResponseData = data.response;
                    } else if (
                      data.type === 'response.metrics' &&
                      isResponseMetrics(data.metrics)
                    ) {
                      metricsData = data.metrics;
                    }
                  } catch {
                    // ignore malformed lines
                  }
                }
              }
            }
          }

          // Flush any trailing SSE data left in the buffer after the stream ends
          partialLine += decoder.decode();
          if (partialLine) {
            for (const line of partialLine.split('\n')) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.error) {
                    const errMsg = data.error.message || 'An error occurred during streaming';
                    if (data.error.code === GUARDRAIL_ERROR_CODES.OUTPUT_VIOLATION) {
                      fireMiscTrackingEvent('Guardrail Activated', { violationDetected: true });
                    }
                    reject(Object.assign(new Error(errMsg), { code: data.error.code }));
                    return;
                  }

                  if (data.delta && data.type === 'response.output_text.delta') {
                    fullContent += data.delta;
                    onStreamData(data.delta);
                  } else if (data.type === 'response.refusal.delta') {
                    if (data.delta) {
                      const isFirstRefusal = !receivedRefusal;
                      if (isFirstRefusal) {
                        receivedRefusal = true;
                        fullContent = '';
                        fireMiscTrackingEvent('Guardrail Activated', { violationDetected: true });
                      }
                      fullContent += data.delta;
                      onStreamData(data.delta, isFirstRefusal);
                    }
                  } else if (data.type === 'response.completed' && data.response) {
                    completeResponseData = data.response;
                  } else if (data.type === 'response.metrics' && isResponseMetrics(data.metrics)) {
                    metricsData = data.metrics;
                  }
                } catch {
                  // ignore malformed lines
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        // Flush any remaining buffered partial tag
        const flushed = thinkParser.flush();
        if (flushed.reasoning) {
          reasoningContent += flushed.reasoning;
          onStreamData(flushed.reasoning, false, true);
        }
        if (flushed.content) {
          fullContent += flushed.content;
          onStreamData(flushed.content);
        }

        const toolCallData = completeResponseData?.output
          ? extractMCPToolCallData(completeResponseData.output)
          : undefined;

        // BFF processes citations in response.completed -- annotations are ready to use
        const annotations = completeResponseData?.output
          ? extractAnnotationsFromOutput(completeResponseData.output)
          : [];
        const sources = buildSourcesFromAnnotations(annotations);
        let finalContent = completeResponseData?.output
          ? extractContentFromOutput(completeResponseData.output)
          : fullContent;

        // Strip <think>...</think> or bare reasoning (content before </think>) from final content
        const thinkMatchFull = finalContent.match(/^<think>([\s\S]*?)<\/think>\s*/);
        const thinkMatchBare = !thinkMatchFull
          ? finalContent.match(/^([\s\S]*?)<\/think>\s*/)
          : null;
        const thinkMatch = thinkMatchFull || thinkMatchBare;
        if (thinkMatch) {
          if (!reasoningContent) {
            reasoningContent = (thinkMatchFull ? thinkMatch[1] : thinkMatch[1]).trim();
          }
          finalContent = finalContent.slice(thinkMatch[0].length);
        }

        resolve({
          id: completeResponseData?.id || 'streaming-response',
          model: completeResponseData?.model || request.model,
          status: completeResponseData?.status || 'completed',
          created_at: completeResponseData?.created_at || Date.now(),
          content: finalContent,
          ...(toolCallData && { toolCallData }),
          ...(sources.length > 0 && { sources }),
          ...(metricsData && { metrics: metricsData }),
          ...(reasoningContent && { reasoningContent }),
        });
      })
      .catch((error) => {
        // Handle abort errors gracefully
        if (error instanceof Error && error.name === 'AbortError') {
          reject(new Error('Response stopped by user'));
          return;
        }
        // Preserve ApiError instances (class or plain object), wrap everything else
        if (isApiError(error)) {
          reject(error);
        } else {
          reject(
            error instanceof Error ? error : new Error('Failed to generate streaming response'),
          );
        }
      });
  });

/**
 * Request to generate AI responses with RAG and conversation context.
 * @param request - CreateResponseRequest payload for /gen-ai/api/v1/lsd/responses.
 * @param namespace - The namespace to generate responses in
 * @param onStreamData - Optional callback for streaming data chunks. Second param clearPrevious signals to clear previous content (e.g., on refusal violation)
 * @param abortSignal - Optional AbortSignal to cancel the streaming request
 * @returns Promise<SimplifiedResponseData> - The generated response object.
 * @throws Error - When the API request fails or returns an error response.
 */
export const createResponse =
  (hostPath: string, baseQueryParams: Record<string, unknown> = {}) =>
  (
    data: CreateResponseRequest,
    opts: APIOptions & {
      onStreamData?: (chunk: string, clearPrevious?: boolean, isReasoning?: boolean) => void;
      abortSignal?: AbortSignal;
    } = {},
  ): Promise<SimplifiedResponseData> => {
    if (data.stream && opts.onStreamData) {
      const url = buildApiUrl(hostPath, '/lsd/responses', baseQueryParams);
      return streamCreateResponse(url, data, opts.onStreamData, opts.abortSignal);
    }
    return postCreateResponse(hostPath, baseQueryParams, data, opts);
  };

/**
 * Passthrough request for embedded chatbot mode.
 * Sends a raw Responses API body directly to the BFF, bypassing the
 * normal OGX (Open GenAI Stack) flow. The BFF proxies to the OGX instance using
 * the specified connection secret.
 *
 * Always uses streaming (BFF forces stream: true).
 */
export const createPassthroughResponse = (
  bffBasePath: string,
  namespace: string,
  secretName: string,
  body: Record<string, unknown>,
  onStreamData: (chunk: string, clearPrevious?: boolean) => void,
  abortSignal?: AbortSignal,
): Promise<SimplifiedResponseData> => {
  const trimmed = bffBasePath.replace(/\/+$/, '');
  const base = trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
  const url = `${base}/lsd/responses/passthrough?namespace=${encodeURIComponent(namespace)}&secretName=${encodeURIComponent(secretName)}`;

  // TODO P2: Display retrieval context (file_search_call.results) alongside responses — see Phase 6.1

  return new Promise((resolve, reject) => {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal: abortSignal,
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

          // Differentiated error messages for embedded mode
          if (response.status === 502 || response.status === 503) {
            throw new Error(
              'The OGX instance is not responding. Check that the instance is running and reachable.',
            );
          }
          if (response.status === 404) {
            throw new Error(
              `The connection secret '${secretName}' was not found in namespace '${namespace}'.`,
            );
          }
          if (response.status === 403) {
            throw new Error(
              'You do not have permission to access this resource. Contact your administrator.',
            );
          }
          throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Unable to read stream');
        }

        let fullContent = '';
        let completeResponseData: BackendResponseData | null = null;
        let metricsData: ResponseMetrics | null = null;
        const decoder = new TextDecoder();

        try {
          let done = false;
          let partialLine = '';
          while (!done) {
            const result = await reader.read();
            done = result.done;

            if (!done && result.value) {
              const chunk = decoder.decode(result.value, { stream: true });
              const parts = (partialLine + chunk).split('\n');
              partialLine = chunk.endsWith('\n') ? '' : parts.pop()!;

              for (const line of parts) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));

                    if (data.error) {
                      await reader.cancel('Streaming error');
                      reject(new Error(data.error.message || 'An error occurred during streaming'));
                      return;
                    }

                    if (data.delta && data.type === 'response.output_text.delta') {
                      fullContent += data.delta;
                      onStreamData(data.delta);
                    } else if (data.type === 'response.refusal.delta' && data.delta) {
                      fullContent += data.delta;
                      onStreamData(data.delta);
                    } else if (data.type === 'response.completed' && data.response) {
                      completeResponseData = data.response;
                    } else if (
                      data.type === 'response.metrics' &&
                      isResponseMetrics(data.metrics)
                    ) {
                      metricsData = data.metrics;
                    }
                  } catch {
                    // ignore malformed lines
                  }
                }
              }
            }
          }

          // Flush any trailing SSE data left in the buffer after the stream ends
          partialLine += decoder.decode();
          if (partialLine) {
            for (const line of partialLine.split('\n')) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.error) {
                    reject(new Error(data.error.message || 'An error occurred during streaming'));
                    return;
                  }

                  if (data.delta && data.type === 'response.output_text.delta') {
                    fullContent += data.delta;
                    onStreamData(data.delta);
                  } else if (data.type === 'response.refusal.delta' && data.delta) {
                    fullContent += data.delta;
                    onStreamData(data.delta);
                  } else if (data.type === 'response.completed' && data.response) {
                    completeResponseData = data.response;
                  } else if (data.type === 'response.metrics' && isResponseMetrics(data.metrics)) {
                    metricsData = data.metrics;
                  }
                } catch {
                  // ignore malformed lines
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        const annotations = completeResponseData?.output
          ? extractAnnotationsFromOutput(completeResponseData.output)
          : [];
        const sources = buildSourcesFromAnnotations(annotations);
        const finalContent = completeResponseData?.output
          ? extractContentFromOutput(completeResponseData.output)
          : fullContent;

        resolve({
          id: completeResponseData?.id || 'passthrough-response',
          model: completeResponseData?.model || 'unknown',
          status: completeResponseData?.status || 'completed',
          created_at: completeResponseData?.created_at || Date.now(),
          content: finalContent,
          ...(sources.length > 0 && { sources }),
          ...(metricsData && { metrics: metricsData }),
        });
      })
      .catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') {
          reject(new Error('Response stopped by user'));
          return;
        }
        reject(
          error instanceof Error ? error : new Error('Failed to generate passthrough response'),
        );
      });
  });
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

/** General endpoints */
// BFF Configuration
export const getBFFConfig = modArchRestGET<BFFConfig>('/config');

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
// File upload - returns 202 with job_id for async processing
export const uploadSource = (
  hostPath: string,
  baseQueryParams: Record<string, unknown> = {},
): ModArchRestCREATE<FileUploadJobResponse, FormData> =>
  modArchRestCREATE<FileUploadJobResponse, FormData>('/lsd/files/upload')(
    hostPath,
    baseQueryParams,
  );

// File upload status polling
export const getFileUploadStatus = modArchRestGET<FileUploadStatusResponse>(
  '/lsd/files/upload/status',
);

// Media file upload (vision images, audio) -- uses XHR for progress tracking.
// The `type` field tells the BFF which MIME allowlist to apply.
export const uploadMediaFile = (
  url: string,
  file: File,
  type: 'vision' | 'audio',
  onProgress?: (percent: number) => void,
): { promise: Promise<{ data: { id: string } }>; xhr: XMLHttpRequest } => {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<{ data: { id: string } }>((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    xhr.open('POST', url);
    xhr.timeout = 60_000;

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText);
          if (
            typeof parsed === 'object' &&
            parsed !== null &&
            parsed.data &&
            typeof parsed.data.id === 'string'
          ) {
            resolve(parsed);
          } else {
            reject(new Error('Invalid response shape: missing data.id'));
          }
        } catch {
          reject(new Error('Invalid response from server'));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.onabort = () => reject(new Error('Upload aborted'));
    xhr.send(formData);
  });
  return { promise, xhr };
};

// Audio transcription via ASR model
export const transcribeAudio = async (
  url: string,
  fileId: string,
  asrModelId: string,
  signal?: AbortSignal,
): Promise<{ text: string }> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId, asr_model_id: asrModelId }),
    signal,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (body?.error?.component && body?.error?.code) {
      throw new ApiErrorClass(body.error);
    }
    const message =
      body?.error?.message || body?.message || `Transcription failed (${response.status})`;
    throw Object.assign(new Error(message), { status: response.status });
  }
  return response.json();
};

// LSD Models
export const getLSDModels = modArchRestGET<LlamaModel[]>('/lsd/models');

/** Code Exporter Endpoints */
export const exportCode = modArchRestCREATE<CodeExportData, CodeExportRequest>('/code-exporter');

/** AI Assets Endpoints */
export const getAAModels = modArchRestGET<AAModelResponse[]>('/aaa/models');
export const getAAVectorStores = modArchRestGET<ExternalVectorStoreSummary[]>('/aaa/vectorstores');
export const createExternalModel = modArchRestCREATE<ExternalModelResponse, ExternalModelRequest>(
  '/models/external',
);
/**
 * Verify external model endpoint
 *
 * Validates and normalizes the response from the BFF to ensure the UI can safely consume it:
 * - Ensures success is a boolean (defaults to false if missing/invalid)
 * - Ensures message is a non-empty string (defaults to 'Verification completed' if missing/invalid)
 * - Ensures response_time_ms is a non-negative number or undefined
 *
 * Errors are already normalized by mod-arch-core to { error: { code?, message } }
 */
export const verifyExternalModel = (
  hostPath: string,
  baseQueryParams: Record<string, unknown> = {},
): ModArchRestCREATE<VerifyExternalModelResponse, VerifyExternalModelRequest> => {
  const baseCreate = modArchRestCREATE<VerifyExternalModelResponse, VerifyExternalModelRequest>(
    '/models/external/verify',
  )(hostPath, baseQueryParams);

  return async (data: VerifyExternalModelRequest, opts: APIOptions = {}) => {
    const response = await baseCreate(data, opts);

    // Validate and normalize response fields to prevent runtime errors in UI
    const normalized: VerifyExternalModelResponse = {
      success: typeof response.success === 'boolean' ? response.success : false,
      message:
        typeof response.message === 'string' && response.message.trim()
          ? response.message
          : 'Verification completed',
      response_time_ms:
        typeof response.response_time_ms === 'number' && response.response_time_ms >= 0
          ? response.response_time_ms
          : undefined,
    };

    return normalized;
  };
};

export const deleteExternalModel = modArchRestDELETE<string, Record<string, never>>(
  '/models/external',
);

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

/** NemoGuardrails Endpoints */
export const getNemoGuardrailsStatus =
  modArchRestGET<NemoGuardrailsStatus>('/nemo-guardrails/status');

// Custom implementation that bypasses handleRestFailures so the raw
// { error: { code, message } } body is preserved in the thrown error.
// This allows the caller to distinguish 409 (already initialised) from
// unexpected server faults instead of catching everything blindly.
export const initNemoGuardrails =
  (hostPath: string, baseQueryParams: Record<string, unknown> = {}) =>
  (_data: Record<string, never>, opts: APIOptions = {}): Promise<{ name: string }> =>
    restCREATE<{ data?: { name: string }; error?: { code: string; message: string } }>(
      hostPath,
      '/nemo-guardrails/init',
      {},
      baseQueryParams,
      opts,
    ).then((response) => {
      if (response.error) {
        const err = Object.assign(new Error(response.error.message), { code: response.error.code });
        throw err;
      }
      if (response.data) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

/** MLflow Prompt Registry Endpoints */
export const listMLflowPrompts = modArchRestGET<MLflowPromptsResponse>('/mlflow/prompts');
export const registerMLflowPrompt = modArchRestCREATE<
  MLflowPromptVersion,
  MLflowRegisterPromptRequest
>('/mlflow/prompts');

export const getMLflowPrompt =
  (
    hostPath: string,
    baseQueryParams: Record<string, unknown> = {},
  ): ModArchRestGET<MLflowPromptVersion> =>
  (queryParams: Record<string, unknown> = {}, opts: APIOptions = {}) => {
    const { name, ...restParams } = queryParams;
    if (!name || typeof name !== 'string') {
      return Promise.reject(new Error('name parameter is required'));
    }
    const path = `/mlflow/prompts/${encodeURIComponent(name)}`;
    return handleRestFailures(
      restGET<MLflowPromptVersion>(hostPath, path, { ...baseQueryParams, ...restParams }, opts),
    ).then((response) => {
      if (isModArchResponse<MLflowPromptVersion>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
  };

export const listMLflowPromptVersions =
  (
    hostPath: string,
    baseQueryParams: Record<string, unknown> = {},
  ): ModArchRestGET<MLflowPromptVersionsResponse> =>
  (queryParams: Record<string, unknown> = {}, opts: APIOptions = {}) => {
    const { name, ...restParams } = queryParams;
    if (!name || typeof name !== 'string') {
      return Promise.reject(new Error('name parameter is required'));
    }
    const path = `/mlflow/prompts/${encodeURIComponent(name)}/versions`;
    return handleRestFailures(
      restGET<MLflowPromptVersionsResponse>(
        hostPath,
        path,
        { ...baseQueryParams, ...restParams },
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<MLflowPromptVersionsResponse>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
  };

export const listAgentProfiles = modArchRestGET<AgentProfileListResponse>('/agent-profiles');

export const createAgentProfile = modArchRestCREATE<
  AgentProfileCreateResponse,
  AgentProfileCreateRequest
>('/agent-profiles');

export const deleteAgentProfile =
  (
    hostPath: string,
    baseQueryParams: Record<string, unknown> = {},
  ): ModArchRestDELETE<void, { id: string }> =>
  ({ id }: { id: string }, queryParams: Record<string, unknown> = {}, opts: APIOptions = {}) => {
    if (!id || typeof id !== 'string') {
      return Promise.reject(new Error('id parameter is required'));
    }
    const path = `/agent-profiles/${encodeURIComponent(id)}`;
    // BFF returns 204 No Content — parseJSON: false prevents JSON.parse('') from throwing
    return handleRestFailures(
      restDELETE<void>(
        hostPath,
        path,
        {},
        { ...baseQueryParams, ...queryParams },
        {
          ...opts,
          parseJSON: false,
        },
      ),
    ).then(() => undefined);
  };

export const updateAgentProfile =
  (
    hostPath: string,
    baseQueryParams: Record<string, unknown> = {},
  ): ((
    data: AgentProfileUpdateRequest & { id: string },
    opts?: APIOptions,
  ) => Promise<AgentProfileUpdateResponse>) =>
  (data: AgentProfileUpdateRequest & { id: string }, opts: APIOptions = {}) => {
    const { id, spec, resourceVersion } = data;
    if (!id || typeof id !== 'string') {
      return Promise.reject(new Error('id parameter is required'));
    }
    const path = `/agent-profiles/${encodeURIComponent(id)}`;
    return handleRestFailures(
      restUPDATE<AgentProfileUpdateResponse>(
        hostPath,
        path,
        { spec, resourceVersion },
        baseQueryParams,
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<AgentProfileUpdateResponse>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
  };

export const getAgentProfile =
  (hostPath: string, baseQueryParams: Record<string, unknown> = {}): ModArchRestGET<AgentProfile> =>
  (queryParams: Record<string, unknown> = {}, opts: APIOptions = {}) => {
    const { id, ...restParams } = queryParams;
    if (!id || typeof id !== 'string') {
      return Promise.reject(new Error('id parameter is required'));
    }
    const path = `/agent-profiles/${encodeURIComponent(id)}`;
    return handleRestFailures(
      restGET<AgentProfile>(hostPath, path, { ...baseQueryParams, ...restParams }, opts),
    ).then((response) => {
      if (isModArchResponse<AgentProfile>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
  };
