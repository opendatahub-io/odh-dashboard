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
  const { component } = error.error;
  const { code } = error.error;

  // Check for streaming errors first (they can have component + code)
  if (Object.prototype.hasOwnProperty.call(STREAMING_ERROR_MAP, code)) {
    return STREAMING_ERROR_MAP[code];
  }

  return `${component}:${code}`;
}

function resolveRetriable(error: ApiError): boolean {
  return error.error.retriable;
}

export function classifyError(error: ApiError, context: ClassifyContext = {}): ClassifiedError {
  // Handle null/undefined errors
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!error || !error.error) {
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
      isRetriable: false,
    };
  }

  const { component } = error.error;
  const { code } = error.error;
  const rawMessage = error.error.message || error.message || '';

  const isPartial = PARTIAL_COMPONENTS.has(component);
  const isStreamingError = Object.prototype.hasOwnProperty.call(STREAMING_ERROR_MAP, code);

  const effectiveContext = {
    ...context,
    toolName: context.toolName ?? error.error.tool_name,
  };

  const templateKey = resolveTemplateKey(error);
  const microcopy = getMicrocopy(templateKey, effectiveContext);
  const isRetriable = resolveRetriable(error);

  const displayComponent = COMPONENT_DISPLAY_NAMES[component] ?? component;
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
