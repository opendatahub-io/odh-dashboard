/* eslint-disable camelcase */
import type { GuardrailModelConfig, SafetyConfigResponse } from '~/app/types';

/**
 * Mock a single guardrail model configuration
 *
 * @param overrides - Partial properties to override defaults
 * @returns GuardrailModelConfig object
 */
export const mockGuardrailModelConfig = (
  overrides?: Partial<GuardrailModelConfig>,
): GuardrailModelConfig => ({
  model_name: 'llama-guard-3',
  input_shield_id: 'trustyai_input',
  output_shield_id: 'trustyai_output',
  ...overrides,
});

/**
 * Mock safety config response with guardrail models
 *
 * @param models - Array of guardrail model configs (optional)
 * @returns SafetyConfigResponse object
 */
export const mockSafetyConfig = (
  models?: Partial<GuardrailModelConfig>[],
): SafetyConfigResponse => {
  if (!models || models.length === 0) {
    return {
      guardrail_models: [mockGuardrailModelConfig()],
    };
  }

  return {
    guardrail_models: models.map((model) => mockGuardrailModelConfig(model)),
  };
};

/**
 * Mock an empty safety config response (no guardrails available)
 *
 * @returns SafetyConfigResponse with empty guardrail_models array
 */
export const mockEmptySafetyConfig = (): SafetyConfigResponse => ({
  guardrail_models: [],
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
