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
  connection_lost: 'stream:connection_lost', // Mock scenario code
  stream_timeout: 'stream:timeout',
  timeout: 'stream:timeout', // Mock scenario code (also real BFF timeout)
  stream_context: 'stream:context_length',
  context_length: 'stream:context_length',
  context_length_exceeded: 'stream:context_length', // Mock scenario code
  /* eslint-enable camelcase */
};

function resolveTemplateKey(error: ApiError): string {
  const { code, component } = error.error;
  const normalizedCode = code.toLowerCase();

  // Check for streaming errors first (they can have component + code)
  if (Object.prototype.hasOwnProperty.call(STREAMING_ERROR_MAP, normalizedCode)) {
    return STREAMING_ERROR_MAP[normalizedCode];
  }

  return `${component}:${normalizedCode}`;
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

  const { code, component } = error.error;
  const rawMessage = error.error.message || '';
  const normalizedCode = code.toLowerCase();

  const isPartial = PARTIAL_COMPONENTS.has(component);
  const isStreamingError = Object.prototype.hasOwnProperty.call(
    STREAMING_ERROR_MAP,
    normalizedCode,
  );

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

  if (isStreamingError && context.wasResponseGenerated) {
    pattern = 'streaming-interruption';
    variant = 'danger';
  } else if (isPartial || context.wasResponseGenerated) {
    pattern = 'partial-failure';
    variant = 'warning';
  } else {
    pattern = 'full-failure';
    variant = 'danger';
  }

  return {
    pattern,
    variant,
    title: microcopy.title,
    description: microcopy.description,
    details: {
      component: componentLabel,
      errorCode: code || 'UNKNOWN',
      rawMessage,
    },
    isRetriable,
  };
}
