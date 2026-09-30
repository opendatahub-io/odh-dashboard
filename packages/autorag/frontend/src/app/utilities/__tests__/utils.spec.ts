/* eslint-disable camelcase */
import { RuntimeStateKF } from '~/app/types/pipeline';
import {
  isRunCompleted,
  isRunInTerminalState,
  isRunTerminatable,
  isRunInProgress,
  isRunRetryable,
  isRunDeletable,
  parseErrorStatus,
  formatPatternName,
  generateReconfigureName,
  humanize,
  formatDisplayValue,
  normalizePipelineRunState,
  formatDurationBetween,
  isComponentTaskDirName,
  findComponentTaskPrefix,
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

describe('formatPatternName', () => {
  it('should insert non-breaking space before trailing digits', () => {
    expect(formatPatternName('Pattern7')).toBe('Pattern 7');
    expect(formatPatternName('Pattern12')).toBe('Pattern 12');
  });

  it('should handle names without trailing digits', () => {
    expect(formatPatternName('MyPattern')).toBe('MyPattern');
  });

  it('should handle names with space before digits', () => {
    expect(formatPatternName('Pattern 7')).toBe('Pattern 7');
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
    expect(humanize('Model_Id')).toBe('Model ID');
  });

  it('should use override for duration_seconds', () => {
    expect(humanize('duration_seconds')).toBe('Duration (seconds)');
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

describe('normalizePipelineRunState', () => {
  it('returns canonical runtime state for valid strings', () => {
    expect(normalizePipelineRunState('SUCCEEDED')).toBe(RuntimeStateKF.SUCCEEDED);
    expect(normalizePipelineRunState('running')).toBe(RuntimeStateKF.RUNNING);
    expect(normalizePipelineRunState(' Failed ')).toBe(RuntimeStateKF.FAILED);
  });

  it('returns undefined for non-string or unknown values', () => {
    expect(normalizePipelineRunState(undefined)).toBeUndefined();
    expect(normalizePipelineRunState(null)).toBeUndefined();
    expect(normalizePipelineRunState(123)).toBeUndefined();
    expect(normalizePipelineRunState('NOT_A_STATE')).toBeUndefined();
  });
});

describe('formatDurationBetween', () => {
  it('formats a duration between two ISO timestamps', () => {
    expect(formatDurationBetween('2024-01-01T00:00:00Z', '2024-01-01T00:01:30Z')).toBe('1 m 30 s');
  });

  it('returns undefined when either timestamp is missing or invalid', () => {
    expect(formatDurationBetween(undefined, '2024-01-01T00:01:00Z')).toBeUndefined();
    expect(formatDurationBetween('2024-01-01T00:00:00Z', undefined)).toBeUndefined();
    expect(formatDurationBetween('bad', '2024-01-01T00:01:00Z')).toBeUndefined();
  });
});

describe('isComponentTaskDirName', () => {
  it('matches exact task dirs and KFP branch suffixes', () => {
    expect(isComponentTaskDirName('rag-optimization', 'rag-optimization')).toBe(true);
    expect(isComponentTaskDirName('rag-optimization-2', 'rag-optimization')).toBe(true);
    expect(isComponentTaskDirName('rag-optimization-driver', 'rag-optimization')).toBe(false);
    expect(isComponentTaskDirName('other', 'rag-optimization')).toBe(false);
  });
});

describe('findComponentTaskPrefix', () => {
  it('returns the matching prefix without a trailing slash', () => {
    expect(
      findComponentTaskPrefix(
        [{ prefix: 'runs/1/rag-optimization/' }, { prefix: 'runs/1/other/' }],
        'rag-optimization',
      ),
    ).toBe('runs/1/rag-optimization');
  });

  it('returns undefined when no prefix matches', () => {
    expect(
      findComponentTaskPrefix([{ prefix: 'runs/1/other/' }], 'rag-optimization'),
    ).toBeUndefined();
  });
});
