/* eslint-disable camelcase */
import type { PipelineRun } from '~/app/types';
import type { AutoragPattern } from '~/app/types/autoragPattern';
import { RuntimeStateKF } from '~/app/types/pipeline';
import {
  isRunCompleted,
  isRunInTerminalState,
  isRunTerminatable,
  isRunInProgress,
  isRunRetryable,
  isRunDeletable,
  parseErrorStatus,
  getOptimizedMetricForRAG,
  formatMetricValue,
  generateReconfigureName,
  humanize,
  formatDisplayValue,
  computePatternRankMap,
} from '~/app/utilities/utils';

describe('isRunCompleted', () => {
  it('should return true for SUCCEEDED', () => {
    expect(isRunCompleted('SUCCEEDED')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isRunCompleted('succeeded')).toBe(true);
    expect(isRunCompleted('Succeeded')).toBe(true);
  });

  it('should return false for other terminal states', () => {
    expect(isRunCompleted('FAILED')).toBe(false);
    expect(isRunCompleted('CANCELED')).toBe(false);
    expect(isRunCompleted('SKIPPED')).toBe(false);
    expect(isRunCompleted('CACHED')).toBe(false);
  });

  it('should return false for active states', () => {
    expect(isRunCompleted('RUNNING')).toBe(false);
    expect(isRunCompleted('PENDING')).toBe(false);
  });

  it('should return false for undefined or empty state', () => {
    expect(isRunCompleted(undefined)).toBe(false);
    expect(isRunCompleted('')).toBe(false);
  });
});

describe('isRunInTerminalState', () => {
  it('should return true for all terminal states', () => {
    expect(isRunInTerminalState('SUCCEEDED')).toBe(true);
    expect(isRunInTerminalState('FAILED')).toBe(true);
    expect(isRunInTerminalState('CANCELED')).toBe(true);
    expect(isRunInTerminalState('SKIPPED')).toBe(true);
    expect(isRunInTerminalState('CACHED')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isRunInTerminalState('succeeded')).toBe(true);
    expect(isRunInTerminalState('Failed')).toBe(true);
    expect(isRunInTerminalState('canceled')).toBe(true);
  });

  it('should return false for active states', () => {
    expect(isRunInTerminalState('RUNNING')).toBe(false);
    expect(isRunInTerminalState('PENDING')).toBe(false);
    expect(isRunInTerminalState('PAUSED')).toBe(false);
    expect(isRunInTerminalState('CANCELING')).toBe(false);
  });

  it('should return false for undefined or empty state', () => {
    expect(isRunInTerminalState(undefined)).toBe(false);
    expect(isRunInTerminalState('')).toBe(false);
  });
});

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

describe('humanize', () => {
  it('should convert snake_case to Title Case', () => {
    expect(humanize('chunk_size')).toBe('Chunk Size');
    expect(humanize('context_template_text')).toBe('Context Template Text');
  });

  it('should capitalize a single word', () => {
    expect(humanize('method')).toBe('Method');
  });

  it('should return empty string for empty input', () => {
    expect(humanize('')).toBe('');
  });

  it('should handle strings with consecutive underscores', () => {
    expect(humanize('foo__bar')).toBe('Foo  Bar');
  });

  it('should handle single character words', () => {
    expect(humanize('a_b_c')).toBe('A B C');
  });

  it('should handle already capitalized words', () => {
    expect(humanize('Model_Id')).toBe('Model Id');
  });
});

describe('formatDisplayValue', () => {
  it('should return em-dash for null', () => {
    expect(formatDisplayValue(null)).toBe('\u2014');
  });

  it('should return em-dash for undefined', () => {
    expect(formatDisplayValue(undefined)).toBe('\u2014');
  });

  it('should convert numbers to strings', () => {
    expect(formatDisplayValue(42)).toBe('42');
    expect(formatDisplayValue(0)).toBe('0');
    expect(formatDisplayValue(3.14)).toBe('3.14');
  });

  it('should convert booleans to strings', () => {
    expect(formatDisplayValue(true)).toBe('true');
    expect(formatDisplayValue(false)).toBe('false');
  });

  it('should return strings as-is', () => {
    expect(formatDisplayValue('hello')).toBe('hello');
    expect(formatDisplayValue('')).toBe('');
  });

  it('should JSON.stringify objects', () => {
    expect(formatDisplayValue({ key: 'value' })).toBe('{"key":"value"}');
  });

  it('should JSON.stringify arrays', () => {
    expect(formatDisplayValue([1, 2, 3])).toBe('[1,2,3]');
  });
});

/** Minimal pattern factory for rank map tests. */
const makeRankPattern = (name: string, final_score: number): AutoragPattern => ({
  name,
  iteration: 0,
  max_combinations: 1,
  duration_seconds: 0,
  final_score,
  settings: {
    vector_store: { datasource_type: '', collection_name: '' },
    chunking: { method: '', chunk_size: 0, chunk_overlap: 0 },
    embedding: {
      model_id: '',
      distance_metric: '',
      embedding_params: {
        embedding_dimension: 0,
        context_length: 0,
        timeout: null,
        model_type: null,
        provider_id: null,
        provider_resource_id: null,
      },
    },
    retrieval: { method: '', number_of_chunks: 0 },
    generation: {
      model_id: '',
      context_template_text: '',
      user_message_text: '',
      system_message_text: '',
    },
  },
  scores: {},
});

describe('computePatternRankMap', () => {
  it('should rank patterns by final_score descending', () => {
    const patterns = [
      makeRankPattern('low', 0.3),
      makeRankPattern('high', 0.9),
      makeRankPattern('mid', 0.6),
    ];
    expect(computePatternRankMap(patterns)).toEqual({
      high: 1,
      mid: 2,
      low: 3,
    });
  });

  it('should return empty map for empty array', () => {
    expect(computePatternRankMap([])).toEqual({});
  });

  it('should handle single pattern', () => {
    expect(computePatternRankMap([makeRankPattern('solo', 0.5)])).toEqual({ solo: 1 });
  });

  it('should assign sequential ranks for tied scores', () => {
    const patterns = [
      makeRankPattern('a', 0.7),
      makeRankPattern('b', 0.7),
      makeRankPattern('c', 0.7),
    ];
    const rankMap = computePatternRankMap(patterns);
    expect(Object.values(rankMap).toSorted()).toEqual([1, 2, 3]);
  });

  it('should not mutate the original array', () => {
    const patterns = [makeRankPattern('z', 0.1), makeRankPattern('a', 0.9)];
    const originalOrder = patterns.map((p) => p.name);
    computePatternRankMap(patterns);
    expect(patterns.map((p) => p.name)).toEqual(originalOrder);
  });

  it('should handle negative and zero scores', () => {
    const patterns = [
      makeRankPattern('neg', -0.2),
      makeRankPattern('zero', 0),
      makeRankPattern('pos', 0.3),
    ];
    expect(computePatternRankMap(patterns)).toEqual({
      pos: 1,
      zero: 2,
      neg: 3,
    });
  });
});
