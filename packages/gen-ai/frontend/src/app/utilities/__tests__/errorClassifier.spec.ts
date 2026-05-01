import { ErrorPattern, ErrorSeverity } from '~/app/types';
import { ERROR_CATEGORIES } from '~/app/Chatbot/const';
import { classifyError } from '~/app/utilities/errorClassifier';

describe('errorClassifier', () => {
  describe('classifyError', () => {
    describe('error pattern determination', () => {
      it('should classify as full-failure when no response was generated', () => {
        const error = {
          error: {
            component: 'bff' as const,
            code: 'timeout',
            message: 'Request timed out',
            retriable: true,
          },
        };
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
            retriable: false,
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
        const error = {
          error: {
            component: 'bff' as const,
            code: 'stream_lost',
            message: 'Connection lost',
            retriable: true,
          },
        };
        const result = classifyError(error, {
          wasResponseGenerated: false,
          wasStreamStarted: true,
        });

        expect(result.pattern).toBe('streaming-interruption' as ErrorPattern);
        expect(result.variant).toBe('danger' as ErrorSeverity);
      });

      it('should classify as streaming_interruption when stream started with partial response', () => {
        const error = {
          error: {
            component: 'bff' as const,
            code: 'stream_lost',
            message: 'Connection lost',
            retriable: true,
          },
        };
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
          error: {
            component: 'bff' as const,
            code: 'custom_error',
            message: 'Custom error',
            retriable: true,
          },
        };
        const result = classifyError(error);

        expect(result.isRetriable).toBe(true);
      });

      it('should mark as non-retriable when error has explicit retriable flag set to false', () => {
        const error = {
          error: {
            component: 'bff' as const,
            code: 'timeout',
            message: 'Timeout',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.isRetriable).toBe(false);
      });

      it('should mark errors with BFF retriable=true as retriable', () => {
        const error = {
          error: {
            component: 'bff' as const,
            code: 'server_error',
            message: 'Server error',
            retriable: true,
          },
        };
        const result = classifyError(error);

        expect(result.isRetriable).toBe(true);
      });

      it('should mark errors with BFF retriable=false as non-retriable', () => {
        const error = {
          error: {
            component: 'bff' as const,
            code: 'stream_context',
            message: 'Context exceeded',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.isRetriable).toBe(false);
      });
    });

    describe('error title generation', () => {
      it('should generate title for max_tokens error', () => {
        const error = {
          error: {
            component: 'model' as const,
            code: 'max_tokens',
            message: 'Token limit exceeded',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Token limit exceeds model capacity');
      });

      it('should generate title for invalid_model_config error', () => {
        const error = {
          error: {
            component: 'llama_stack' as const,
            code: 'invalid_model_config',
            message: 'Invalid template',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Model configuration error');
      });

      it('should generate title for unsupported_feature error', () => {
        const error = {
          error: {
            component: 'llama_stack' as const,
            code: 'unsupported_feature',
            message: 'Tools not supported',
            retriable: false,
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
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe("This model doesn't support image input");
      });

      it('should generate title for model_timeout error', () => {
        const error = {
          error: {
            component: 'llama_stack' as const,
            code: 'model_timeout',
            message: 'Request timed out',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Model inference failed');
      });

      it('should generate title for generic_error', () => {
        const error = {
          error: {
            component: 'llama_stack' as const,
            code: 'generic_error',
            message: 'Internal error',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Model server error');
      });

      it('should generate title for rate_limit error', () => {
        const error = {
          status: 429,
          error: {
            component: 'bff' as const,
            code: 'rate_limit',
            message: 'Too many requests',
            retriable: true,
          },
        };
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
            error: {
              component: 'rag' as const,
              code,
              message: 'RAG error',
              retriable: false,
            },
          };
          expect(classifyError(error).title).toBe(expected);
        });
      });

      it('should generate title for guardrails errors', () => {
        const errors = [
          { code: 'guardrails_violation', expected: 'Content was flagged by guardrails' },
          { code: 'service_down', expected: 'Guardrail check was not applied' },
        ];

        errors.forEach(({ code, expected }) => {
          const error = {
            error: {
              component: 'guardrails' as const,
              code,
              message: 'Guardrails error',
              retriable: false,
            },
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
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('GitHub tool call failed');
      });

      it('should generate title for MCP errors without tool name', () => {
        const error = {
          error: {
            component: 'mcp' as const,
            code: 'unreachable',
            message: 'Tool failed',
            retriable: false,
          },
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
          const error = {
            error: { component: 'bff' as const, code, message: 'Stream error', retriable: false },
          };
          const result = classifyError(error, { wasStreamStarted: true });
          expect(result.title).toBe(expected);
        });
      });

      it('should use BFF-provided streaming error code for timeout', () => {
        const error = {
          error: {
            component: 'llama_stack' as const,
            code: 'stream_lost',
            message: '{"error": "stream terminated: connection reset by peer"}',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Streaming error — connection lost');
        expect(result.description).toBe('{"error": "stream terminated: connection reset by peer"}');
      });

      it('should use BFF-provided context_length code', () => {
        const error = {
          error: {
            component: 'model' as const,
            code: 'context_length',
            message: '{"error": "context length 8192 exceeded at token 8191"}',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Streaming error — context length exceeded');
        expect(result.description).toBe('{"error": "context length 8192 exceeded at token 8191"}');
      });

      it('should use generic title for unknown errors', () => {
        const error = {
          error: {
            component: 'bff' as const,
            code: 'unknown_code',
            message: 'Unknown error',
            retriable: true,
          },
        };
        const result = classifyError(error);

        // Unknown errors without status or component fall back to bff:unreachable
        expect(result.title).toBe('Something went wrong');
      });
    });

    describe('error description generation', () => {
      it('should generate description for max_tokens error with model name', () => {
        const error = {
          error: {
            component: 'model' as const,
            code: 'max_tokens',
            message: 'Token limit exceeded',
            retriable: false,
          },
        };
        const result = classifyError(error, { modelName: 'Llama 3.1 8B' });

        expect(result.description).toBe('Token limit exceeded');
      });

      it('should generate description for max_tokens error without model name', () => {
        const error = {
          error: {
            component: 'model' as const,
            code: 'max_tokens',
            message: 'Token limit exceeded',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.description).toBe('Token limit exceeded');
      });

      it('should generate description for invalid_model_config error', () => {
        const error = {
          error: {
            component: 'llama_stack' as const,
            code: 'invalid_model_config',
            message: 'Invalid template',
            retriable: false,
          },
        };
        const result = classifyError(error, { modelName: 'Llama 3.1 8B' });

        expect(result.description).toBe('Invalid template');
      });

      it('should generate description for unsupported_feature error', () => {
        const error = {
          error: {
            component: 'llama_stack' as const,
            code: 'unsupported_feature',
            message: 'Tools not supported',
            retriable: false,
          },
        };
        const result = classifyError(error, { modelName: 'Llama 3.1 8B' });

        expect(result.description).toBe('Tools not supported');
      });

      it('should generate description for no_images error', () => {
        const error = {
          error: {
            component: 'model' as const,
            code: 'no_images',
            message: 'Images not supported',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.description).toBe('Images not supported');
      });

      it('should generate description for model_timeout error', () => {
        const error = {
          error: {
            component: 'llama_stack' as const,
            code: 'model_timeout',
            message: 'Request timed out',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.description).toBe('Request timed out');
      });

      it('should generate description for generic_error', () => {
        const error = {
          error: {
            component: 'llama_stack' as const,
            code: 'generic_error',
            message: 'Server error',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.description).toBe('Server error');
      });

      it('should generate description for rate_limit error', () => {
        const error = {
          status: 429,
          error: {
            component: 'bff' as const,
            code: 'bff_error',
            message: 'Rate limited',
            retriable: true,
          },
        };
        const result = classifyError(error);

        expect(result.description).toBe('Rate limited');
      });

      it('should generate description for service_unavailable error', () => {
        const error = {
          status: 503,
          error: {
            component: 'bff' as const,
            code: 'bff_error',
            message: 'Service down',
            retriable: true,
          },
        };
        const result = classifyError(error);

        expect(result.description).toBe('Service down');
      });

      it('should generate description for RAG partial failures', () => {
        const error = {
          error: {
            component: 'rag' as const,
            code: 'unreachable',
            message: 'RAG failed',
            retriable: false,
          },
        };
        const result = classifyError(error, { wasResponseGenerated: true });

        expect(result.description).toBe('This response may be incomplete: RAG failed');
        expect(result.pattern).toBe('partial-failure' as ErrorPattern);
      });

      it('should generate description for rag_embed error', () => {
        const error = {
          error: {
            component: 'rag' as const,
            code: 'embedding_failure',
            message: 'Embedding failed',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.description).toBe('This response may be incomplete: Embedding failed');
      });

      it('should generate description for rag_empty error', () => {
        const error = {
          error: {
            component: 'rag' as const,
            code: 'no_results',
            message: 'No results',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.description).toBe('This response may be incomplete: No results');
      });

      it('should generate description for guardrails_violation error', () => {
        const error = {
          error: {
            component: 'guardrails' as const,
            code: 'guardrails_violation',
            message: 'Content flagged',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.description).toBe('This response may be incomplete: Content flagged');
      });

      it('should generate description for guardrail_down error', () => {
        const error = {
          error: {
            component: 'guardrails' as const,
            code: 'service_down',
            message: 'Guardrails down',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.description).toBe('This response may be incomplete: Guardrails down');
      });

      it('should generate description for mcp_down error', () => {
        const error = {
          error: {
            component: 'mcp' as const,
            code: 'unreachable',
            message: 'MCP server down',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.description).toBe('This response may be incomplete: MCP server down');
      });

      it('should generate description for mcp_auth_error', () => {
        const error = {
          error: {
            component: 'mcp' as const,
            code: 'mcp_auth_error',
            message: 'Auth failed',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.description).toBe('This response may be incomplete: Auth failed');
      });

      it('should generate description for mcp_exec error', () => {
        const error = {
          error: {
            component: 'mcp' as const,
            code: 'execution_error',
            message: 'Execution failed',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.description).toBe('This response may be incomplete: Execution failed');
      });

      it('should generate description for stream_lost error', () => {
        const error = {
          error: {
            component: 'bff' as const,
            code: 'stream_lost',
            message: 'Stream lost',
            retriable: true,
          },
        };
        const result = classifyError(error, { wasStreamStarted: true });

        expect(result.description).toBe('Stream lost');
      });

      it('should generate description for stream_timeout error', () => {
        const error = {
          error: {
            component: 'bff' as const,
            code: 'stream_timeout',
            message: 'Stream timeout',
            retriable: true,
          },
        };
        const result = classifyError(error, { wasStreamStarted: true });

        expect(result.description).toBe('Stream timeout');
      });

      it('should generate description for stream_context error', () => {
        const error = {
          error: {
            component: 'bff' as const,
            code: 'stream_context',
            message: 'Context exceeded',
            retriable: true,
          },
        };
        const result = classifyError(error, { wasStreamStarted: true });

        expect(result.description).toBe('Context exceeded');
      });

      it('should use error message as fallback for unknown errors', () => {
        const error = {
          error: {
            component: 'bff' as const,
            code: 'unknown',
            message: 'Custom error message',
            retriable: true,
          },
        };
        const result = classifyError(error);

        expect(result.description).toBe('Custom error message');
      });

      it('should use default message when error message is empty', () => {
        const error = {
          error: { component: 'bff' as const, code: 'unknown', message: '', retriable: true },
        };
        const result = classifyError(error);

        // Unknown errors fall back to the generic fallback message
        expect(result.description).toBe(
          'An unexpected error occurred. Check the details below for more information.',
        );
      });
    });

    describe('error category constants integration', () => {
      it('should recognize ERROR_CATEGORIES constants', () => {
        // ERROR_CATEGORIES constants map to their respective components
        const categoryTests = [
          { code: ERROR_CATEGORIES.INVALID_MODEL_CONFIG, component: 'llama_stack' as const },
          { code: ERROR_CATEGORIES.UNSUPPORTED_FEATURE, component: 'llama_stack' as const },
          { code: ERROR_CATEGORIES.INVALID_PARAMETER, component: 'llama_stack' as const },
          { code: ERROR_CATEGORIES.RAG_ERROR, component: 'rag' as const },
          { code: ERROR_CATEGORIES.RAG_VECTOR_STORE_NOT_FOUND, component: 'rag' as const },
          { code: ERROR_CATEGORIES.GUARDRAILS_ERROR, component: 'guardrails' as const },
          { code: ERROR_CATEGORIES.GUARDRAILS_VIOLATION, component: 'guardrails' as const },
          { code: ERROR_CATEGORIES.MCP_ERROR, component: 'mcp' as const },
          { code: ERROR_CATEGORIES.MCP_TOOL_NOT_FOUND, component: 'mcp' as const },
          { code: ERROR_CATEGORIES.MCP_AUTH_ERROR, component: 'mcp' as const },
          { code: ERROR_CATEGORIES.MODEL_INVOCATION_ERROR, component: 'model' as const },
          { code: ERROR_CATEGORIES.MODEL_TIMEOUT, component: 'llama_stack' as const },
          { code: ERROR_CATEGORIES.MODEL_OVERLOADED, component: 'llama_stack' as const },
        ];

        categoryTests.forEach(({ code, component }) => {
          const error = {
            error: { component, code, message: 'Error message', retriable: false },
          };
          const result = classifyError(error);
          // Each component will have its own fallback or default
          expect(result.title).toBeTruthy();
        });
      });

      it('should handle service_unavailable code', () => {
        const error = {
          status: 503,
          error: {
            component: 'bff' as const,
            code: 'service_unavailable',
            message: 'Service down',
            retriable: true,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Something went wrong');
        expect(result.description).toBe('Service down');
        expect(result.isRetriable).toBe(true);
      });

      it('should handle bad_gateway code', () => {
        const error = {
          status: 502,
          error: {
            component: 'bff' as const,
            code: 'bad_gateway',
            message: 'Gateway error',
            retriable: true,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Something went wrong');
        expect(result.description).toBe('Gateway error');
        expect(result.isRetriable).toBe(true);
      });

      it('should handle ERROR_CATEGORIES.INVALID_PARAMETER', () => {
        const error = {
          error: {
            component: 'llama_stack' as const,
            code: ERROR_CATEGORIES.INVALID_PARAMETER,
            message: 'Invalid param',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Invalid parameter');
        expect(result.isRetriable).toBe(false);
      });

      it('should handle ERROR_CATEGORIES.RAG_VECTOR_STORE_NOT_FOUND', () => {
        const error = {
          error: {
            component: 'rag' as const,
            code: ERROR_CATEGORIES.RAG_VECTOR_STORE_NOT_FOUND,
            message: 'Vector store not found',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('No matching knowledge found');
      });

      it('should handle ERROR_CATEGORIES.MCP_TOOL_NOT_FOUND', () => {
        const error = {
          error: {
            component: 'mcp' as const,
            code: ERROR_CATEGORIES.MCP_TOOL_NOT_FOUND,
            message: 'Tool not found',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('A tool tool call failed');
      });

      it('should handle ERROR_CATEGORIES.MCP_AUTH_ERROR', () => {
        const error = {
          error: {
            component: 'mcp' as const,
            code: ERROR_CATEGORIES.MCP_AUTH_ERROR,
            message: 'Auth failed',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('A tool tool call failed');
      });

      it('should handle ERROR_CATEGORIES.MODEL_INVOCATION_ERROR', () => {
        const error = {
          error: {
            component: 'model' as const,
            code: ERROR_CATEGORIES.MODEL_INVOCATION_ERROR,
            message: 'Model error',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Model server error');
      });

      it('should handle ERROR_CATEGORIES.MODEL_OVERLOADED', () => {
        const error = {
          error: {
            component: 'llama_stack' as const,
            code: ERROR_CATEGORIES.MODEL_OVERLOADED,
            message: 'Model overloaded',
            retriable: true,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Request was rate limited');
        expect(result.isRetriable).toBe(true);
      });
    });

    describe('component-based classification', () => {
      it('should classify RAG errors by component field', () => {
        const error = {
          error: {
            component: 'rag' as const,
            code: 'unknown',
            message: 'Retrieval failed',
            retriable: false,
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
            code: 'unknown',
            message: 'Guardrails failed',
            retriable: false,
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
            code: 'unknown',
            message: 'MCP failed',
            retriable: false,
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
            retriable: false,
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
            retriable: false,
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
            retriable: false,
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
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.details.component).toBe('unknown_component');
      });

      it('should use BFF display name for bff component', () => {
        const error = {
          error: {
            component: 'bff' as const,
            code: 'some_error',
            message: 'Error from BFF',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.details.component).toBe('BFF');
      });

      it('should format MCP component with tool name', () => {
        const error = {
          error: {
            component: 'mcp' as const,
            code: 'mcp_down',
            message: 'Tool failed',
            // eslint-disable-next-line camelcase
            tool_name: 'GitHub',
            retriable: false,
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
            retriable: false,
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
        const result = classifyError({
          error: { component: 'bff' as const, code: 'unknown', message: '', retriable: false },
        });

        expect(result.pattern).toBe('full-failure' as ErrorPattern);
        expect(result.details.rawMessage).toBe('');
        expect(result.title).toBe('Something went wrong');
      });

      it('should handle error with empty message', () => {
        const error = {
          error: { component: 'bff' as const, code: 'test', message: '', retriable: true },
        };
        const result = classifyError(error);

        expect(result.details.rawMessage).toBe('');
      });
    });
  });
});
