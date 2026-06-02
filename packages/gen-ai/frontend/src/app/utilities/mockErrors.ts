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

/**
 * Mock error scenarios for testing error handling in development.
 *
 * USAGE: To trigger a mock error, type "MOCK:" followed by the trigger name.
 * Example: typing "MOCK:timeout" will simulate a timeout error.
 *
 * This requires explicit opt-in to prevent accidental triggering on common words.
 */
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
  // OGX error codes (from OGXErr* constants in llamastack/errors.go)
  {
    trigger: 'rate_limit_exceeded',
    apiError: {
      error: {
        component: 'ogx',
        code: 'rate_limit_exceeded',
        message: 'Rate limit exceeded: 60 requests per minute',
        retriable: true,
      },
    },
  },
  {
    trigger: 'server_error',
    apiError: {
      error: {
        component: 'ogx',
        code: 'server_error',
        message: 'Server encountered an internal error',
        retriable: true,
      },
    },
  },
  // ── Partial failures (show response + warning) ────────────────
  // Guardrails error codes (from BFF constants in guardrails.go)
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
  // ── Streaming interruptions (dimmed partial text + error) ─────
  // These use actual timeout/error codes that would occur during streaming
  {
    trigger: 'stream_lost',
    apiError: {
      error: {
        component: 'bff',
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
        component: 'ogx',
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
 * Requires MOCK: prefix to prevent accidental triggering on common English words.
 *
 * Valid format:
 * - "MOCK:timeout" (case-insensitive, must match exactly after prefix)
 */
export function findMockScenario(message: string): MockScenario | undefined {
  const lower = message.toLowerCase().trim();

  // Only accept MOCK: prefix format to prevent accidental triggering
  if (lower.startsWith('mock:')) {
    const triggerPart = lower.slice(5).trim(); // Remove "mock:" prefix
    return MOCK_SCENARIOS.find((s) => triggerPart === s.trigger);
  }

  return undefined;
}
