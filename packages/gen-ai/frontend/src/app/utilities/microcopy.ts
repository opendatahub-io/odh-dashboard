interface MicrocopyTemplate {
  title: string;
  description: string;
}

interface MicrocopyContext {
  modelName?: string;
  maxTokens?: number;
  toolName?: string;
}

function interpolate(template: string, context: MicrocopyContext): string {
  return template
    .replace('{modelName}', context.modelName ?? 'The selected model')
    .replace('{maxTokens}', context.maxTokens?.toString() ?? 'the maximum')
    .replace('{toolName}', context.toolName ?? 'A tool');
}

// Template keys are constructed as `${component}:${code.toLowerCase()}` by the
// error classifier. Only include keys for codes that the BFF or OGX actually
// produce today. See OGXErr* and ErrCode* constants in llamastack/errors.go.
const fullFailureTemplates: Record<string, MicrocopyTemplate> = {
  // BFF error codes (from ErrCode* constants, lowercased by frontend)
  'bff:invalid_request': {
    title: 'Invalid request',
    description: 'The request is invalid. Check your input and try again.',
  },
  'bff:unauthorized': {
    title: 'Authentication required',
    description: 'Your session is invalid. Please sign in again.',
  },
  'bff:not_found': {
    title: 'Resource not found',
    description: 'The requested resource could not be found.',
  },
  'bff:internal_error': {
    title: 'Server error',
    description: 'The server encountered a problem. Please try again.',
  },
  'bff:connection_failed': {
    title: "Couldn't reach the server",
    description: 'Unable to connect to the OGX server. Check that the service is running.',
  },
  'ogx:connection_failed': {
    title: "Couldn't reach the server",
    description: 'Unable to connect to the OGX server. Check that the service is running.',
  },
  'bff:timeout': {
    title: 'Request timed out',
    description: "The server didn't respond in time. This may be a temporary issue.",
  },
  'bff:server_unavailable': {
    title: 'Server unavailable',
    description: 'The OGX server is currently unavailable. Please try again later.',
  },
  // OGX response.failed codes (from OGXErr* constants)
  'ogx:server_error': {
    title: 'Server error',
    description: 'The server encountered an internal error. Please try again.',
  },
  'ogx:rate_limit_exceeded': {
    title: 'Request was rate limited',
    description: 'Too many requests to the model server. Wait a moment before trying again.',
  },
};

const partialFailureTemplates: Record<string, MicrocopyTemplate> = {
  // Guardrails error codes (from BFF constants in guardrails.go)
  'guardrails:guardrail_service_unavailable': {
    title: 'Guardrail check was not applied',
    description: "The safety filter couldn't process this response. Review the output carefully.",
  },
  'guardrails:guardrail_input_violation': {
    title: 'Content was flagged by guardrails',
    description: 'A guardrail flagged this input. Review the content carefully.',
  },
  'guardrails:guardrail_output_violation': {
    title: 'Content was flagged by guardrails',
    description: 'A guardrail flagged this response. Review the output carefully.',
  },
};

const streamingTemplates: Record<string, MicrocopyTemplate> = {
  'stream:connection_lost': {
    title: 'Streaming error — connection lost',
    description: 'The connection to the model was lost during generation.',
  },
  'stream:timeout': {
    title: 'Streaming error — response timed out',
    description: 'The model stopped responding during generation.',
  },
  'stream:context_length': {
    title: 'Streaming error — context length exceeded',
    description: "The response exceeded the model's context length.",
  },
};

const fallbackTemplate: MicrocopyTemplate = {
  title: 'Something went wrong',
  description: 'An unexpected error occurred. Check the details below for more information.',
};

export function getMicrocopy(
  templateKey: string,
  context: MicrocopyContext = {},
): { title: string; description: string } {
  /* eslint-disable @typescript-eslint/no-unnecessary-condition */
  const template =
    fullFailureTemplates[templateKey] ||
    partialFailureTemplates[templateKey] ||
    streamingTemplates[templateKey] ||
    fallbackTemplate;
  /* eslint-enable @typescript-eslint/no-unnecessary-condition */

  return {
    title: interpolate(template.title, context),
    description: interpolate(template.description, context),
  };
}
