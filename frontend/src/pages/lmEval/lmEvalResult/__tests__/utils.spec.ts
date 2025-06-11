import { parseEvaluationResults } from '#~/pages/lmEval/lmEvalResult/utils';
import { EvaluationResult } from '#~/pages/lmEval/lmEvalResult/LMEvalResultTable';

describe('parseEvaluationResults', () => {
  const stringifyResults = (data: unknown): string => JSON.stringify(data);
  const validResultsData = {
    task1: {
      metric1: { value: 0.85, stderr: 0.02 },
      metric2: { value: 0.73 },
    },
    task2: {
      metric1: { value: 0.91, stderr: 0.01 },
    },
  };
  const expectedValidResults: EvaluationResult[] = [
    { task: 'task1', metric: 'metric1', value: 0.85, error: 0.02 },
    { task: 'task1', metric: 'metric2', value: 0.73, error: undefined },
    { task: 'task2', metric: 'metric1', value: 0.91, error: 0.01 },
  ];

  describe('valid input parsing', () => {
    it('should parse evaluation results with value field', () => {
      const result = parseEvaluationResults(stringifyResults(validResultsData));
      expect(result).toEqual(expectedValidResults);
    });

    it('should parse evaluation results with score field', () => {
      const scoreData = {
        task1: {
          accuracy: { score: 0.95, error: 0.005 },
        },
      };
      const expected: EvaluationResult[] = [
        { task: 'task1', metric: 'accuracy', value: 0.95, error: 0.005 },
      ];

      const result = parseEvaluationResults(stringifyResults(scoreData));
      expect(result).toEqual(expected);
    });

    it('should handle results with no error values', () => {
      const noErrorData = {
        task1: {
          metric1: { value: 0.85 },
          metric2: { score: 0.73 },
        },
      };
      const expected: EvaluationResult[] = [
        { task: 'task1', metric: 'metric1', value: 0.85, error: undefined },
        { task: 'task1', metric: 'metric2', value: 0.73, error: undefined },
      ];

      const result = parseEvaluationResults(stringifyResults(noErrorData));
      expect(result).toEqual(expected);
    });

    it('should convert string error values to numbers and prioritize stderr', () => {
      const stringErrorData = {
        task1: {
          metric1: {
            value: 0.85,
            stderr: '0.02',
            error: '0.03',
          },
        },
      };

      const result = parseEvaluationResults(stringifyResults(stringErrorData));
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        task: 'task1',
        metric: 'metric1',
        value: 0.85,
        error: 0.02,
      });
    });
  });

  describe('invalid data handling', () => {
    it('should handle invalid value types by defaulting to 0', () => {
      const invalidValueData = {
        task1: {
          metric1: { value: 'invalid' },
          metric2: { score: null },
          metric3: {},
        },
      };
      const expected: EvaluationResult[] = [
        { task: 'task1', metric: 'metric1', value: 0, error: undefined },
        { task: 'task1', metric: 'metric2', value: 0, error: undefined },
        { task: 'task1', metric: 'metric3', value: 0, error: undefined },
      ];

      const result = parseEvaluationResults(stringifyResults(invalidValueData));
      expect(result).toEqual(expected);
    });

    it('should skip invalid task or metric structures', () => {
      const mixedValidData = {
        validTask: {
          validMetric: { value: 0.85 },
        },
        invalidTask: 'not an object',
        anotherValidTask: {
          validMetric: { score: 0.75 },
          invalidMetric: 'not an object',
        },
      };
      const expected: EvaluationResult[] = [
        { task: 'validTask', metric: 'validMetric', value: 0.85, error: undefined },
        { task: 'anotherValidTask', metric: 'validMetric', value: 0.75, error: undefined },
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

    it('should return empty array for non-object JSON types', () => {
      const testCases = [['array', 'instead', 'of', 'object'], null, 'string', 123, true];

      testCases.forEach((testCase) => {
        const result = parseEvaluationResults(stringifyResults(testCase));
        expect(result).toEqual([]);
      });
    });
  });
});
