import { ErrorPattern, ErrorSeverity } from '~/app/types';
import { ERROR_CATEGORIES } from '~/app/Chatbot/const';
import { classifyError } from '~/app/utilities/errorClassifier';

describe('errorClassifier', () => {
  describe('classifyError', () => {
    describe('error pattern determination', () => {
      it('should classify as full-failure when no response was generated', () => {
        const error = { error: { code: 'timeout', message: 'Request timed out' } };
        const result = classifyError(error, {
          wasResponseGenerated: false,
          wasStreamStarted: false,
        });

        expect(result.pattern).toBe('full-failure' as ErrorPattern);
        expect(result.variant).toBe('danger' as ErrorSeverity);
      });

      it('should classify as partial-failure when response was generated', () => {
        const error = {
          error: {
            component: 'rag' as const,
            code: 'unreachable',
            message: 'RAG retrieval failed',
          },
        };
        const result = classifyError(error, {
          wasResponseGenerated: true,
          wasStreamStarted: false,
        });

        expect(result.pattern).toBe('partial-failure' as ErrorPattern);
        expect(result.variant).toBe('warning' as ErrorSeverity);
      });

      it('should classify as streaming_interruption when stream started but no full response', () => {
        const error = { error: { code: 'stream_lost', message: 'Connection lost' } };
        const result = classifyError(error, {
          wasResponseGenerated: false,
          wasStreamStarted: true,
        });

        expect(result.pattern).toBe('streaming-interruption' as ErrorPattern);
        expect(result.variant).toBe('danger' as ErrorSeverity);
      });

      it('should classify as streaming_interruption when stream started with partial response', () => {
        const error = { error: { code: 'stream_lost', message: 'Connection lost' } };
        const result = classifyError(error, {
          wasResponseGenerated: true,
          wasStreamStarted: true,
        });

        expect(result.pattern).toBe('streaming-interruption' as ErrorPattern);
        expect(result.variant).toBe('danger' as ErrorSeverity);
      });
    });

    describe('retriable determination', () => {
      it('should mark as retriable when error has explicit retriable flag set to true', () => {
        const error = {
          error: { code: 'custom_error', message: 'Custom error', retriable: true },
        };
        const result = classifyError(error);

        expect(result.isRetriable).toBe(true);
      });

      it('should mark as non-retriable when error has explicit retriable flag set to false', () => {
        const error = {
          error: { code: 'timeout', message: 'Timeout', retriable: false },
        };
        const result = classifyError(error);

        expect(result.isRetriable).toBe(false);
      });

      it('should mark timeout errors as retriable', () => {
        const error = { error: { code: 'timeout', message: 'Request timed out' } };
        const result = classifyError(error);

        expect(result.isRetriable).toBe(true);
      });

      it('should mark server errors as retriable', () => {
        const error = { error: { code: 'server_error', message: 'Server error' } };
        const result = classifyError(error);

        expect(result.isRetriable).toBe(true);
      });

      it('should mark stream_lost as retriable', () => {
        const error = { error: { code: 'stream_lost', message: 'Stream lost' } };
        const result = classifyError(error);

        expect(result.isRetriable).toBe(true);
      });

      it('should mark stream_timeout as retriable', () => {
        const error = { error: { code: 'stream_timeout', message: 'Stream timeout' } };
        const result = classifyError(error);

        expect(result.isRetriable).toBe(true);
      });

      it('should mark stream_context as non-retriable', () => {
        const error = { error: { code: 'stream_context', message: 'Context exceeded' } };
        const result = classifyError(error);

        expect(result.isRetriable).toBe(false);
      });

      it('should mark context_length as non-retriable', () => {
        const error = {
          error: { code: 'context_length', message: 'Context length exceeded' },
        };
        const result = classifyError(error);

        expect(result.isRetriable).toBe(false);
      });

      it('should mark 429 HTTP status as retriable', () => {
        const error = { status: 429, error: { message: 'Too many requests' } };
        const result = classifyError(error);

        expect(result.isRetriable).toBe(true);
      });

      it('should mark 5xx HTTP statuses as retriable', () => {
        expect(classifyError({ status: 500, error: { message: 'Server error' } }).isRetriable).toBe(
          true,
        );
        expect(classifyError({ status: 502, error: { message: 'Bad gateway' } }).isRetriable).toBe(
          true,
        );
        expect(
          classifyError({ status: 503, error: { message: 'Service unavailable' } }).isRetriable,
        ).toBe(true);
        expect(
          classifyError({ status: 504, error: { message: 'Gateway timeout' } }).isRetriable,
        ).toBe(true);
      });

      it('should mark configuration errors as non-retriable', () => {
        const errors = [
          { error: { code: 'max_tokens', message: 'Token limit exceeded' } },
          { error: { code: 'chat_template', message: 'Invalid chat template' } },
          { error: { code: 'no_tools', message: 'Tools not supported' } },
          { error: { code: 'no_images', message: 'Images not supported' } },
        ];

        errors.forEach((error) => {
          expect(classifyError(error).isRetriable).toBe(false);
        });
      });
    });

    describe('error title generation', () => {
      it('should generate title for max_tokens error', () => {
        const error = {
          error: {
            component: 'model' as const,
            code: 'max_tokens',
            message: 'Token limit exceeded',
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Token limit exceeds model capacity');
      });

      it('should generate title for chat_template error', () => {
        const error = {
          error: {
            component: 'model' as const,
            code: 'chat_template',
            message: 'Invalid template',
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Model configuration error');
      });

      it('should generate title for no_tools error', () => {
        const error = {
          error: {
            component: 'model' as const,
            code: 'no_tools',
            message: 'Tools not supported',
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe("This model doesn't support tool calling");
      });

      it('should generate title for no_images error', () => {
        const error = {
          error: {
            component: 'model' as const,
            code: 'no_images',
            message: 'Images not supported',
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe("This model doesn't support image input");
      });

      it('should generate title for timeout error', () => {
        const error = {
          error: {
            component: 'llama_stack' as const,
            code: 'timeout',
            message: 'Request timed out',
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Model inference failed');
      });

      it('should generate title for server_error', () => {
        const error = {
          error: {
            component: 'llama_stack' as const,
            code: 'server_error',
            message: 'Internal error',
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Model server error');
      });

      it('should generate title for rate_limit error', () => {
        const error = { status: 429, error: { message: 'Too many requests' } };
        const result = classifyError(error);

        expect(result.title).toBe('Request was rate limited');
      });

      it('should generate title for RAG errors', () => {
        const errors = [
          { code: 'unreachable', expected: 'Knowledge source retrieval failed' },
          { code: 'embedding_failure', expected: 'Knowledge source retrieval failed' },
          { code: 'no_results', expected: 'No matching knowledge found' },
        ];

        errors.forEach(({ code, expected }) => {
          const error = {
            error: { component: 'rag' as const, code, message: 'RAG error' },
          };
          expect(classifyError(error).title).toBe(expected);
        });
      });

      it('should generate title for guardrails errors', () => {
        const errors = [
          { code: 'content_flagged', expected: 'Content was flagged by guardrails' },
          { code: 'service_down', expected: 'Guardrail check was not applied' },
        ];

        errors.forEach(({ code, expected }) => {
          const error = {
            error: { component: 'guardrails' as const, code, message: 'Guardrails error' },
          };
          expect(classifyError(error).title).toBe(expected);
        });
      });

      it('should generate title for MCP errors with tool name', () => {
        const error = {
          error: {
            component: 'mcp' as const,
            code: 'unreachable',
            message: 'Tool failed',
            // eslint-disable-next-line camelcase
            tool_name: 'GitHub',
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('GitHub tool call failed');
      });

      it('should generate title for MCP errors without tool name', () => {
        const error = {
          error: { component: 'mcp' as const, code: 'unreachable', message: 'Tool failed' },
        };
        const result = classifyError(error);

        expect(result.title).toBe('A tool tool call failed');
      });

      it('should generate title for streaming interruptions', () => {
        const errors = [
          { code: 'stream_lost', expected: 'Streaming error — connection lost' },
          { code: 'stream_timeout', expected: 'Streaming error — response timed out' },
          { code: 'stream_context', expected: 'Streaming error — context length exceeded' },
        ];

        errors.forEach(({ code, expected }) => {
          const error = { error: { code, message: 'Stream error' } };
          const result = classifyError(error, { wasStreamStarted: true });
          expect(result.title).toBe(expected);
        });
      });

      it('should detect streaming errors from timeout with message keywords', () => {
        const error = {
          error: {
            component: 'llama_stack' as const,
            code: 'timeout',
            message: '{"error": "stream terminated: connection reset by peer"}',
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Streaming error — connection lost');
        // Full failures show actual error message
        expect(result.description).toBe('{"error": "stream terminated: connection reset by peer"}');
      });

      it('should detect context_length error from BFF', () => {
        const error = {
          error: {
            component: 'model' as const,
            code: 'context_length',
            message: '{"error": "context length 8192 exceeded at token 8191"}',
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Streaming error — context length exceeded');
        // Full failures show actual error message
        expect(result.description).toBe('{"error": "context length 8192 exceeded at token 8191"}');
      });

      it('should detect context length from message keywords', () => {
        const error = {
          error: {
            component: 'model' as const,
            code: 'some_error',
            message: '{"error": "context length exceeded at token 8191"}',
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Streaming error — context length exceeded');
      });

      it('should use generic title for unknown errors', () => {
        const error = { error: { code: 'unknown_code', message: 'Unknown error' } };
        const result = classifyError(error);

        // Unknown errors without status or component fall back to bff:unreachable
        expect(result.title).toBe("Couldn't reach the server");
      });
    });

    describe('error description generation', () => {
      it('should generate description for max_tokens error with model name', () => {
        const error = {
          error: {
            component: 'model' as const,
            code: 'max_tokens',
            message: 'Token limit exceeded',
          },
        };
        const result = classifyError(error, { modelName: 'Llama 3.1 8B' });

        // Full failures show actual error message
        expect(result.description).toBe('Token limit exceeded');
      });

      it('should generate description for max_tokens error without model name', () => {
        const error = {
          error: {
            component: 'model' as const,
            code: 'max_tokens',
            message: 'Token limit exceeded',
          },
        };
        const result = classifyError(error);

        // Full failures show actual error message
        expect(result.description).toBe('Token limit exceeded');
      });

      it('should generate description for chat_template error', () => {
        const error = {
          error: {
            component: 'model' as const,
            code: 'chat_template',
            message: 'Invalid template',
          },
        };
        const result = classifyError(error, { modelName: 'Llama 3.1 8B' });

        // Full failures show actual error message
        expect(result.description).toBe('Invalid template');
      });

      it('should generate description for no_tools error', () => {
        const error = {
          error: {
            component: 'model' as const,
            code: 'no_tools',
            message: 'Tools not supported',
          },
        };
        const result = classifyError(error, { modelName: 'Llama 3.1 8B' });

        // Full failures show actual error message
        expect(result.description).toBe('Tools not supported');
      });

      it('should generate description for no_images error', () => {
        const error = {
          error: {
            component: 'model' as const,
            code: 'no_images',
            message: 'Images not supported',
          },
        };
        const result = classifyError(error);

        // Full failures show actual error message
        expect(result.description).toBe('Images not supported');
      });

      it('should generate description for timeout error', () => {
        const error = {
          error: {
            component: 'llama_stack' as const,
            code: 'timeout',
            message: 'Request timed out',
          },
        };
        const result = classifyError(error);

        // Full failures show actual error message
        expect(result.description).toBe('Request timed out');
      });

      it('should generate description for server_error', () => {
        const error = {
          error: {
            component: 'llama_stack' as const,
            code: 'server_error',
            message: 'Server error',
          },
        };
        const result = classifyError(error);

        // Full failures show actual error message
        expect(result.description).toBe('Server error');
      });

      it('should generate description for rate_limit error', () => {
        const error = { status: 429, error: { message: 'Rate limited' } };
        const result = classifyError(error);

        // Full failures show actual error message
        expect(result.description).toBe('Rate limited');
      });

      it('should generate description for service_unavailable error', () => {
        const error = { status: 503, error: { message: 'Service down' } };
        const result = classifyError(error);

        // Full failures show actual error message
        expect(result.description).toBe('Service down');
      });

      it('should generate description for RAG partial failures', () => {
        const error = {
          error: { component: 'rag' as const, code: 'unreachable', message: 'RAG failed' },
        };
        const result = classifyError(error, { wasResponseGenerated: true });

        // Partial failures show: "This response may be incomplete: [actual error]"
        expect(result.description).toBe('This response may be incomplete: RAG failed');
        expect(result.pattern).toBe('partial-failure' as ErrorPattern);
      });

      it('should generate description for rag_embed error', () => {
        const error = {
          error: {
            component: 'rag' as const,
            code: 'embedding_failure',
            message: 'Embedding failed',
          },
        };
        const result = classifyError(error);

        // Partial failures show: "This response may be incomplete: [actual error]"
        expect(result.description).toBe('This response may be incomplete: Embedding failed');
      });

      it('should generate description for rag_empty error', () => {
        const error = {
          error: { component: 'rag' as const, code: 'no_results', message: 'No results' },
        };
        const result = classifyError(error);

        // Partial failures show: "This response may be incomplete: [actual error]"
        expect(result.description).toBe('This response may be incomplete: No results');
      });

      it('should generate description for guardrail_flagged error', () => {
        const error = {
          error: {
            component: 'guardrails' as const,
            code: 'content_flagged',
            message: 'Content flagged',
          },
        };
        const result = classifyError(error);

        // Partial failures show: "This response may be incomplete: [actual error]"
        expect(result.description).toBe('This response may be incomplete: Content flagged');
      });

      it('should generate description for guardrail_down error', () => {
        const error = {
          error: {
            component: 'guardrails' as const,
            code: 'service_down',
            message: 'Guardrails down',
          },
        };
        const result = classifyError(error);

        // Partial failures show: "This response may be incomplete: [actual error]"
        expect(result.description).toBe('This response may be incomplete: Guardrails down');
      });

      it('should generate description for mcp_down error', () => {
        const error = {
          error: { component: 'mcp' as const, code: 'unreachable', message: 'MCP server down' },
        };
        const result = classifyError(error);

        // Partial failures show: "This response may be incomplete: [actual error]"
        expect(result.description).toBe('This response may be incomplete: MCP server down');
      });

      it('should generate description for mcp_auth error', () => {
        const error = {
          error: { component: 'mcp' as const, code: 'auth_failure', message: 'Auth failed' },
        };
        const result = classifyError(error);

        // Partial failures show: "This response may be incomplete: [actual error]"
        expect(result.description).toBe('This response may be incomplete: Auth failed');
      });

      it('should generate description for mcp_exec error', () => {
        const error = {
          error: {
            component: 'mcp' as const,
            code: 'execution_error',
            message: 'Execution failed',
          },
        };
        const result = classifyError(error);

        // Partial failures show: "This response may be incomplete: [actual error]"
        expect(result.description).toBe('This response may be incomplete: Execution failed');
      });

      it('should generate description for stream_lost error', () => {
        const error = { error: { code: 'stream_lost', message: 'Stream lost' } };
        const result = classifyError(error, { wasStreamStarted: true });

        // Streaming interruptions show actual error message
        expect(result.description).toBe('Stream lost');
      });

      it('should generate description for stream_timeout error', () => {
        const error = { error: { code: 'stream_timeout', message: 'Stream timeout' } };
        const result = classifyError(error, { wasStreamStarted: true });

        // Streaming interruptions show actual error message
        expect(result.description).toBe('Stream timeout');
      });

      it('should generate description for stream_context error', () => {
        const error = { error: { code: 'stream_context', message: 'Context exceeded' } };
        const result = classifyError(error, { wasStreamStarted: true });

        // Streaming interruptions show actual error message
        expect(result.description).toBe('Context exceeded');
      });

      it('should use error message as fallback for unknown errors', () => {
        const error = { error: { code: 'unknown', message: 'Custom error message' } };
        const result = classifyError(error);

        // Full failures show actual error message
        expect(result.description).toBe('Custom error message');
      });

      it('should use default message when error message is empty', () => {
        const error = { error: { code: 'unknown', message: '' } };
        const result = classifyError(error);

        // Unknown errors without status/component fall back to bff:unreachable
        expect(result.description).toBe(
          'Unable to connect to the playground backend. Check that the service is running.',
        );
      });
    });

    describe('error category constants integration', () => {
      it('should recognize ERROR_CATEGORIES constants', () => {
        // ERROR_CATEGORIES constants don't have specific microcopy templates,
        // and without status or component they fall back to bff:unreachable
        const categoryTests = [
          ERROR_CATEGORIES.INVALID_MODEL_CONFIG,
          ERROR_CATEGORIES.UNSUPPORTED_FEATURE,
          ERROR_CATEGORIES.INVALID_PARAMETER,
          ERROR_CATEGORIES.RAG_ERROR,
          ERROR_CATEGORIES.RAG_VECTOR_STORE_NOT_FOUND,
          ERROR_CATEGORIES.GUARDRAILS_ERROR,
          ERROR_CATEGORIES.GUARDRAILS_VIOLATION,
          ERROR_CATEGORIES.MCP_ERROR,
          ERROR_CATEGORIES.MCP_TOOL_NOT_FOUND,
          ERROR_CATEGORIES.MCP_AUTH_ERROR,
          ERROR_CATEGORIES.MODEL_INVOCATION_ERROR,
          ERROR_CATEGORIES.MODEL_TIMEOUT,
          ERROR_CATEGORIES.MODEL_OVERLOADED,
        ];

        categoryTests.forEach((code) => {
          const error = { error: { code, message: 'Error message' } };
          const result = classifyError(error);
          expect(result.title).toBe("Couldn't reach the server");
        });
      });

      it('should handle service_unavailable code', () => {
        const error = { status: 503, error: { message: 'Service down' } };
        const result = classifyError(error);

        expect(result.title).toBe("Couldn't reach the server");
        // Full failures show actual error message
        expect(result.description).toBe('Service down');
        expect(result.isRetriable).toBe(true);
      });

      it('should handle bad_gateway code', () => {
        const error = { status: 502, error: { message: 'Gateway error' } };
        const result = classifyError(error);

        expect(result.title).toBe("Couldn't reach the server");
        // Full failures show actual error message
        expect(result.description).toBe('Gateway error');
        expect(result.isRetriable).toBe(true);
      });

      it('should handle ERROR_CATEGORIES.INVALID_PARAMETER', () => {
        const error = {
          error: { code: ERROR_CATEGORIES.INVALID_PARAMETER, message: 'Invalid param' },
        };
        const result = classifyError(error);

        expect(result.title).toBe("Couldn't reach the server");
        expect(result.isRetriable).toBe(false);
      });

      it('should handle ERROR_CATEGORIES.RAG_VECTOR_STORE_NOT_FOUND', () => {
        const error = {
          error: {
            code: ERROR_CATEGORIES.RAG_VECTOR_STORE_NOT_FOUND,
            message: 'Vector store not found',
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe("Couldn't reach the server");
      });

      it('should handle ERROR_CATEGORIES.MCP_TOOL_NOT_FOUND', () => {
        const error = {
          error: { code: ERROR_CATEGORIES.MCP_TOOL_NOT_FOUND, message: 'Tool not found' },
        };
        const result = classifyError(error);

        expect(result.title).toBe("Couldn't reach the server");
      });

      it('should handle ERROR_CATEGORIES.MCP_AUTH_ERROR', () => {
        const error = {
          error: { code: ERROR_CATEGORIES.MCP_AUTH_ERROR, message: 'Auth failed' },
        };
        const result = classifyError(error);

        expect(result.title).toBe("Couldn't reach the server");
      });

      it('should handle ERROR_CATEGORIES.MODEL_INVOCATION_ERROR', () => {
        const error = {
          error: { code: ERROR_CATEGORIES.MODEL_INVOCATION_ERROR, message: 'Model error' },
        };
        const result = classifyError(error);

        expect(result.title).toBe("Couldn't reach the server");
      });

      it('should handle ERROR_CATEGORIES.MODEL_OVERLOADED', () => {
        const error = {
          error: { code: ERROR_CATEGORIES.MODEL_OVERLOADED, message: 'Model overloaded' },
        };
        const result = classifyError(error);

        expect(result.title).toBe("Couldn't reach the server");
        expect(result.isRetriable).toBe(false);
      });
    });

    describe('component-based classification', () => {
      it('should classify RAG errors by component field', () => {
        const error = {
          error: {
            component: 'rag' as const,
            message: 'Retrieval failed',
          },
        };
        const result = classifyError(error);

        // Without a code, errors fall back to generic template
        expect(result.title).toBe('Something went wrong');
      });

      it('should classify guardrails errors by component field', () => {
        const error = {
          error: {
            component: 'guardrails' as const,
            message: 'Guardrails failed',
          },
        };
        const result = classifyError(error);

        // Without a code, errors fall back to generic template
        expect(result.title).toBe('Something went wrong');
      });

      it('should classify MCP errors by component field', () => {
        const error = {
          error: {
            component: 'mcp' as const,
            message: 'MCP failed',
          },
        };
        const result = classifyError(error);

        // Without a code, errors fall back to generic template
        expect(result.title).toBe('Something went wrong');
      });

      it('should prefer code over component for RAG errors', () => {
        const error = {
          error: {
            code: 'no_results',
            component: 'rag' as const,
            message: 'No results',
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('No matching knowledge found');
      });

      it('should use component when code does not match', () => {
        const error = {
          error: {
            code: 'unknown_code',
            component: 'guardrails' as const,
            message: 'Unknown guardrails error',
          },
        };
        const result = classifyError(error);

        // Unknown code with component still falls back to generic template
        expect(result.title).toBe('Something went wrong');
      });
    });

    describe('component display name handling', () => {
      it('should use display name for known components', () => {
        const error = {
          error: {
            component: 'guardrails' as const,
            code: 'some_error',
            message: 'Guardrails error',
          },
        };
        const result = classifyError(error);

        expect(result.details.component).toBe('Guardrails');
      });

      it('should use component value for unknown components', () => {
        const error = {
          error: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            component: 'unknown_component' as any,
            code: 'some_error',
            message: 'Unknown component error',
          },
        };
        const result = classifyError(error);

        expect(result.details.component).toBe('unknown_component');
      });

      it('should use "Unknown" when component is not present', () => {
        const error = {
          error: {
            code: 'some_error',
            message: 'Error without component',
          },
        };
        const result = classifyError(error);

        expect(result.details.component).toBe('Unknown');
      });

      it('should format MCP component with tool name', () => {
        const error = {
          error: {
            component: 'mcp' as const,
            code: 'mcp_down',
            message: 'Tool failed',
            // eslint-disable-next-line camelcase
            tool_name: 'GitHub',
          },
        };
        const result = classifyError(error);

        expect(result.details.component).toBe('MCP: GitHub');
      });

      it('should use MCP display name when no tool name provided', () => {
        const error = {
          error: {
            component: 'mcp' as const,
            code: 'mcp_down',
            message: 'Tool failed',
          },
        };
        const result = classifyError(error);

        expect(result.details.component).toBe('MCP');
      });
    });

    describe('edge cases', () => {
      it('should handle null error', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = classifyError(null as any);

        expect(result.pattern).toBe('full-failure' as ErrorPattern);
        expect(result.details.rawMessage).toBe('An unexpected error occurred');
      });

      it('should handle undefined error', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = classifyError(undefined as any);

        expect(result.pattern).toBe('full-failure' as ErrorPattern);
        expect(result.details.rawMessage).toBe('An unexpected error occurred');
      });

      it('should handle empty error object', () => {
        const result = classifyError({});

        expect(result.pattern).toBe('full-failure' as ErrorPattern);
        expect(result.details.rawMessage).toBe('');
        expect(result.title).toBe("Couldn't reach the server");
      });

      it('should handle error with empty message', () => {
        const error = { error: { code: 'test', message: '' } };
        const result = classifyError(error);

        expect(result.details.rawMessage).toBe('');
      });
    });
  });
});
