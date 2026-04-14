import { ApiError, ClassifiedError } from '~/app/types';
import { getMicrocopy } from './microcopy';

interface ClassifyContext {
  modelName?: string;
  maxTokens?: number;
  toolName?: string;
  wasStreamStarted?: boolean;
  wasResponseGenerated?: boolean;
}

const COMPONENT_DISPLAY_NAMES: Record<string, string> = {
  guardrails: 'Guardrails',
  rag: 'RAG',
  mcp: 'MCP',
  model: 'Model',
  // eslint-disable-next-line camelcase
  llama_stack: 'Llama Stack',
  bff: 'BFF',
};

const PARTIAL_COMPONENTS = new Set(['rag', 'guardrails', 'mcp']);

const RETRIABLE_CODES = new Set(['timeout', 'server_error', 'stream_lost', 'stream_timeout']);
const RETRIABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

// Map streaming error codes to template keys
const STREAMING_ERROR_MAP: Record<string, string> = {
  /* eslint-disable camelcase */
  stream_lost: 'stream:connection_lost',
  stream_timeout: 'stream:timeout',
  stream_context: 'stream:context_length',
  /* eslint-enable camelcase */
};

// Keywords in error messages that indicate streaming connection loss
const STREAM_LOST_KEYWORDS = [
  'stream terminated',
  'connection reset',
  'connection lost',
  'stream closed',
  'connection closed',
  'EOF',
  'broken pipe',
];

// Keywords in error messages that indicate streaming timeout
const STREAM_TIMEOUT_KEYWORDS = [
  'stream timeout',
  'stream timed out',
  'no response',
  'stopped responding',
];

function detectStreamingErrorFromMessage(message: string): string | null {
  const lowerMessage = message.toLowerCase();

  // Check for connection loss
  if (STREAM_LOST_KEYWORDS.some((keyword) => lowerMessage.includes(keyword.toLowerCase()))) {
    return 'stream:connection_lost';
  }

  // Check for timeout
  if (STREAM_TIMEOUT_KEYWORDS.some((keyword) => lowerMessage.includes(keyword.toLowerCase()))) {
    return 'stream:timeout';
  }

  return null;
}

function resolveTemplateKey(error: ApiError): string {
  const component = error.error?.component;
  const code = error.error?.code;
  const message = error.error?.message ?? error.message ?? '';

  if (component && code) {
    // Check if this is a streaming error disguised as a timeout
    if (code === 'timeout' && message) {
      const streamingKey = detectStreamingErrorFromMessage(message);
      if (streamingKey) {
        return streamingKey;
      }
    }
    return `${component}:${code}`;
  }

  // Handle streaming errors
  if (code && STREAMING_ERROR_MAP[code]) {
    return STREAMING_ERROR_MAP[code];
  }

  if (error.status === 429) {
    return 'bff:rate_limit';
  }
  if (error.status && error.status >= 500) {
    return 'bff:network_error';
  }
  if (error.status === 0 || (!error.status && !component)) {
    return 'bff:unreachable';
  }

  return 'unknown';
}

function resolveRetriable(error: ApiError): boolean {
  if (error.error?.retriable !== undefined) {
    return error.error.retriable;
  }

  const code = error.error?.code;
  const message = error.error?.message ?? error.message ?? '';

  // Streaming errors are retriable
  if (detectStreamingErrorFromMessage(message)) {
    return true;
  }

  if (code && RETRIABLE_CODES.has(code)) {
    return true;
  }
  if (error.status && RETRIABLE_STATUSES.has(error.status)) {
    return true;
  }

  // Fallback: unknown errors are retriable per spec
  const templateKey = resolveTemplateKey(error);
  if (templateKey === 'unknown') {
    return true;
  }

  return false;
}

export function classifyError(error: ApiError, context: ClassifyContext = {}): ClassifiedError {
  const component = error.error?.component;
  const code = error.error?.code ?? '';
  const rawMessage = error.error?.message ?? error.message ?? '';

  const isPartial = component ? PARTIAL_COMPONENTS.has(component) : false;
  const isStreamingError =
    (code && code in STREAMING_ERROR_MAP) || detectStreamingErrorFromMessage(rawMessage) !== null;

  const effectiveContext = {
    ...context,
    toolName: context.toolName ?? error.error?.tool_name,
  };

  const templateKey = resolveTemplateKey(error);
  const microcopy = getMicrocopy(templateKey, effectiveContext);
  const isRetriable = resolveRetriable(error);

  const displayComponent = component
    ? (COMPONENT_DISPLAY_NAMES[component] ?? component)
    : 'Unknown';
  const componentLabel =
    component === 'mcp' && effectiveContext.toolName
      ? `MCP: ${effectiveContext.toolName}`
      : displayComponent;

  let pattern: ClassifiedError['pattern'];
  let variant: ClassifiedError['variant'];

  if (isStreamingError && context.wasStreamStarted) {
    // Streaming interruptions: error occurred during streaming (with or without partial content)
    pattern = 'streaming-interruption';
    variant = 'danger'; // Streaming interruptions are always danger
  } else if (isPartial || context.wasResponseGenerated) {
    pattern = 'partial-failure';
    variant = 'warning'; // Partial failures are warnings
  } else {
    pattern = 'full-failure';
    variant = 'danger'; // Full failures are danger
  }

  return {
    pattern,
    variant,
    title: microcopy.title,
    description: microcopy.description,
    details: {
      component: componentLabel,
      errorCode: code || String(error.status ?? 'UNKNOWN'),
      rawMessage,
    },
    isRetriable,
    actionSuggestion: microcopy.actionSuggestion,
  };
}
