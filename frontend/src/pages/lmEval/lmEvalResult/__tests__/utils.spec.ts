/* eslint-disable camelcase */
import { parseEvaluationResults } from '#~/pages/lmEval/lmEvalResult/utils';
import { EvaluationResult } from '#~/pages/lmEval/lmEvalResult/LMEvalResultTable';

describe('parseEvaluationResults', () => {
  const stringifyResults = (data: unknown): string => JSON.stringify(data);

  const validResultsData = {
    results: {
      arc_challenge: {
        alias: 'arc_challenge',
        'acc,none': 0.25,
        'acc_stderr,none': 0.012653835621466646,
        'acc_norm,none': 0.2832764505119454,
        'acc_norm_stderr,none': 0.013167478735134576,
      },
      arc_easy: {
        alias: 'arc_easy',
        'acc,none': 0.24031986531986532,
        'acc_stderr,none': 0.008767553284156914,
        'acc_norm,none': 0.24537037037037038,
        'acc_norm_stderr,none': 0.008829704691126152,
      },
    },
  };

  const expectedValidResults: EvaluationResult[] = [
    { task: 'arc_challenge', metric: 'acc,none', value: 0.25, error: 0.012653835621466646 },
    {
      task: 'arc_challenge',
      metric: 'acc_norm,none',
      value: 0.2832764505119454,
      error: 0.013167478735134576,
    },
    {
      task: 'arc_easy',
      metric: 'acc,none',
      value: 0.24031986531986532,
      error: 0.008767553284156914,
    },
    {
      task: 'arc_easy',
      metric: 'acc_norm,none',
      value: 0.24537037037037038,
      error: 0.008829704691126152,
    },
  ];

  describe('valid input parsing', () => {
    it('should parse evaluation results with the new data structure', () => {
      const result = parseEvaluationResults(stringifyResults(validResultsData));
      expect(result).toEqual(expectedValidResults);
    });

    it('should use alias as task name when available', () => {
      const aliasData = {
        results: {
          task_key: {
            alias: 'Task Display Name',
            'metric,none': 0.85,
            'metric_stderr,none': 0.02,
          },
        },
      };
      const expected: EvaluationResult[] = [
        { task: 'Task Display Name', metric: 'metric,none', value: 0.85, error: 0.02 },
      ];

      const result = parseEvaluationResults(stringifyResults(aliasData));
      expect(result).toEqual(expected);
    });

    it('should fall back to task key when alias is not available', () => {
      const noAliasData = {
        results: {
          task_key: {
            'metric,none': 0.85,
            'metric_stderr,none': 0.02,
          },
        },
      };
      const expected: EvaluationResult[] = [
        { task: 'task_key', metric: 'metric,none', value: 0.85, error: 0.02 },
      ];

      const result = parseEvaluationResults(stringifyResults(noAliasData));
      expect(result).toEqual(expected);
    });

    it('should handle results with no error values', () => {
      const noErrorData = {
        results: {
          task1: {
            alias: 'Task 1',
            'metric1,none': 0.85,
            'metric2,none': 0.73,
          },
        },
      };
      const expected: EvaluationResult[] = [
        { task: 'Task 1', metric: 'metric1,none', value: 0.85, error: undefined },
        { task: 'Task 1', metric: 'metric2,none', value: 0.73, error: undefined },
      ];

      const result = parseEvaluationResults(stringifyResults(noErrorData));
      expect(result).toEqual(expected);
    });

    it('should handle mixed metrics with and without stderr', () => {
      const mixedData = {
        results: {
          task1: {
            alias: 'Task 1',
            'metric_with_error,none': 0.85,
            'metric_with_error_stderr,none': 0.02,
            'metric_without_error,none': 0.73,
          },
        },
      };
      const expected: EvaluationResult[] = [
        { task: 'Task 1', metric: 'metric_with_error,none', value: 0.85, error: 0.02 },
        { task: 'Task 1', metric: 'metric_without_error,none', value: 0.73, error: undefined },
      ];

      const result = parseEvaluationResults(stringifyResults(mixedData));
      expect(result).toEqual(expected);
    });
  });

  describe('invalid data handling', () => {
    it('should handle invalid value types by defaulting to 0', () => {
      const invalidValueData = {
        results: {
          task1: {
            alias: 'Task 1',
            'metric1,none': 'invalid',
            'metric2,none': null,
          },
        },
      };
      const expected: EvaluationResult[] = [
        { task: 'Task 1', metric: 'metric1,none', value: 0, error: undefined },
        { task: 'Task 1', metric: 'metric2,none', value: 0, error: undefined },
      ];

      const result = parseEvaluationResults(stringifyResults(invalidValueData));
      expect(result).toEqual(expected);
    });

    it('should skip invalid task structures', () => {
      const mixedValidData = {
        results: {
          validTask: {
            alias: 'Valid Task',
            'metric,none': 0.85,
          },
          invalidTask: 'not an object',
          anotherValidTask: {
            alias: 'Another Valid Task',
            'metric,none': 0.75,
          },
        },
      };
      const expected: EvaluationResult[] = [
        { task: 'Valid Task', metric: 'metric,none', value: 0.85, error: undefined },
        { task: 'Another Valid Task', metric: 'metric,none', value: 0.75, error: undefined },
      ];

      const result = parseEvaluationResults(stringifyResults(mixedValidData));
      expect(result).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('should return empty array for invalid JSON', () => {
      const result = parseEvaluationResults('invalid json string');
      expect(result).toEqual([]);
    });

    it('should return empty array for empty object', () => {
      const result = parseEvaluationResults(stringifyResults({}));
      expect(result).toEqual([]);
    });

    it('should return empty array for missing results property', () => {
      const noResultsData = {
        someOtherProperty: 'value',
      };
      const result = parseEvaluationResults(stringifyResults(noResultsData));
      expect(result).toEqual([]);
    });

    it('should return empty array for non-object results property', () => {
      const invalidResultsData = {
        results: 'not an object',
      };
      const result = parseEvaluationResults(stringifyResults(invalidResultsData));
      expect(result).toEqual([]);
    });

    it('should return empty array for non-object JSON types', () => {
      const testCases = [['array', 'instead', 'of', 'object'], null, 'string', 123, true];

      testCases.forEach((testCase) => {
        const result = parseEvaluationResults(stringifyResults(testCase));
        expect(result).toEqual([]);
      });
    });

    it('should handle empty results object', () => {
      const emptyResultsData = {
        results: {},
      };
      const result = parseEvaluationResults(stringifyResults(emptyResultsData));
      expect(result).toEqual([]);
    });
  });
});
