/* eslint-disable camelcase */
import {
  ErrorClassification,
  ErrorPattern,
  ErrorSeverity,
  ErrorComponent,
  APIErrorDetails,
} from '~/app/types';
import {
  ERROR_CATEGORIES,
  RETRIABLE_HTTP_STATUSES,
  RETRIABLE_ERROR_CODES,
  NON_RETRIABLE_ERROR_CODES,
} from '~/app/Chatbot/const';

/**
 * Extracts structured error details from an unknown error object
 * Handles both structured API errors (mod-arch format) and generic Error objects
 */
const extractErrorDetails = (error: unknown): APIErrorDetails => {
  // Check for structured mod-arch error format: { error: { code?, message, component?, retriable? } }
  if (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof error.error === 'object' &&
    error.error !== null
  ) {
    const errorObj = error.error as Record<string, unknown>;

    return {
      code: typeof errorObj.code === 'string' ? errorObj.code : undefined,
      message: typeof errorObj.message === 'string' ? errorObj.message : 'Unknown error',
      component:
        typeof errorObj.component === 'string'
          ? (errorObj.component as ErrorComponent)
          : undefined,
      tool_name: typeof errorObj.tool_name === 'string' ? errorObj.tool_name : undefined,
      retriable: typeof errorObj.retriable === 'boolean' ? errorObj.retriable : undefined,
    };
  }

  // Check for standard Error object
  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  // Fallback for unknown error types
  return {
    message: 'An unexpected error occurred',
  };
};

/**
 * Determines if an error is retriable based on code, HTTP status, or explicit flag
 */
const isRetriable = (errorDetails: APIErrorDetails, httpStatus?: number): boolean => {
  // Explicit retriable flag from API takes precedence
  if (errorDetails.retriable !== undefined) {
    return errorDetails.retriable;
  }

  // Check for known non-retriable error codes
  if (errorDetails.code && NON_RETRIABLE_ERROR_CODES.includes(errorDetails.code as never)) {
    return false;
  }

  // Check for known retriable error codes
  if (errorDetails.code && RETRIABLE_ERROR_CODES.includes(errorDetails.code as never)) {
    return true;
  }

  // Check HTTP status codes
  if (httpStatus && RETRIABLE_HTTP_STATUSES.includes(httpStatus as never)) {
    return true;
  }

  // Default to non-retriable for unknown errors
  return false;
};

/**
 * Determines error pattern based on error details and context
 */
const determineErrorPattern = (
  errorDetails: APIErrorDetails,
  wasResponseGenerated: boolean,
  wasStreamStarted: boolean,
): ErrorPattern => {
  // If response was fully/partially generated, this is a partial failure
  if (wasResponseGenerated) {
    return 'partial_failure';
  }

  // If stream started but no full response, this is a streaming interruption
  if (wasStreamStarted) {
    return 'streaming_interruption';
  }

  // No response at all - full failure
  return 'full_failure';
};

/**
 * Determines error severity based on component and pattern
 */
const determineErrorSeverity = (
  errorDetails: APIErrorDetails,
  pattern: ErrorPattern,
): ErrorSeverity => {
  // Partial failures are warnings (model responded, but supporting component failed)
  if (pattern === 'partial_failure') {
    return 'warning';
  }

  // Full failures and streaming interruptions are danger
  return 'danger';
};

/**
 * Generates a plain-language title for the error based on error details
 */
const generateErrorTitle = (
  errorDetails: APIErrorDetails,
  pattern: ErrorPattern,
): string => {
  const { code, component, tool_name } = errorDetails;

  // Model configuration errors
  if (code === 'max_tokens' || code === ERROR_CATEGORIES.INVALID_MODEL_CONFIG) {
    return 'Token limit exceeds model capacity';
  }
  if (code === 'chat_template') {
    return 'Model configuration error';
  }
  if (code === 'no_tools' || code === ERROR_CATEGORIES.UNSUPPORTED_FEATURE) {
    return "This model doesn't support tool calling";
  }
  if (code === 'no_images') {
    return "This model doesn't support image input";
  }

  // Model inference errors
  if (code === 'timeout' || code === ERROR_CATEGORIES.MODEL_TIMEOUT) {
    return 'Model inference failed';
  }
  if (code === 'server_error' || code === ERROR_CATEGORIES.MODEL_INVOCATION_ERROR) {
    return 'Model server error';
  }
  if (code === 'rate_limit' || code === ERROR_CATEGORIES.MODEL_OVERLOADED) {
    return 'Request was rate limited';
  }

  // Network errors
  if (code === 'service_unavailable' || code === 'bad_gateway') {
    return "Couldn't reach the server";
  }

  // RAG errors (partial failures)
  if (component === 'rag' || code?.startsWith('rag_')) {
    if (code === 'rag_down' || code === ERROR_CATEGORIES.RAG_ERROR) {
      return 'Knowledge source retrieval failed';
    }
    if (code === 'rag_embed') {
      return 'Knowledge source retrieval failed';
    }
    if (code === 'rag_empty' || code === ERROR_CATEGORIES.RAG_VECTOR_STORE_NOT_FOUND) {
      return 'No matching knowledge found';
    }
  }

  // Guardrails errors (partial failures)
  if (component === 'guardrails' || code?.startsWith('guardrail')) {
    if (code === 'guardrail_flagged' || code === ERROR_CATEGORIES.GUARDRAILS_VIOLATION) {
      return 'Content was flagged by guardrails';
    }
    if (code === 'guardrail_down' || code === ERROR_CATEGORIES.GUARDRAILS_ERROR) {
      return 'Guardrail check was not applied';
    }
  }

  // MCP errors (partial failures)
  if (component === 'mcp' || code?.startsWith('mcp_')) {
    if (code === 'mcp_down' || code === ERROR_CATEGORIES.MCP_ERROR) {
      return tool_name ? `${tool_name} tool call failed` : 'Tool call failed';
    }
    if (code === 'mcp_auth' || code === ERROR_CATEGORIES.MCP_AUTH_ERROR) {
      return tool_name ? `${tool_name} tool call failed` : 'Tool call failed';
    }
    if (code === 'mcp_exec' || code === ERROR_CATEGORIES.MCP_TOOL_NOT_FOUND) {
      return tool_name ? `${tool_name} tool returned an error` : 'Tool returned an error';
    }
  }

  // Streaming interruptions
  if (pattern === 'streaming_interruption') {
    if (code === 'stream_lost') {
      return 'Streaming error — connection lost';
    }
    if (code === 'stream_timeout') {
      return 'Streaming error — response timed out';
    }
    if (code === 'stream_context') {
      return 'Streaming error — context length exceeded';
    }
  }

  // Generic fallback
  return 'An error occurred';
};

/**
 * Generates a description explaining the error impact and next steps
 */
const generateErrorDescription = (
  errorDetails: APIErrorDetails,
  pattern: ErrorPattern,
  modelName?: string,
): string => {
  const { code, component, tool_name } = errorDetails;

  // Model configuration errors
  if (code === 'max_tokens') {
    return `${modelName || 'This model'} supports a maximum of {maxTokens} tokens. Reduce the token limit in the Build panel.`;
  }
  if (code === 'chat_template') {
    return `${modelName || 'This model'} doesn't support the current chat template.`;
  }
  if (code === 'no_tools') {
    return `${modelName || 'This model'} doesn't support the tools feature you've enabled.`;
  }
  if (code === 'no_images') {
    return `${modelName || 'This model'} can't process images. Try selecting a multimodal model.`;
  }

  // Model inference errors
  if (code === 'timeout') {
    return "The model server didn't respond in time. This may be a temporary issue.";
  }
  if (code === 'server_error') {
    return 'The model server encountered an internal error.';
  }
  if (code === 'rate_limit') {
    return 'Too many requests to the model server. Wait a moment.';
  }

  // Network errors
  if (code === 'service_unavailable' || code === 'bad_gateway') {
    return 'The playground server is not responding.';
  }

  // RAG errors (partial failures)
  if (component === 'rag' || code?.startsWith('rag_')) {
    if (code === 'rag_down') {
      return 'Generated without context from your knowledge sources.';
    }
    if (code === 'rag_embed') {
      return "Embedding model couldn't process your query.";
    }
    if (code === 'rag_empty') {
      return "Knowledge sources didn't return relevant results.";
    }
  }

  // Guardrails errors (partial failures)
  if (component === 'guardrails' || code?.startsWith('guardrail')) {
    if (code === 'guardrail_flagged') {
      return 'A guardrail flagged this response. Review carefully.';
    }
    if (code === 'guardrail_down') {
      return "Safety filter couldn't process this response.";
    }
  }

  // MCP errors (partial failures)
  if (component === 'mcp' || code?.startsWith('mcp_')) {
    if (code === 'mcp_down') {
      return "Server didn't respond. Response generated without tool output.";
    }
    if (code === 'mcp_auth') {
      return 'Auth error. Check credentials in Build panel.';
    }
    if (code === 'mcp_exec') {
      return 'Tool encountered an error during execution.';
    }
  }

  // Streaming interruptions
  if (pattern === 'streaming_interruption') {
    if (code === 'stream_lost') {
      return 'The connection to the model was lost during generation.';
    }
    if (code === 'stream_timeout') {
      return 'The model stopped responding during generation.';
    }
    if (code === 'stream_context') {
      return "The response exceeded the model's context length.";
    }
  }

  // Generic fallback using the error message
  return errorDetails.message || 'An unexpected error occurred. Please try again.';
};

/**
 * Classifies an error and returns structured UI rendering information
 *
 * @param error - The raw error object from the API
 * @param options - Classification options
 * @param options.wasResponseGenerated - Whether the model generated any response before failing
 * @param options.wasStreamStarted - Whether streaming started before failing
 * @param options.httpStatus - HTTP status code (if available)
 * @param options.modelName - Display name of the selected model (for template interpolation)
 * @param options.maxTokens - Maximum token limit of the model (for template interpolation)
 * @returns ErrorClassification with UI rendering details
 */
export const classifyError = (
  error: unknown,
  options: {
    wasResponseGenerated?: boolean;
    wasStreamStarted?: boolean;
    httpStatus?: number;
    modelName?: string;
    maxTokens?: number;
  } = {},
): ErrorClassification => {
  const {
    wasResponseGenerated = false,
    wasStreamStarted = false,
    httpStatus,
    modelName,
    maxTokens,
  } = options;

  // Extract structured error details
  const errorDetails = extractErrorDetails(error);

  // Determine error pattern
  const pattern = determineErrorPattern(errorDetails, wasResponseGenerated, wasStreamStarted);

  // Determine severity
  const severity = determineErrorSeverity(errorDetails, pattern);

  // Determine if retriable
  const retriable = isRetriable(errorDetails, httpStatus);

  // Generate title and description
  const title = generateErrorTitle(errorDetails, pattern);
  const description = generateErrorDescription(errorDetails, pattern, modelName);

  // Build template variables for interpolation
  const templateVars: Record<string, string | number> = {};
  if (modelName) {
    templateVars.modelName = modelName;
  }
  if (maxTokens) {
    templateVars.maxTokens = maxTokens;
  }
  if (errorDetails.tool_name) {
    templateVars.toolName = errorDetails.tool_name;
  }

  return {
    pattern,
    severity,
    retriable,
    title,
    description,
    rawError: {
      code: errorDetails.code,
      message: errorDetails.message,
    },
    templateVars,
  };
};
