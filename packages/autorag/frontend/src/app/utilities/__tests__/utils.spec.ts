/* eslint-disable camelcase */
import type { PipelineRun } from '~/app/types';
import { RuntimeStateKF } from '~/app/types/pipeline';
import {
  isRunTerminatable,
  isRunInProgress,
  isRunRetryable,
  isRunDeletable,
  parseErrorStatus,
  getOptimizedMetricForRAG,
  formatMetricValue,
  generateReconfigureName,
} from '~/app/utilities/utils';

describe('isRunTerminatable', () => {
  it('should return true for active states', () => {
    expect(isRunTerminatable('RUNNING')).toBe(true);
    expect(isRunTerminatable('PENDING')).toBe(true);
    expect(isRunTerminatable('PAUSED')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isRunTerminatable('running')).toBe(true);
    expect(isRunTerminatable('Running')).toBe(true);
    expect(isRunTerminatable('pending')).toBe(true);
  });

  it('should return false for terminal states', () => {
    expect(isRunTerminatable('SUCCEEDED')).toBe(false);
    expect(isRunTerminatable('FAILED')).toBe(false);
    expect(isRunTerminatable('CANCELED')).toBe(false);
    expect(isRunTerminatable('CANCELING')).toBe(false);
  });

  it('should return false for undefined or empty state', () => {
    expect(isRunTerminatable(undefined)).toBe(false);
    expect(isRunTerminatable('')).toBe(false);
  });
});

describe('isRunInProgress', () => {
  it('should return true for in-progress states including CANCELING', () => {
    expect(isRunInProgress('RUNNING')).toBe(true);
    expect(isRunInProgress('PENDING')).toBe(true);
    expect(isRunInProgress('CANCELING')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isRunInProgress('running')).toBe(true);
    expect(isRunInProgress('canceling')).toBe(true);
  });

  it('should return false for terminal and non-active states', () => {
    expect(isRunInProgress('SUCCEEDED')).toBe(false);
    expect(isRunInProgress('FAILED')).toBe(false);
    expect(isRunInProgress('CANCELED')).toBe(false);
    expect(isRunInProgress('PAUSED')).toBe(false);
  });

  it('should return false for undefined or empty state', () => {
    expect(isRunInProgress(undefined)).toBe(false);
    expect(isRunInProgress('')).toBe(false);
  });
});

describe('isRunRetryable', () => {
  it('should return true for retryable states', () => {
    expect(isRunRetryable('FAILED')).toBe(true);
    expect(isRunRetryable('CANCELED')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isRunRetryable('failed')).toBe(true);
    expect(isRunRetryable('Failed')).toBe(true);
    expect(isRunRetryable('canceled')).toBe(true);
  });

  it('should return false for non-retryable states', () => {
    expect(isRunRetryable('RUNNING')).toBe(false);
    expect(isRunRetryable('SUCCEEDED')).toBe(false);
    expect(isRunRetryable('PENDING')).toBe(false);
  });

  it('should return false for undefined or empty state', () => {
    expect(isRunRetryable(undefined)).toBe(false);
    expect(isRunRetryable('')).toBe(false);
  });
});

describe('isRunDeletable', () => {
  it('should return true for terminal states', () => {
    expect(isRunDeletable('SUCCEEDED')).toBe(true);
    expect(isRunDeletable('FAILED')).toBe(true);
    expect(isRunDeletable('CANCELED')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isRunDeletable('succeeded')).toBe(true);
    expect(isRunDeletable('Succeeded')).toBe(true);
    expect(isRunDeletable('failed')).toBe(true);
    expect(isRunDeletable('canceled')).toBe(true);
  });

  it('should return false for active states', () => {
    expect(isRunDeletable('RUNNING')).toBe(false);
    expect(isRunDeletable('PENDING')).toBe(false);
    expect(isRunDeletable('PAUSED')).toBe(false);
    expect(isRunDeletable('CANCELING')).toBe(false);
  });

  it('should return false for undefined or empty state', () => {
    expect(isRunDeletable(undefined)).toBe(false);
    expect(isRunDeletable('')).toBe(false);
  });
});

describe('parseErrorStatus', () => {
  it('should extract status code from "status code XXX" format', () => {
    const error = new Error('Request failed with status code 404');
    expect(parseErrorStatus(error)).toBe(404);
  });

  it('should extract status code from "status: XXX" format', () => {
    const error = new Error('Error: status: 403 - Forbidden');
    expect(parseErrorStatus(error)).toBe(403);
  });

  it('should extract status code from standalone number format', () => {
    const error = new Error('Failed to fetch: 503');
    expect(parseErrorStatus(error)).toBe(503);
  });

  it('should handle case-insensitive status code patterns', () => {
    const error = new Error('Request failed with Status Code 500');
    expect(parseErrorStatus(error)).toBe(500);
  });

  it('should return undefined for non-matching error messages', () => {
    const error = new Error('Network timeout occurred');
    expect(parseErrorStatus(error)).toBeUndefined();
  });

  it('should return undefined for invalid status codes', () => {
    const error = new Error('Invalid status code 999');
    expect(parseErrorStatus(error)).toBeUndefined();
  });

  it('should return undefined for status codes below 100', () => {
    const error = new Error('status code 99');
    expect(parseErrorStatus(error)).toBeUndefined();
  });

  it('should return undefined for status codes 600 or above', () => {
    const error = new Error('status code 600');
    expect(parseErrorStatus(error)).toBeUndefined();
  });

  it('should handle multiple numbers and extract valid status codes', () => {
    const error = new Error('Attempt 3 failed with status code 401');
    expect(parseErrorStatus(error)).toBe(401);
  });

  it('should extract first valid status code when multiple are present', () => {
    const error = new Error('status code 400 after status 200');
    expect(parseErrorStatus(error)).toBe(400);
  });
});

describe('getOptimizedMetricForRAG', () => {
  const createMockPipelineRun = (optimizationMetric?: string): PipelineRun => ({
    run_id: 'test-run-123',
    display_name: 'Test RAG Run',
    state: RuntimeStateKF.SUCCEEDED,
    created_at: '2025-01-17T00:00:00Z',
    runtime_config: optimizationMetric
      ? {
          parameters: {
            optimization_metric: optimizationMetric,
          },
        }
      : undefined,
  });

  it('should return optimization_metric from pipeline parameters', () => {
    const pipelineRun = createMockPipelineRun('answer_correctness');
    expect(getOptimizedMetricForRAG(pipelineRun)).toBe('answer_correctness');
  });

  it('should return faithfulness as default when optimization_metric is not provided', () => {
    const pipelineRun = createMockPipelineRun();
    expect(getOptimizedMetricForRAG(pipelineRun)).toBe('faithfulness');
  });

  it('should return faithfulness when pipelineRun is undefined', () => {
    expect(getOptimizedMetricForRAG(undefined)).toBe('faithfulness');
  });

  it('should return faithfulness when runtime_config is missing', () => {
    const pipelineRun: PipelineRun = {
      run_id: 'test-run-123',
      display_name: 'Test RAG Run',
      state: RuntimeStateKF.SUCCEEDED,
      created_at: '2025-01-17T00:00:00Z',
    };
    expect(getOptimizedMetricForRAG(pipelineRun)).toBe('faithfulness');
  });

  it('should return faithfulness when parameters is missing', () => {
    const pipelineRun: PipelineRun = {
      run_id: 'test-run-123',
      display_name: 'Test RAG Run',
      state: RuntimeStateKF.SUCCEEDED,
      created_at: '2025-01-17T00:00:00Z',
      runtime_config: {},
    };
    expect(getOptimizedMetricForRAG(pipelineRun)).toBe('faithfulness');
  });

  it('should return faithfulness when optimization_metric is not a string', () => {
    const pipelineRun: PipelineRun = {
      run_id: 'test-run-123',
      display_name: 'Test RAG Run',
      state: RuntimeStateKF.SUCCEEDED,
      created_at: '2025-01-17T00:00:00Z',
      runtime_config: {
        parameters: {
          optimization_metric: 123 as unknown as string,
        },
      },
    };
    expect(getOptimizedMetricForRAG(pipelineRun)).toBe('faithfulness');
  });

  it('should handle context_correctness metric', () => {
    const pipelineRun = createMockPipelineRun('context_correctness');
    expect(getOptimizedMetricForRAG(pipelineRun)).toBe('context_correctness');
  });

  it('should handle faithfulness metric explicitly', () => {
    const pipelineRun = createMockPipelineRun('faithfulness');
    expect(getOptimizedMetricForRAG(pipelineRun)).toBe('faithfulness');
  });

  it('should handle custom metric values', () => {
    const pipelineRun = createMockPipelineRun('custom_rag_metric');
    expect(getOptimizedMetricForRAG(pipelineRun)).toBe('custom_rag_metric');
  });
});

describe('formatMetricValue', () => {
  it('should format normal values with 3 decimal places', () => {
    expect(formatMetricValue(0.12345)).toBe('0.123');
    expect(formatMetricValue(0.8)).toBe('0.800');
    expect(formatMetricValue(1.5678)).toBe('1.568');
  });

  it('should use scientific notation for non-zero values that round to 0.000', () => {
    expect(formatMetricValue(0.0001)).toBe('1.000e-4');
    expect(formatMetricValue(0.00001234)).toBe('1.234e-5');
    expect(formatMetricValue(0.0000001)).toBe('1.000e-7');
  });

  it('should display zero as 0.000 (not scientific notation)', () => {
    expect(formatMetricValue(0)).toBe('0.000');
  });

  it('should use scientific notation for negative non-zero values that round to -0.000', () => {
    expect(formatMetricValue(-0.0001)).toBe('-1.000e-4');
    expect(formatMetricValue(-0.00001234)).toBe('-1.234e-5');
  });

  it('should format negative values normally if they do not round to -0.000', () => {
    expect(formatMetricValue(-0.123)).toBe('-0.123');
    expect(formatMetricValue(-1.5678)).toBe('-1.568');
  });

  it('should return string values as-is', () => {
    expect(formatMetricValue('N/A')).toBe('N/A');
    expect(formatMetricValue('invalid')).toBe('invalid');
  });
});

describe('generateReconfigureName', () => {
  it('should append " - 1" to a name without a suffix', () => {
    expect(generateReconfigureName('my-run')).toBe('my-run - 1');
  });

  it('should increment an existing numeric suffix', () => {
    expect(generateReconfigureName('my-run - 1')).toBe('my-run - 2');
  });

  it('should handle multiple increments', () => {
    expect(generateReconfigureName('my-run - 99')).toBe('my-run - 100');
  });

  it('should handle a name that ends with a number but not the suffix pattern', () => {
    expect(generateReconfigureName('experiment-42')).toBe('experiment-42 - 1');
  });

  it('should handle an empty string', () => {
    expect(generateReconfigureName('')).toBe(' - 1');
  });

  it('should handle a name with spaces and a suffix', () => {
    expect(generateReconfigureName('my experiment run - 5')).toBe('my experiment run - 6');
  });

  it('should not truncate a name that fits exactly at the 250-char limit', () => {
    // " - 1" is 4 chars, so a 246-char base + " - 1" = 250 total
    const base = 'a'.repeat(246);
    const result = generateReconfigureName(base);
    expect(result).toBe(`${base} - 1`);
    expect(Array.from(result).length).toBe(250);
  });

  it('should truncate and add ellipsis when the result would exceed 250 chars', () => {
    // 248-char base + " - 1" (4 chars) = 252, exceeds 250
    const base = 'a'.repeat(248);
    const result = generateReconfigureName(base);
    // max base = 250 - 4 (" - 1") - 3 ("...") = 243
    expect(result).toBe(`${'a'.repeat(243)}... - 1`);
    expect(Array.from(result).length).toBe(250);
  });

  it('should truncate when incrementing a suffix would exceed the limit', () => {
    // base(244) + " - 99" = 249 chars. Incrementing → base(244) + " - 100" = 250.
    const base = 'b'.repeat(244);
    const original = `${base} - 99`;
    expect(Array.from(original).length).toBe(249);
    const result = generateReconfigureName(original);
    // " - 100" is 6 chars, base(244) + " - 100" = 250 → fits
    expect(result).toBe(`${base} - 100`);
    expect(Array.from(result).length).toBe(250);
  });

  it('should truncate when incrementing from 2 to 3 digit suffix pushes past the limit', () => {
    // base(245) + " - 99" = 250 chars. Incrementing → base(245) + " - 100" = 251 → truncate
    const base = 'c'.repeat(245);
    const original = `${base} - 99`;
    expect(Array.from(original).length).toBe(250);
    const result = generateReconfigureName(original);
    // suffix " - 100" is 6 chars, max base = 250 - 6 - 3 = 241
    expect(result).toBe(`${'c'.repeat(241)}... - 100`);
    expect(Array.from(result).length).toBe(250);
  });

  it('should handle truncation with multi-byte unicode characters', () => {
    // Each emoji is 1 code point but multiple UTF-16 code units
    const base = '\u{1F600}'.repeat(248); // 248 code points of emoji
    const result = generateReconfigureName(base);
    // " - 1" is 4 chars, "..." is 3, max base = 250 - 4 - 3 = 243 code points
    expect(result).toBe(`${'\u{1F600}'.repeat(243)}... - 1`);
    expect(Array.from(result).length).toBe(250);
  });

  it('should correctly increment very large suffix numbers beyond Number.MAX_SAFE_INTEGER', () => {
    const bigNum = '9999999999999999999999999999999999';
    const expected = '10000000000000000000000000000000000';
    const result = generateReconfigureName(`run - ${bigNum}`);
    expect(result).toBe(`run - ${expected}`);
  });

  it('should truncate when a very large suffix number causes overflow', () => {
    const bigNum = '9999999999999999999999999999999999'; // 34 digits
    const expected = '10000000000000000000000000000000000'; // 35 digits
    const base = 'x'.repeat(246);
    const result = generateReconfigureName(`${base} - ${bigNum}`);
    // suffix " - 10000000000000000000000000000000000" is 38 chars
    // max base = 250 - 38 - 3 = 209
    expect(result).toBe(`${'x'.repeat(209)}... - ${expected}`);
    expect(Array.from(result).length).toBe(250);
  });

  it('should cap result at 250 chars even when suffix alone is extremely long', () => {
    // Pathological case: suffix so long that "..." + suffix > 250
    const hugeNum = '1'.repeat(260); // 260-digit number
    const result = generateReconfigureName(`run - ${hugeNum}`);
    expect(Array.from(result).length).toBeLessThanOrEqual(250);
  });
});
