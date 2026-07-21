import { ErrorPattern, ErrorVariant } from '~/app/types';
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
        expect(result.variant).toBe('danger' as ErrorVariant);
      });

      it('should classify as partial-failure when response was generated with guardrails component', () => {
        const error = {
          error: {
            component: 'guardrails' as const,
            code: 'guardrail_output_violation',
            message: 'Output flagged',
            retriable: false,
          },
        };
        const result = classifyError(error, {
          wasResponseGenerated: true,
          wasStreamStarted: false,
        });

        expect(result.pattern).toBe('partial-failure' as ErrorPattern);
        expect(result.variant).toBe('warning' as ErrorVariant);
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
        expect(result.variant).toBe('danger' as ErrorVariant);
        expect(result.isRetriable).toBe(false);
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

    describe('error title generation for real BFF codes', () => {
      it('should generate title for bff:invalid_request', () => {
        const error = {
          error: {
            component: 'bff' as const,
            code: 'invalid_request',
            message: 'Missing input',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Invalid request');
      });

      it('should generate title for bff:connection_failed', () => {
        const error = {
          error: {
            component: 'bff' as const,
            code: 'connection_failed',
            message: 'Connection refused',
            retriable: true,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe("Couldn't reach the server");
      });

      it('should generate title for bff:timeout', () => {
        const error = {
          error: {
            component: 'bff' as const,
            code: 'timeout',
            message: 'Request timed out',
            retriable: true,
          },
        };
        const result = classifyError(error);

        // 'timeout' matches STREAMING_ERROR_MAP before fullFailureTemplates
        expect(result.title).toBe('Streaming error — response timed out');
      });

      it('should generate title for bff:server_unavailable', () => {
        const error = {
          error: {
            component: 'bff' as const,
            code: 'server_unavailable',
            message: 'Server down',
            retriable: true,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Server unavailable');
      });

      it('should generate title for ogx:server_error', () => {
        const error = {
          error: {
            component: 'ogx' as const,
            code: 'server_error',
            message: 'Internal error',
            retriable: true,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Server error');
      });

      it('should generate title for ogx:rate_limit_exceeded', () => {
        const error = {
          error: {
            component: 'ogx' as const,
            code: 'rate_limit_exceeded',
            message: 'Too many requests',
            retriable: true,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Request was rate limited');
      });

      it('should generate title for guardrail_input_violation', () => {
        const error = {
          error: {
            component: 'guardrails' as const,
            code: 'guardrail_input_violation',
            message: 'Input blocked',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Content was flagged by guardrails');
      });

      it('should generate title for guardrail_output_violation', () => {
        const error = {
          error: {
            component: 'guardrails' as const,
            code: 'guardrail_output_violation',
            message: 'Output blocked',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Content was flagged by guardrails');
      });

      it('should generate title for guardrail_service_unavailable', () => {
        const error = {
          error: {
            component: 'guardrails' as const,
            code: 'guardrail_service_unavailable',
            message: 'Service down',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Guardrail check was not applied');
      });
    });

    describe('streaming error titles', () => {
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

      it('should use BFF-provided streaming error code for connection lost', () => {
        const error = {
          error: {
            component: 'ogx' as const,
            code: 'stream_lost',
            message: 'stream terminated: connection reset by peer',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Streaming error — connection lost');
        expect(result.description).toBe('The connection to the model was lost during generation.');
      });

      it('should use BFF-provided context_length code', () => {
        const error = {
          error: {
            component: 'ogx' as const,
            code: 'context_length',
            message: 'context length 8192 exceeded at token 8191',
            retriable: false,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Streaming error — context length exceeded');
        expect(result.description).toBe("The response exceeded the model's context length.");
      });
    });

    describe('error description generation', () => {
      it('should generate description for bff:connection_failed', () => {
        const error = {
          error: {
            component: 'bff' as const,
            code: 'connection_failed',
            message: 'Connection refused',
            retriable: true,
          },
        };
        const result = classifyError(error);

        expect(result.description).toBe(
          'Unable to connect to the OGX server. Check that the service is running.',
        );
      });

      it('should generate description for ogx:server_error', () => {
        const error = {
          error: {
            component: 'ogx' as const,
            code: 'server_error',
            message: 'Internal error',
            retriable: true,
          },
        };
        const result = classifyError(error);

        expect(result.description).toBe(
          'The server encountered an internal error. Please try again.',
        );
      });

      it('should generate description for rag:vector_store_timeout', () => {
        const error = {
          error: {
            component: 'rag' as const,
            code: 'vector_store_timeout',
            message: 'Vector store timed out after 30s',
            retriable: true,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Vector store timed out');
        expect(result.description).toBe(
          'The vector store did not respond in time. Contact your Platform Engineer to verify the connection.',
        );
        expect(result.pattern).toBe('partial-failure');
        expect(result.variant).toBe('warning');
      });

      it('should use generic fallback for unknown errors', () => {
        const error = {
          error: {
            component: 'bff' as const,
            code: 'unknown_code',
            message: 'Unknown error',
            retriable: true,
          },
        };
        const result = classifyError(error);

        expect(result.title).toBe('Something went wrong');
        expect(result.description).toBe(
          'An unexpected error occurred. Check the details below for more information.',
        );
      });
    });

    describe('component display name handling', () => {
      it('should use display name for known components', () => {
        const error = {
          error: {
            component: 'guardrails' as const,
            code: 'guardrail_service_unavailable',
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

      it('should use OGX display name for ogx component', () => {
        const error = {
          error: {
            component: 'ogx' as const,
            code: 'server_error',
            message: 'Server error',
            retriable: true,
          },
        };
        const result = classifyError(error);

        expect(result.details.component).toBe('OGX');
      });

      it('should format MCP component with tool name', () => {
        const error = {
          error: {
            component: 'mcp' as const,
            code: 'some_error',
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
            code: 'some_error',
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
