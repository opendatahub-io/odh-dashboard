import type { ColumnSchema } from '~/app/hooks/queries';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import {
  TASK_TYPE_BINARY,
  TASK_TYPE_LABELS,
  TASK_TYPE_MULTICLASS,
  TASK_TYPE_REGRESSION,
  TASK_TYPE_TIMESERIES,
  TASK_TYPES,
} from '~/app/utilities/const';
import { findTimestampColumn, getTargetColumnUniqueValueCount } from '~/app/utilities/columnUtils';

export type PredictionTypeValue = ConfigureSchema['task_type'];

export type PredictionTypeOption = {
  value: PredictionTypeValue;
  label: string;
  description: string;
};

const PREDICTION_TYPE_CONFIG = {
  [TASK_TYPE_BINARY]: {
    label: TASK_TYPE_LABELS[TASK_TYPE_BINARY],
    description: 'Classify data into exactly 2 categories (for example, yes/no or true/false).',
  },
  [TASK_TYPE_MULTICLASS]: {
    label: TASK_TYPE_LABELS[TASK_TYPE_MULTICLASS],
    description: 'Classify data into 3 or more categories with distinct boundaries.',
  },
  [TASK_TYPE_REGRESSION]: {
    label: TASK_TYPE_LABELS[TASK_TYPE_REGRESSION],
    description: 'Predict a continuous numeric output from input features.',
  },
  [TASK_TYPE_TIMESERIES]: {
    label: TASK_TYPE_LABELS[TASK_TYPE_TIMESERIES],
    description: 'Predict future values based on time-ordered historical data.',
  },
} satisfies Record<PredictionTypeValue, { label: string; description: string }>;

export const PREDICTION_TYPE_OPTIONS: PredictionTypeOption[] = TASK_TYPES.map((taskType) => ({
  value: taskType,
  ...PREDICTION_TYPE_CONFIG[taskType],
}));

type PredictionTypeAssessmentBase = {
  value: PredictionTypeValue;
};

export type RecommendedPredictionTypeAssessment = PredictionTypeAssessmentBase & {
  isRecommended: true;
  recommendationReason: string;
};

export type NotRecommendedPredictionTypeAssessment = PredictionTypeAssessmentBase & {
  isRecommended: false;
  notRecommendedReason: string;
};

export type PredictionTypeAssessment =
  | RecommendedPredictionTypeAssessment
  | NotRecommendedPredictionTypeAssessment;

const isNumericColumnType = (type: string): boolean => type === 'integer' || type === 'double';

/** Reasons a prediction type is not recommended for the selected target column. */
export const getPredictionTypeHardIncompatibility = (
  taskType: PredictionTypeValue,
  selectedColumn: ColumnSchema | undefined,
): string | undefined => {
  if (!selectedColumn) {
    return undefined;
  }

  const uniqueCount = getTargetColumnUniqueValueCount(selectedColumn);
  const isNumeric = isNumericColumnType(selectedColumn.type);

  switch (taskType) {
    case TASK_TYPE_TIMESERIES:
      return !isNumeric ? 'Time series forecasting requires a numerical target column.' : undefined;
    case TASK_TYPE_BINARY:
      if (uniqueCount == null) {
        return 'Binary classification requires a target column with at most 2 distinct values.';
      }
      if (uniqueCount > 2) {
        return `${uniqueCount} unique values detected. Binary classification requires exactly 2 categories.`;
      }
      return undefined;
    case TASK_TYPE_MULTICLASS:
      if (uniqueCount != null && uniqueCount < 3) {
        return `${uniqueCount} unique ${uniqueCount === 1 ? 'value' : 'values'} detected. Multiclass classification requires 3 or more categories.`;
      }
      return undefined;
    case TASK_TYPE_REGRESSION:
      return !isNumeric
        ? 'Target column contains non-numeric data. Regression requires numeric data.'
        : undefined;
    default:
      return undefined;
  }
};

/** Additional not-recommended reasons (e.g. missing timestamp for time series). */
export const getPredictionTypeSoftNotRecommendedReason = (
  taskType: PredictionTypeValue,
  selectedColumn: ColumnSchema | undefined,
  columns: { name: string; type: string }[],
): string | undefined => {
  if (!selectedColumn) {
    return undefined;
  }

  if (taskType === TASK_TYPE_TIMESERIES && !findTimestampColumn(columns)) {
    return 'No date or time column detected. Time series forecasting requires time-ordered data.';
  }

  return undefined;
};

export const getPredictionTypeRecommendationReason = (
  taskType: PredictionTypeValue,
  selectedColumn: ColumnSchema | undefined,
  columns: { name: string; type: string }[] = [],
): string => {
  const uniqueCount = getTargetColumnUniqueValueCount(selectedColumn);
  const countLabel = uniqueCount != null ? String(uniqueCount) : 'Multiple';
  const isNumeric = selectedColumn != null && isNumericColumnType(selectedColumn.type);

  switch (taskType) {
    case TASK_TYPE_BINARY:
      return uniqueCount != null
        ? `Exactly ${uniqueCount} unique values detected in ${selectedColumn?.name ?? 'the target column'}.`
        : 'Exactly 2 unique values detected in the target column.';
    case TASK_TYPE_MULTICLASS:
      return isNumeric
        ? `${countLabel} unique numeric values detected. This typically represents categories.`
        : `${countLabel} unique values detected. This typically represents categories.`;
    case TASK_TYPE_REGRESSION:
      return 'Target column is numeric with multiple distinct values.';
    case TASK_TYPE_TIMESERIES: {
      const timestampColumn = findTimestampColumn(columns);
      return timestampColumn
        ? `Column "${timestampColumn}" indicates a time-based series.`
        : 'A date or time column was detected, and indicates a time-based series.';
    }
    default:
      return '';
  }
};

export const assessPredictionTypes = (
  selectedColumn: ColumnSchema | undefined,
  columns: { name: string; type: string }[],
): PredictionTypeAssessment[] =>
  PREDICTION_TYPE_OPTIONS.map((option) => {
    const hardReason = getPredictionTypeHardIncompatibility(option.value, selectedColumn);
    const softReason = getPredictionTypeSoftNotRecommendedReason(
      option.value,
      selectedColumn,
      columns,
    );
    const notRecommendedReason = hardReason ?? softReason;

    if (notRecommendedReason == null) {
      return {
        value: option.value,
        isRecommended: true,
        recommendationReason: getPredictionTypeRecommendationReason(
          option.value,
          selectedColumn,
          columns,
        ),
      };
    }

    return {
      value: option.value,
      isRecommended: false,
      notRecommendedReason,
    };
  });

export const partitionPredictionTypeAssessments = (
  assessments: PredictionTypeAssessment[],
): {
  recommended: RecommendedPredictionTypeAssessment[];
  notRecommended: NotRecommendedPredictionTypeAssessment[];
} => ({
  recommended: assessments.filter(
    (assessment): assessment is RecommendedPredictionTypeAssessment => assessment.isRecommended,
  ),
  notRecommended: assessments.filter(
    (assessment): assessment is NotRecommendedPredictionTypeAssessment => !assessment.isRecommended,
  ),
});

/** Mirrors AutomlConfigure target-column selection: timeseries when a timestamp exists and target is numeric. */
export const getInferredPredictionType = (
  selectedColumn: ColumnSchema | undefined,
  columns: { name: string; type: string }[],
): PredictionTypeValue | undefined => {
  if (!selectedColumn) {
    return undefined;
  }
  if (findTimestampColumn(columns) && isNumericColumnType(selectedColumn.type)) {
    return TASK_TYPE_TIMESERIES;
  }
  return selectedColumn.task_type;
};

/** Puts the inferred default first among recommended tiles; stable order for the rest. */
export const orderRecommendedAssessments = (
  recommended: RecommendedPredictionTypeAssessment[],
  preferredTaskType?: PredictionTypeValue,
): RecommendedPredictionTypeAssessment[] => {
  if (!preferredTaskType) {
    return recommended;
  }
  const preferredIndex = recommended.findIndex(
    (assessment) => assessment.value === preferredTaskType,
  );
  if (preferredIndex <= 0) {
    return recommended;
  }
  return [
    recommended[preferredIndex],
    ...recommended.slice(0, preferredIndex),
    ...recommended.slice(preferredIndex + 1),
  ];
};
