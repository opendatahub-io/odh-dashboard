interface MicrocopyTemplate {
  title: string;
  description: string;
  actionSuggestion?: string;
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

const fullFailureTemplates: Record<string, MicrocopyTemplate> = {
  'model:max_tokens': {
    title: 'Token limit exceeds model capacity',
    description:
      '{modelName} supports a maximum of {maxTokens} tokens. Reduce the token limit in the Build panel.',
    actionSuggestion: 'Open Build panel',
  },
  'llama_stack:invalid_model_config': {
    title: 'Model configuration error',
    description:
      "{modelName} doesn't support the current chat template. Check the model's documentation for supported templates.",
  },
  'llama_stack:unsupported_feature': {
    title: "This model doesn't support tool calling",
    description:
      "{modelName} doesn't support the tools feature you've enabled. Try selecting a model that supports tool calling, or disable tools in the Build panel.",
    actionSuggestion: 'Open Build panel',
  },
  'model:no_images': {
    title: "This model doesn't support image input",
    description:
      "{modelName} can't process images. Try selecting a multimodal model, or remove the image from your message.",
  },
  'llama_stack:invalid_parameter': {
    title: 'Invalid parameter',
    description:
      'One or more parameters are invalid. Check temperature, top_p, and other settings.',
  },
  'llama_stack:model_timeout': {
    title: 'Model inference failed',
    description: "The model server didn't respond in time. This may be a temporary issue.",
  },
  'llama_stack:model_overloaded': {
    title: 'Request was rate limited',
    description: 'Too many requests to the model server. Wait a moment before trying again.',
  },
  'model:model_invocation_error': {
    title: 'Model server error',
    description: "The model server encountered an internal error and couldn't generate a response.",
  },
  'llama_stack:generic_error': {
    title: 'Model server error',
    description: "The model server encountered an internal error and couldn't generate a response.",
  },
  'bff:bad_request': {
    title: 'Invalid request',
    description: 'The request is invalid. Check your input and try again.',
  },
  'bff:unauthorized': {
    title: 'Authentication required',
    description: 'Your session is invalid. Please sign in again.',
  },
  'bff:forbidden': {
    title: 'Access denied',
    description: "You don't have permission to perform this action.",
  },
  'bff:not_found': {
    title: 'Resource not found',
    description: 'The requested resource could not be found.',
  },
  'bff:internal_error': {
    title: 'Server error',
    description: 'The server encountered a problem. Please try again.',
  },
  'bff:rate_limit': {
    title: 'Request was rate limited',
    description: 'Too many requests to the model server. Wait a moment before trying again.',
  },
  'bff:network_error': {
    title: "Couldn't reach the server",
    description: "The playground server isn't responding. Check your connection and try again.",
  },
  'bff:unreachable': {
    title: "Couldn't reach the server",
    description: 'Unable to connect to the playground backend. Check that the service is running.',
  },
};

const partialFailureTemplates: Record<string, MicrocopyTemplate> = {
  'rag:rag_error': {
    title: 'Knowledge source retrieval failed',
    description:
      'This response was generated without context from your knowledge sources. Results may be less accurate.',
  },
  'rag:rag_vector_store_not_found': {
    title: 'No matching knowledge found',
    description:
      "Your knowledge sources didn't return any relevant results. The response was generated without additional context.",
  },
  'rag:embedding_failure': {
    title: 'Knowledge source retrieval failed',
    description:
      "The embedding model couldn't process your query for retrieval. The response doesn't include knowledge source context.",
  },
  'rag:unreachable': {
    title: 'Knowledge source retrieval failed',
    description:
      'This response was generated without context from your knowledge sources. Results may be less accurate.',
  },
  'rag:no_results': {
    title: 'No matching knowledge found',
    description:
      "Your knowledge sources didn't return any relevant results. The response was generated without additional context.",
  },
  'guardrails:guardrails_error': {
    title: 'Guardrail check was not applied',
    description: "The safety filter couldn't process this response. Review the output carefully.",
  },
  'guardrails:guardrails_violation': {
    title: 'Content was flagged by guardrails',
    description: 'A guardrail flagged this response. Review the output carefully.',
  },
  'guardrails:service_down': {
    title: 'Guardrail check was not applied',
    description: "The safety filter couldn't process this response. Review the output carefully.",
  },
  'mcp:mcp_error': {
    title: '{toolName} tool call failed',
    description:
      "The model attempted to use the {toolName} tool but the server didn't respond. The response was generated without this tool's output.",
  },
  'mcp:mcp_tool_not_found': {
    title: '{toolName} tool call failed',
    description:
      "The model attempted to use the {toolName} tool but the server didn't respond. The response was generated without this tool's output.",
  },
  'mcp:mcp_auth_error': {
    title: '{toolName} tool call failed',
    description:
      "The {toolName} tool server rejected the request due to an authentication error. Check the server's credentials in the Build panel.",
    actionSuggestion: 'Open Build panel',
  },
  'mcp:execution_error': {
    title: '{toolName} tool returned an error',
    description:
      'The {toolName} tool encountered an error during execution. The response may be incomplete.',
  },
  'mcp:unreachable': {
    title: '{toolName} tool call failed',
    description:
      "The model attempted to use the {toolName} tool but the server didn't respond. The response was generated without this tool's output.",
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
): { title: string; description: string; actionSuggestion?: string } {
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
    actionSuggestion: template.actionSuggestion,
  };
}
