/* eslint-disable camelcase */

/**
 * Mock a ready NemoGuardrails CR status.
 * Used to make GuardrailsTabContent render the panel (not the empty/loading state).
 */
export const mockNemoGuardrailsStatus = (
  name = 'default-guardrails',
  phase = 'Ready',
): Record<string, unknown> => ({
  name,
  phase,
  conditions: [
    {
      type: 'Ready',
      status: 'True',
      reason: 'AsExpected',
      message: 'NemoGuardrails is ready',
      lastTransitionTime: new Date().toISOString(),
    },
  ],
});

/**
 * Mock a guardrail violation response for input
 *
 * @param responseId - Optional response ID (default: 'resp_guardrail_123')
 * @param model - Optional model name (default: 'llama-3.2-1b')
 * @returns Mocked chat response with input violation
 */
export const mockInputGuardrailViolation = (
  responseId = 'resp_guardrail_123',
  model = 'llama-3.2-1b',
): Record<string, unknown> => ({
  id: responseId,
  model,
  status: 'completed',
  created_at: Date.now(),
  output: [
    {
      id: 'msg_guardrail',
      type: 'message',
      role: 'assistant',
      status: 'completed',
      content: [
        {
          type: 'refusal',
          refusal:
            'I cannot process that request as it conflicts with my active safety guidelines. Please review your input for prompt manipulation, harmful content, or sensitive data (PII).',
        },
      ],
    },
  ],
});

/**
 * Mock a guardrail violation response for output
 *
 * @param responseId - Optional response ID (default: 'resp_guardrail_456')
 * @param model - Optional model name (default: 'llama-3.2-1b')
 * @returns Mocked chat response with output violation
 */
export const mockOutputGuardrailViolation = (
  responseId = 'resp_guardrail_456',
  model = 'llama-3.2-1b',
): Record<string, unknown> => ({
  id: responseId,
  model,
  status: 'completed',
  created_at: Date.now(),
  output: [
    {
      id: 'msg_guardrail_output',
      type: 'message',
      role: 'assistant',
      status: 'completed',
      content: [
        {
          type: 'refusal',
          refusal:
            'The response to your request was intercepted by safety guardrails. The output was found to contain potential harmful content or sensitive data (PII).',
        },
      ],
    },
  ],
});
