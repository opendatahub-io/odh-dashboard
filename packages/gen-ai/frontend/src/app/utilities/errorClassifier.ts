import { ApiError, ClassifiedError } from '~/app/types';
import { getMicrocopy } from './microcopy';

interface ClassifyContext {
  modelName?: string;
  maxTokens?: number;
  toolName?: string;
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

const RETRIABLE_CODES = new Set(['timeout', 'server_error']);
const RETRIABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

function resolveTemplateKey(error: ApiError): string {
  const component = error.error?.component;
  const code = error.error?.code;

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

  const code = error.error?.code;
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
  if (isPartial) {
    pattern = 'partial-failure';
  } else {
    pattern = 'full-failure';
  }

  return {
    pattern,
    variant: isPartial ? 'warning' : 'danger',
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
