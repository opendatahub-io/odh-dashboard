import { ApiError } from '~/app/types';

interface MockScenario {
  trigger: string;
  apiError: ApiError;
  /** If set, a partial model response is shown alongside the error */
  partialResponse?: string;
  /** Context overrides for the classifier (modelName, toolName, etc.) */
  context?: { modelName?: string; maxTokens?: number; toolName?: string };
  /** Force a specific pattern (used for streaming-interruption) */
  forcePattern?: 'streaming-interruption';
  /** Override microcopy key for streaming scenarios */
  microcopyKey?: string;
}

export const MOCK_SCENARIOS: MockScenario[] = [
  // ── Full failures ──────────────────────────────────────────────
  // BFF error codes (actual codes from BFF error handling)
  {
    trigger: 'invalid_request',
    apiError: {
      error: {
        component: 'bff',
        code: 'invalid_request',
        message: 'Invalid request parameters',
        retriable: false,
      },
    },
  },
  {
    trigger: 'unauthorized',
    apiError: {
      error: {
        component: 'bff',
        code: 'unauthorized',
        message: 'Unauthorized: authentication required',
        retriable: false,
      },
    },
  },
  {
    trigger: 'not_found',
    apiError: {
      error: {
        component: 'bff',
        code: 'not_found',
        message: 'Resource not found',
        retriable: false,
      },
    },
  },
  {
    trigger: 'connection_failed',
    apiError: {
      error: {
        component: 'bff',
        code: 'connection_failed',
        message: 'Failed to connect to LlamaStack server',
        retriable: true,
      },
    },
  },
  {
    trigger: 'timeout',
    apiError: {
      error: {
        component: 'bff',
        code: 'timeout',
        message: 'Request timed out',
        retriable: true,
      },
    },
  },
  {
    trigger: 'server_unavailable',
    apiError: {
      error: {
        component: 'bff',
        code: 'server_unavailable',
        message: 'LlamaStack server is unavailable',
        retriable: true,
      },
    },
  },
  {
    trigger: 'internal_error',
    apiError: {
      error: {
        component: 'bff',
        code: 'internal_error',
        message: 'Internal server error',
        retriable: true,
      },
    },
  },
  // Model error codes (from LlamaStack/OpenAI API responses)
  {
    trigger: 'invalid_model',
    apiError: {
      error: {
        component: 'model',
        code: 'invalid_model',
        message: 'The specified model is invalid or not supported',
        retriable: false,
      },
    },
  },
  {
    trigger: 'model_not_found',
    apiError: {
      error: {
        component: 'model',
        code: 'model_not_found',
        message: 'The specified model was not found',
        retriable: false,
      },
    },
  },
  {
    trigger: 'model_unavailable',
    apiError: {
      error: {
        component: 'model',
        code: 'model_unavailable',
        message: 'Model is currently unavailable',
        retriable: true,
      },
    },
  },
  {
    trigger: 'model_error',
    apiError: {
      error: {
        component: 'model',
        code: 'model_error',
        message: 'Model encountered an error during inference',
        retriable: true,
      },
    },
  },
  {
    trigger: 'invalid_parameter',
    apiError: {
      error: {
        component: 'model',
        code: 'invalid_parameter',
        message: 'Invalid parameter: temperature must be between 0 and 2',
        retriable: false,
      },
    },
  },
  {
    trigger: 'invalid_request_error',
    apiError: {
      error: {
        component: 'model',
        code: 'invalid_request_error',
        message: 'Invalid request: missing required field',
        retriable: false,
      },
    },
  },
  // Rate limiting errors
  {
    trigger: 'rate_limit_exceeded',
    apiError: {
      error: {
        component: 'llama_stack',
        code: 'rate_limit_exceeded',
        message: 'Rate limit exceeded: 60 requests per minute',
        retriable: true,
      },
    },
  },
  {
    trigger: 'insufficient_quota',
    apiError: {
      error: {
        component: 'llama_stack',
        code: 'insufficient_quota',
        message: 'Insufficient quota for this operation',
        retriable: true,
      },
    },
  },
  // Server errors
  {
    trigger: 'server_error',
    apiError: {
      error: {
        component: 'llama_stack',
        code: 'server_error',
        message: 'Server encountered an internal error',
        retriable: true,
      },
    },
  },
  {
    trigger: 'service_unavailable',
    apiError: {
      error: {
        component: 'llama_stack',
        code: 'service_unavailable',
        message: 'Service is temporarily unavailable',
        retriable: true,
      },
    },
  },

  // ── Partial failures (show response + warning) ────────────────
  // RAG error codes (actual codes from BFF error handling)
  {
    trigger: 'resource_not_found',
    apiError: {
      error: {
        component: 'rag',
        code: 'resource_not_found',
        message: 'Vector store resource not found',
        retriable: false,
      },
    },
    partialResponse:
      'Based on my general knowledge, the deployment process involves building a container image, pushing it to the registry, and applying the Kubernetes manifests. However, I was unable to retrieve specific documentation from your knowledge sources.',
  },
  {
    trigger: 'vector_store_not_found',
    apiError: {
      error: {
        component: 'rag',
        code: 'vector_store_not_found',
        message: 'Vector store not found or unavailable',
        retriable: false,
      },
    },
    partialResponse:
      "I didn't find any matching documents in your knowledge sources, so here's what I know generally: the API accepts JSON payloads with a maximum size of 10MB.",
  },
  // Guardrails error codes (actual codes from BFF constants)
  {
    trigger: 'guardrail_service_unavailable',
    apiError: {
      error: {
        component: 'guardrails',
        code: 'guardrail_service_unavailable',
        message: 'Guardrail service is temporarily unavailable',
        retriable: false,
      },
    },
    partialResponse:
      'This response was generated successfully, but the safety filter was unable to check it. Please review the content carefully.',
  },
  {
    trigger: 'guardrail_input_violation',
    apiError: {
      error: {
        component: 'guardrails',
        code: 'guardrail_input_violation',
        message: 'Input blocked by guardrails',
        retriable: false,
      },
    },
    partialResponse:
      'Your input was blocked by the safety filter. Please review your message for prompt manipulation, harmful content, or sensitive data.',
  },
  {
    trigger: 'guardrail_output_violation',
    apiError: {
      error: {
        component: 'guardrails',
        code: 'guardrail_output_violation',
        message: 'Output flagged by guardrails',
        retriable: false,
      },
    },
    partialResponse:
      'The response was flagged by the guardrail system. The content has been delivered but should be reviewed carefully before use in any production context.',
  },
  // MCP error codes (actual codes from BFF error handling)
  {
    trigger: 'tool_error',
    apiError: {
      error: {
        component: 'mcp',
        code: 'tool_error',
        message: 'MCP tool execution failed',
        // eslint-disable-next-line camelcase
        tool_name: 'Jira',
        retriable: false,
      },
    },
    partialResponse:
      'I tried to look up the relevant Jira tickets but the tool encountered an error. Based on what I know, the current sprint has 12 story points remaining.',
  },
  {
    trigger: 'tool_not_found',
    apiError: {
      error: {
        component: 'mcp',
        code: 'tool_not_found',
        message: 'MCP tool not found on server',
        // eslint-disable-next-line camelcase
        tool_name: 'Jira',
        retriable: false,
      },
    },
    partialResponse:
      "I tried to look up the relevant Jira tickets but the tool wasn't available on the server. Based on what I know, the current sprint has 12 story points remaining.",
  },
  {
    trigger: 'mcp_error',
    apiError: {
      error: {
        component: 'mcp',
        code: 'mcp_error',
        message: 'MCP server connection failed',
        // eslint-disable-next-line camelcase
        tool_name: 'Kubernetes',
        retriable: false,
      },
    },
    partialResponse:
      'I attempted to query the Kubernetes cluster but the MCP server was unreachable. You may need to check the server configuration.',
  },

  // ── Streaming interruptions (dimmed partial text + error) ─────
  // These use actual timeout/error codes that would occur during streaming
  {
    trigger: 'stream_lost',
    apiError: {
      error: {
        component: 'stream',
        code: 'connection_lost',
        message: 'Stream terminated: connection reset by peer',
        retriable: true,
      },
    },
    partialResponse:
      'The deployment architecture consists of three main layers:\n\n1. **API Gateway** — handles authentication, rate limiting, and routing\n2. **Application Services** — the core business logic running in',
    forcePattern: 'streaming-interruption',
    microcopyKey: 'stream:connection_lost',
  },
  {
    trigger: 'stream_timeout',
    apiError: {
      error: {
        component: 'bff',
        code: 'timeout',
        message: 'No tokens received for 30s, stream timed out',
        retriable: true,
      },
    },
    partialResponse:
      'To configure the vector store, you need to:\n\n1. Create a PGVector instance with the correct embedding dimensions\n2. Set the similarity threshold to at least 0.7\n3.',
    forcePattern: 'streaming-interruption',
    microcopyKey: 'stream:timeout',
  },
  {
    trigger: 'stream_context',
    apiError: {
      error: {
        component: 'llama_stack',
        code: 'context_length_exceeded',
        message: 'Context length 8192 exceeded at token 8191',
        retriable: false,
      },
    },
    partialResponse:
      'Here is a comprehensive overview of the entire system architecture, covering all microservices, their responsibilities, communication patterns, and deployment configurations. The platform consists of the following services:\n\n- **auth-service**: Handles OAuth 2.0 flows\n- **user-service**: Manages user profiles and preferences\n- **notification-service**: Sends emails, push notifications, and SMS\n- **billing-service**: Processes payments via Stripe integration\n- **analytics-service**:',
    forcePattern: 'streaming-interruption',
    microcopyKey: 'stream:context_length',
  },
];

/**
 * Check if a message matches any mock error scenario.
 * Returns the first matching scenario, or undefined if no match.
 * Uses exact match or opt-in token to prevent accidental triggering.
 *
 * Valid formats:
 * - Exact trigger: "max_tokens"
 * - Opt-in token: "MOCK:max_tokens" (must match exactly after prefix)
 */
export function findMockScenario(message: string): MockScenario | undefined {
  const lower = message.toLowerCase().trim();

  // Check for exact match first
  if (MOCK_SCENARIOS.some((s) => lower === s.trigger)) {
    return MOCK_SCENARIOS.find((s) => lower === s.trigger);
  }

  // Check for MOCK: prefix with exact trigger match
  if (lower.startsWith('mock:')) {
    const triggerPart = lower.slice(5).trim(); // Remove "mock:" prefix
    return MOCK_SCENARIOS.find((s) => triggerPart === s.trigger);
  }

  return undefined;
}
