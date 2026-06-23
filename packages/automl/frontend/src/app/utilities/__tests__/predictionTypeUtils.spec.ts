/* eslint-disable camelcase -- ColumnSchema.task_type matches BFF API response field name */
import {
  assessPredictionTypes,
  getInferredPredictionType,
  getPredictionTypeHardIncompatibility,
  getPredictionTypeRecommendationReason,
  getPredictionTypeSoftNotRecommendedReason,
  orderRecommendedAssessments,
  partitionPredictionTypeAssessments,
} from '~/app/utilities/predictionTypeUtils';

describe('predictionTypeUtils', () => {
  const columnsWithoutTimestamp = [
    { name: 'credit_score', type: 'integer' },
    { name: 'status', type: 'string' },
  ];

  const columnsWithTimestamp = [
    { name: 'created_at', type: 'timestamp' },
    { name: 'credit_score', type: 'integer' },
  ];

  describe('getPredictionTypeHardIncompatibility', () => {
    it('should flag binary when more than 2 unique values', () => {
      expect(
        getPredictionTypeHardIncompatibility('binary', {
          name: 'risk',
          type: 'string',
          task_type: 'multiclass',
          unique_count: 3,
          values: ['low', 'medium', 'high'],
        }),
      ).toContain('Binary classification requires exactly 2 categories');
    });

    it('should flag regression for string columns', () => {
      expect(
        getPredictionTypeHardIncompatibility('regression', {
          name: 'status',
          type: 'string',
          task_type: 'multiclass',
        }),
      ).toBe('Target column contains non-numeric data. Regression requires numeric data.');
    });

    it('should flag regression for boolean columns', () => {
      expect(
        getPredictionTypeHardIncompatibility('regression', {
          name: 'is_active',
          type: 'bool',
          task_type: 'binary',
          unique_count: 2,
          values: [0, 1],
        }),
      ).toBe('Target column contains non-numeric data. Regression requires numeric data.');
    });

    it('should flag timeseries for boolean columns', () => {
      expect(
        getPredictionTypeHardIncompatibility('timeseries', {
          name: 'is_active',
          type: 'bool',
          task_type: 'binary',
          unique_count: 2,
          values: [0, 1],
        }),
      ).toBe('Time series forecasting requires a numerical target column.');
    });

    it('should flag multiclass when fewer than 3 unique values', () => {
      expect(
        getPredictionTypeHardIncompatibility('multiclass', {
          name: 'status',
          type: 'string',
          task_type: 'binary',
          unique_count: 2,
          values: ['yes', 'no'],
        }),
      ).toBe('2 unique values detected. Multiclass classification requires 3 or more categories.');
    });

    it('should use unique_count when values array is omitted', () => {
      expect(
        getPredictionTypeHardIncompatibility('binary', {
          name: 'income',
          type: 'double',
          task_type: 'regression',
          unique_count: 50,
        }),
      ).toContain('50 unique values detected');
    });

    it('should fall back to values length when unique_count is omitted', () => {
      expect(
        getPredictionTypeHardIncompatibility('multiclass', {
          name: 'status',
          type: 'string',
          task_type: 'binary',
          values: ['yes', 'no'],
        }),
      ).toBe('2 unique values detected. Multiclass classification requires 3 or more categories.');
    });

    it('should return undefined when selected column is undefined', () => {
      expect(getPredictionTypeHardIncompatibility('binary', undefined)).toBeUndefined();
      expect(getPredictionTypeHardIncompatibility('multiclass', undefined)).toBeUndefined();
      expect(getPredictionTypeHardIncompatibility('regression', undefined)).toBeUndefined();
      expect(getPredictionTypeHardIncompatibility('timeseries', undefined)).toBeUndefined();
    });

    it('should flag binary when unique count is unknown', () => {
      expect(
        getPredictionTypeHardIncompatibility('binary', {
          name: 'status',
          type: 'string',
          task_type: 'binary',
        }),
      ).toBe('Binary classification requires a target column with at most 2 distinct values.');
    });

    it('should use singular wording for multiclass with 1 unique value', () => {
      expect(
        getPredictionTypeHardIncompatibility('multiclass', {
          name: 'status',
          type: 'string',
          task_type: 'binary',
          unique_count: 1,
        }),
      ).toBe('1 unique value detected. Multiclass classification requires 3 or more categories.');
    });
  });

  describe('getPredictionTypeSoftNotRecommendedReason', () => {
    it('should flag timeseries when no timestamp column exists', () => {
      expect(
        getPredictionTypeSoftNotRecommendedReason(
          'timeseries',
          { name: 'credit_score', type: 'integer', task_type: 'regression', unique_count: 3 },
          columnsWithoutTimestamp,
        ),
      ).toBe(
        'No date or time column detected. Time series forecasting requires time-ordered data.',
      );
    });

    it('should not flag timeseries when a timestamp column exists', () => {
      expect(
        getPredictionTypeSoftNotRecommendedReason(
          'timeseries',
          { name: 'credit_score', type: 'integer', task_type: 'regression', unique_count: 3 },
          columnsWithTimestamp,
        ),
      ).toBeUndefined();
    });

    it('should return undefined when selected column is undefined', () => {
      expect(
        getPredictionTypeSoftNotRecommendedReason('timeseries', undefined, columnsWithTimestamp),
      ).toBeUndefined();
    });
  });

  describe('getPredictionTypeRecommendationReason', () => {
    it('should use generic binary copy when unique count is unknown', () => {
      expect(getPredictionTypeRecommendationReason('binary', undefined)).toBe(
        'Exactly 2 unique values detected in the target column.',
      );
    });
  });

  describe('getInferredPredictionType', () => {
    it('should prefer timeseries when a timestamp column exists and target is numeric', () => {
      expect(
        getInferredPredictionType(
          { name: 'credit_score', type: 'integer', task_type: 'regression', unique_count: 3 },
          columnsWithTimestamp,
        ),
      ).toBe('timeseries');
    });

    it('should use column task_type when no timestamp column exists', () => {
      expect(
        getInferredPredictionType(
          { name: 'credit_score', type: 'integer', task_type: 'regression', unique_count: 3 },
          columnsWithoutTimestamp,
        ),
      ).toBe('regression');
    });

    it('should infer timeseries when a "ds" datestamp column exists', () => {
      expect(
        getInferredPredictionType(
          { name: 'y', type: 'double', task_type: 'regression', unique_count: 100 },
          [
            { name: 'ds', type: 'integer' },
            { name: 'y', type: 'double' },
          ],
        ),
      ).toBe('timeseries');
    });

    it('should not infer timeseries for a boolean target when a timestamp column exists', () => {
      expect(
        getInferredPredictionType(
          {
            name: 'is_active',
            type: 'bool',
            task_type: 'binary',
            unique_count: 2,
            values: [0, 1],
          },
          columnsWithTimestamp,
        ),
      ).toBe('binary');
    });

    it('should return undefined when selected column is undefined', () => {
      expect(getInferredPredictionType(undefined, columnsWithTimestamp)).toBeUndefined();
    });

    it('should fall back to column task_type for a boolean target when no timestamp exists', () => {
      expect(
        getInferredPredictionType(
          {
            name: 'is_active',
            type: 'bool',
            task_type: 'binary',
            unique_count: 2,
            values: [0, 1],
          },
          columnsWithoutTimestamp,
        ),
      ).toBe('binary');
    });
  });

  describe('orderRecommendedAssessments', () => {
    it('should move the inferred default to the front of recommended tiles', () => {
      const assessments = assessPredictionTypes(
        {
          name: 'credit_score',
          type: 'integer',
          task_type: 'regression',
          unique_count: 3,
        },
        columnsWithoutTimestamp,
      );
      const { recommended } = partitionPredictionTypeAssessments(assessments);

      expect(orderRecommendedAssessments(recommended, 'regression').map((a) => a.value)).toEqual([
        'regression',
        'multiclass',
      ]);
    });

    it('should return the original order when preferred type is undefined', () => {
      const recommended = [
        {
          value: 'multiclass' as const,
          isRecommended: true as const,
          recommendationReason: 'reason',
        },
        {
          value: 'regression' as const,
          isRecommended: true as const,
          recommendationReason: 'reason',
        },
      ];

      expect(orderRecommendedAssessments(recommended, undefined)).toBe(recommended);
    });

    it('should return the original order when preferred type is already first', () => {
      const recommended = [
        {
          value: 'regression' as const,
          isRecommended: true as const,
          recommendationReason: 'reason',
        },
        {
          value: 'multiclass' as const,
          isRecommended: true as const,
          recommendationReason: 'reason',
        },
      ];

      expect(orderRecommendedAssessments(recommended, 'regression')).toBe(recommended);
    });
  });

  describe('assessPredictionTypes', () => {
    it('should not recommend multiclass when target has fewer than 3 unique values', () => {
      const assessments = assessPredictionTypes(
        {
          name: 'approval_status',
          type: 'string',
          task_type: 'binary',
          unique_count: 2,
          values: ['approved', 'denied'],
        },
        columnsWithoutTimestamp,
      );
      const { recommended, notRecommended } = partitionPredictionTypeAssessments(assessments);

      expect(recommended.map((a) => a.value)).toEqual(['binary']);
      expect(notRecommended.find((a) => a.value === 'multiclass')?.notRecommendedReason).toBe(
        '2 unique values detected. Multiclass classification requires 3 or more categories.',
      );
    });

    it('should describe the detected timestamp column in the timeseries recommendation reason', () => {
      const assessments = assessPredictionTypes(
        { name: 'y', type: 'double', task_type: 'regression', unique_count: 100 },
        [
          { name: 'ds', type: 'integer' },
          { name: 'y', type: 'double' },
        ],
      );

      const timeseriesAssessment = assessments.find((a) => a.value === 'timeseries');
      expect(timeseriesAssessment?.isRecommended).toBe(true);
      if (timeseriesAssessment?.isRecommended) {
        expect(timeseriesAssessment.recommendationReason).toBe(
          'Column "ds" indicates a time-based series.',
        );
      }
    });

    it('should recommend multiclass and regression for numeric target with 3 unique values', () => {
      const assessments = assessPredictionTypes(
        {
          name: 'credit_score',
          type: 'integer',
          task_type: 'regression',
          unique_count: 3,
        },
        columnsWithoutTimestamp,
      );
      const { recommended, notRecommended } = partitionPredictionTypeAssessments(assessments);

      expect(recommended.map((a) => a.value)).toEqual(['multiclass', 'regression']);
      expect(notRecommended.map((a) => a.value)).toEqual(['binary', 'timeseries']);
      expect(notRecommended.find((a) => a.value === 'binary')?.notRecommendedReason).toContain(
        'Binary classification requires exactly 2 categories',
      );
      expect(notRecommended.find((a) => a.value === 'timeseries')?.notRecommendedReason).toBe(
        'No date or time column detected. Time series forecasting requires time-ordered data.',
      );
    });
  });
});
