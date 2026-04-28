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

// Map streaming error codes to template keys
const STREAMING_ERROR_MAP: Record<string, string> = {
  /* eslint-disable camelcase */
  stream_lost: 'stream:connection_lost',
  stream_timeout: 'stream:timeout',
  stream_context: 'stream:context_length',
  context_length: 'stream:context_length',
  /* eslint-enable camelcase */
};

function resolveTemplateKey(error: ApiError): string {
  const component = error.error?.component;
  const code = error.error?.code;

  // Check for streaming errors first (they can have component + code)
  if (code && Object.prototype.hasOwnProperty.call(STREAMING_ERROR_MAP, code)) {
    return STREAMING_ERROR_MAP[code];
  }

  if (component && code) {
    return `${component}:${code}`;
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

  // Fallback for non-BFF errors: unknown errors are retriable per spec
  return true;
}

export function classifyError(error: ApiError, context: ClassifyContext = {}): ClassifiedError {
  // Handle null/undefined errors defensively
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!error) {
    return {
      pattern: 'full-failure',
      variant: 'danger',
      title: 'Something went wrong',
      description: 'An unexpected error occurred. Check the details below for more information.',
      details: {
        component: 'Unknown',
        errorCode: 'UNKNOWN',
        rawMessage: 'An unexpected error occurred',
      },
      isRetriable: true,
    };
  }

  const component = error.error?.component;
  const code = error.error?.code ?? '';
  const rawMessage = error.error?.message ?? error.message ?? '';

  const isPartial = component ? PARTIAL_COMPONENTS.has(component) : false;
  const isStreamingError = code && Object.prototype.hasOwnProperty.call(STREAMING_ERROR_MAP, code);

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
  let description: string;

  if (isStreamingError && context.wasStreamStarted) {
    pattern = 'streaming-interruption';
    variant = 'danger';
    description = rawMessage || microcopy.description;
  } else if (isPartial || context.wasResponseGenerated) {
    pattern = 'partial-failure';
    variant = 'warning';
    description = rawMessage
      ? `This response may be incomplete: ${rawMessage}`
      : microcopy.description;
  } else {
    pattern = 'full-failure';
    variant = 'danger';
    description = rawMessage || microcopy.description;
  }

  return {
    pattern,
    variant,
    title: microcopy.title,
    description,
    details: {
      component: componentLabel,
      errorCode: code || String(error.status ?? 'UNKNOWN'),
      rawMessage,
    },
    isRetriable,
    actionSuggestion: microcopy.actionSuggestion,
  };
}
