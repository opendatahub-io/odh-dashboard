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
  {
    trigger: 'max_tokens',
    apiError: {
      error: {
        component: 'model',
        code: 'max_tokens',
        message: '{"error": "max_tokens 16384 exceeds model context length of 8192"}',
        retriable: false,
      },
    },
    context: { maxTokens: 8192 },
  },
  {
    trigger: 'chat_template',
    apiError: {
      error: {
        component: 'model',
        code: 'chat_template',
        message: '{"error": "unsupported chat template format"}',
        retriable: false,
      },
    },
  },
  {
    trigger: 'no_tools',
    apiError: {
      error: {
        component: 'model',
        code: 'no_tools',
        message: '{"error": "tools not supported by model falcon-7b"}',
        retriable: false,
      },
    },
  },
  {
    trigger: 'no_images',
    apiError: {
      error: {
        component: 'model',
        code: 'no_images',
        message: '{"error": "image inputs not supported"}',
        retriable: false,
      },
    },
  },
  {
    trigger: 'timeout',
    apiError: {
      error: {
        component: 'llama_stack',
        code: 'timeout',
        message: '{"error": "upstream timeout after 30s"}',
        retriable: true,
      },
    },
  },
  {
    trigger: 'server_error',
    apiError: {
      error: {
        component: 'llama_stack',
        code: 'server_error',
        message: '{"error": "CUDA out of memory. Tried to allocate 2.00 GiB"}',
        retriable: true,
      },
    },
  },
  {
    trigger: 'rate_limit',
    apiError: {
      error: {
        component: 'bff',
        code: 'rate_limit',
        message: 'Too Many Requests',
        retriable: true,
      },
    },
  },
  {
    trigger: 'network_error',
    apiError: {
      error: {
        component: 'bff',
        code: 'network_error',
        message: 'Bad Gateway',
        retriable: true,
      },
    },
  },
  {
    trigger: 'unreachable',
    apiError: {
      error: {
        component: 'bff',
        code: 'unreachable',
        message: '{"error": "ECONNREFUSED 127.0.0.1:8080"}',
        retriable: true,
      },
    },
  },

  // ── Partial failures (show response + warning) ────────────────
  {
    trigger: 'rag_down',
    apiError: {
      error: {
        component: 'rag',
        code: 'unreachable',
        message: '{"error": "vector store product-docs unreachable at pgvector:5432"}',
        retriable: false,
      },
    },
    partialResponse:
      'Based on my general knowledge, the deployment process involves building a container image, pushing it to the registry, and applying the Kubernetes manifests. However, I was unable to retrieve specific documentation from your knowledge sources.',
  },
  {
    trigger: 'rag_embed',
    apiError: {
      error: {
        component: 'rag',
        code: 'embedding_failure',
        message: '{"error": "embedding model granite-125m returned 503"}',
        retriable: false,
      },
    },
    partialResponse:
      "I can provide a general answer, but note that I couldn't search your knowledge sources for this query. The typical configuration involves setting environment variables in the deployment spec.",
  },
  {
    trigger: 'rag_empty',
    apiError: {
      error: {
        component: 'rag',
        code: 'no_results',
        message:
          '{"info": "0 chunks returned from collection product-docs, similarity threshold 0.7"}',
        retriable: false,
      },
    },
    partialResponse:
      "I didn't find any matching documents in your knowledge sources, so here's what I know generally: the API accepts JSON payloads with a maximum size of 10MB.",
  },
  {
    trigger: 'guardrail_flagged',
    apiError: {
      error: {
        component: 'guardrails',
        code: 'content_flagged',
        message: '{"flagged_categories": ["violence"], "action": "warn", "confidence": 0.82}',
        retriable: false,
      },
    },
    partialResponse:
      'Here is the response content that was flagged by the guardrail system. The content has been delivered but should be reviewed carefully before use in any production context.',
  },
  {
    trigger: 'guardrail_down',
    apiError: {
      error: {
        component: 'guardrails',
        code: 'service_down',
        message: '{"error": "guardrail service at localhost:8089 returned 503"}',
        retriable: false,
      },
    },
    partialResponse:
      'This response was generated successfully, but the safety filter was unable to check it. Please review the content carefully.',
  },
  {
    trigger: 'mcp_down',
    apiError: {
      error: {
        component: 'mcp',
        code: 'unreachable',
        message: '{"error": "MCP server jira: connection timeout after 10s"}',
        // eslint-disable-next-line camelcase
        tool_name: 'Jira',
        retriable: false,
      },
    },
    partialResponse:
      "I tried to look up the relevant Jira tickets but the Jira server wasn't available. Based on what I know, the current sprint has 12 story points remaining.",
  },
  {
    trigger: 'mcp_auth',
    apiError: {
      error: {
        component: 'mcp',
        code: 'auth_failure',
        message: '{"error": "MCP server kubernetes: 401 Unauthorized"}',
        // eslint-disable-next-line camelcase
        tool_name: 'Kubernetes',
        retriable: false,
      },
    },
    partialResponse:
      'I attempted to query the Kubernetes cluster but the credentials were rejected. You may need to refresh the authentication token.',
  },
  {
    trigger: 'mcp_exec',
    apiError: {
      error: {
        component: 'mcp',
        code: 'execution_error',
        message: '{"error": "MCP tool slack.post_message failed: channel not found"}',
        // eslint-disable-next-line camelcase
        tool_name: 'Slack',
        retriable: false,
      },
    },
    partialResponse:
      "I tried to post the summary to Slack but the tool returned an error. Here's the summary I would have posted:\n\n**Sprint 42 Status:** 8 of 12 stories completed, 2 in review, 2 blocked.",
  },

  // ── Streaming interruptions (dimmed partial text + error) ─────
  {
    trigger: 'stream_lost',
    apiError: {
      error: {
        component: 'llama_stack',
        code: 'timeout',
        message: '{"error": "stream terminated: connection reset by peer"}',
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
        component: 'llama_stack',
        code: 'timeout',
        message: '{"error": "no tokens received for 30s, stream timed out"}',
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
        component: 'model',
        code: 'context_length',
        message: '{"error": "context length 8192 exceeded at token 8191"}',
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
 */
export function findMockScenario(message: string): MockScenario | undefined {
  const lower = message.toLowerCase().trim();
  // Only match if exact trigger or if message starts with "MOCK:" prefix
  return MOCK_SCENARIOS.find(
    (s) => lower === s.trigger || (lower.startsWith('mock:') && lower.includes(s.trigger)),
  );
}
