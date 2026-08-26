import { useQueries, useQuery, UseQueryResult } from '@tanstack/react-query';
import * as z from 'zod';
import {
  useS3FileFetchers,
  usePipelineRunQuery as useCorePipelineRunQuery,
} from '@odh-dashboard/autox-core/ui/hooks';

export { useS3FileFetchers, useS3ListFilesQuery } from '@odh-dashboard/autox-core/ui/hooks';
import type {
  BackTestingData,
  BackTestingForecastPoint,
  BackTestingPerWindowMetric,
  BackTestingSeriesPerformer,
  BackTestingWindowEntry,
  ConfusionMatrixData,
  CurvesData,
  FeatureImportanceData,
} from '~/app/types';
import { ConfigureSchema } from '~/app/schemas/configure.schema';

export function useExperimentsQuery(): UseQueryResult<never[], Error> {
  return useQuery({
    queryKey: ['experiments'],
    queryFn: async () => {
      const experiments: never[] = [];
      return experiments;
    },
  });
}

export function useExperimentQuery(
  experimentId?: string,
): UseQueryResult<{ display_name: string }, Error> {
  return useQuery({
    queryKey: ['experiments', experimentId],
    queryFn: async () => {
      // eslint-disable-next-line camelcase
      const experiment = { display_name: 'FAKE_EXPERIMENT_NAME' };
      return experiment;
    },
    enabled: !!experimentId,
  });
}

export type TaskType = 'binary' | 'multiclass' | 'regression';

export type ColumnSchema = {
  name: string;
  type: 'integer' | 'double' | 'timestamp' | 'bool' | 'string';
  task_type: TaskType;
  unique_count?: number;
  values?: (string | number)[];
};

/**
 * Zod schema to validate ColumnSchema array shape
 */
const ColumnSchemaArraySchema = z.array(
  z.object({
    name: z.string(),
    type: z.enum(['integer', 'double', 'timestamp', 'bool', 'string']),
    // eslint-disable-next-line camelcase -- matches API response field name
    task_type: z.enum(['binary', 'multiclass', 'regression']),
    // eslint-disable-next-line camelcase -- matches API response field name
    unique_count: z.number().int().nonnegative().optional(),
    values: z.array(z.union([z.string(), z.number()])).optional(),
  }),
);

export const usePipelineRunQuery = useCorePipelineRunQuery<ConfigureSchema>;

export function useS3GetFileQuery(
  namespace?: string,
  secretName?: string,
  bucket?: string,
  key?: string,
): UseQueryResult<Blob, Error> {
  const { fetchS3File } = useS3FileFetchers();
  return useQuery({
    queryKey: ['file', namespace, secretName, bucket, key],
    queryFn: async ({ signal }) => {
      if (!namespace || !key) {
        throw new Error('namespace and key are required');
      }
      return fetchS3File(namespace, key, { secretName, bucket, signal });
    },
    enabled: Boolean(namespace && key),
    retry: false,
  });
}

export function useS3GetFileSchemaQuery(
  namespace?: string,
  secretName?: string,
  bucket?: string,
  key?: string,
): UseQueryResult<ColumnSchema[], Error> {
  const { fetchS3Json } = useS3FileFetchers();
  return useQuery({
    queryKey: ['files', namespace, secretName, bucket, key],
    queryFn: async ({ signal }) => {
      if (!namespace || !secretName || !key) {
        return [];
      }

      const result = await fetchS3Json<{ data?: { columns?: unknown } }>(namespace, key, {
        signal,
        secretName,
        bucket,
        view: 'schema',
      });
      const columns = result.data?.columns;

      if (!Array.isArray(columns)) {
        throw new Error('Unexpected API response: column data is missing or invalid');
      }

      try {
        return ColumnSchemaArraySchema.parse(columns);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const issues = error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join(', ');
          throw new Error(`Invalid column schema response: ${issues}`);
        }
        throw error;
      }
    },
    enabled: Boolean(namespace && secretName && key),
    retry: false,
    placeholderData: [],
  });
}

/**
 * Zod schema to validate FeatureImportanceData shape
 */
/* eslint-disable camelcase */
const FeatureImportanceDataSchema: z.ZodType<FeatureImportanceData> = z.object({
  importance: z.record(z.string(), z.number()),
  stddev: z.record(z.string(), z.number()).optional(),
  p_value: z.record(z.string(), z.number()).optional(),
  n: z.record(z.string(), z.number()).optional(),
  p99_high: z.record(z.string(), z.number()).optional(),
  p99_low: z.record(z.string(), z.number()).optional(),
});
/* eslint-enable camelcase */

/**
 * Zod schema to validate ConfusionMatrixData shape
 * Records inherently allow optional keys, matching Partial<Record<...>> behavior
 */
const ConfusionMatrixDataSchema: z.ZodType<ConfusionMatrixData> = z.record(
  z.string(),
  z.record(z.string(), z.number()),
);

// Validates curves.json from S3. Binary has top-level roc_curve/precision_recall_curve
// with paired arrays (fpr/tpr, precision/recall). Multiclass nests those under per_class.
/* eslint-disable camelcase */
const ThresholdValueSchema = z.union([z.string(), z.number()]);

const RocCurveEntrySchema = z
  .object({
    auc: z.number(),
    fpr: z.array(z.number()),
    tpr: z.array(z.number()),
    thresholds: z.array(ThresholdValueSchema),
  })
  .refine((v) => v.fpr.length === v.tpr.length && v.fpr.length === v.thresholds.length, {
    message: 'fpr, tpr, and thresholds arrays must have equal length',
  });

const MulticlassRocCurveEntrySchema = RocCurveEntrySchema.and(z.object({ support: z.number() }));

const PrecisionRecallEntrySchema = z
  .object({
    average_precision: z.number(),
    precision: z.array(z.number()),
    recall: z.array(z.number()),
    thresholds: z.array(ThresholdValueSchema),
    baseline_precision: z.number(),
  })
  .refine((v) => v.precision.length === v.recall.length, {
    message: 'precision and recall arrays must have equal length',
  });

const BinaryCurvesDataSchema = z.object({
  task_type: z.literal('binary'),
  positive_class: z.union([z.string(), z.number()]),
  num_samples: z.number(),
  num_positive: z.number(),
  num_negative: z.number(),
  roc_curve: RocCurveEntrySchema,
  precision_recall_curve: PrecisionRecallEntrySchema,
});

const MulticlassCurvesDataSchema = z.object({
  task_type: z.literal('multiclass'),
  strategy: z.string(),
  num_classes: z.number(),
  classes: z.array(z.union([z.string(), z.number()])),
  num_samples: z.number(),
  roc_curve: z.object({
    auc_macro: z.number(),
    auc_weighted: z.number(),
    per_class: z.record(z.string(), MulticlassRocCurveEntrySchema),
  }),
  precision_recall_curve: z.object({
    average_precision_macro: z.number(),
    average_precision_weighted: z.number(),
    per_class: z.record(z.string(), PrecisionRecallEntrySchema),
  }),
});

const CurvesDataSchema = z.discriminatedUnion('task_type', [
  BinaryCurvesDataSchema,
  MulticlassCurvesDataSchema,
]);

const BackTestingForecastPointSchema: z.ZodType<BackTestingForecastPoint> = z.object({
  timestamp: z.string(),
  actual: z.number(),
  predicted: z.number(),
  lower_bound: z.number(),
  upper_bound: z.number(),
  lower_quantile: z.number().optional(),
  upper_quantile: z.number().optional(),
});

const BackTestingWindowEntrySchema: z.ZodType<BackTestingWindowEntry> = z.object({
  window_id: z.number().int(),
  metrics: z.record(z.string(), z.number()),
  forecast_data: z.array(BackTestingForecastPointSchema),
});

const BackTestingSeriesPerformerSchema: z.ZodType<BackTestingSeriesPerformer> = z.object({
  item_id: z.string(),
  avg_metrics: z.record(z.string(), z.number()),
  windows: z.array(BackTestingWindowEntrySchema),
});

const BackTestingPerWindowMetricSchema: z.ZodType<BackTestingPerWindowMetric> = z.object({
  window_id: z.number().int(),
  cutoff: z.number().int().optional(),
  test_start: z.string(),
  test_end: z.string(),
  metrics: z.record(z.string(), z.number()),
});

const BackTestingDataSchema: z.ZodType<BackTestingData> = z.object({
  schema_version: z.number().int().optional(),
  model_name: z.string(),
  prediction_length: z.number().int(),
  num_val_windows: z.number().int(),
  eval_metric: z.string(),
  target: z.string(),
  id_column: z.string(),
  timestamp_column: z.string(),
  per_window_metrics: z.array(BackTestingPerWindowMetricSchema),
  series_analysis: z.object({
    num_series_evaluated: z.number().int(),
    best_performer: BackTestingSeriesPerformerSchema,
    worst_performer: BackTestingSeriesPerformerSchema,
  }),
});
/* eslint-enable camelcase */

export { AutomlModelSchema, isRawTimeseriesModelV34, isRawModelV35 } from '~/app/hooks/modelSchema';
export type {
  AutomlRawTabularModelV34,
  AutomlRawTimeseriesModelV34,
  AutomlRawModelV35,
  AutomlRawModel,
} from '~/app/hooks/modelSchema';

export function useModelEvaluationArtifactsQuery(
  namespace?: string,
  modelDirectory?: string,
  isClassification?: boolean,
  isTimeseries?: boolean,
): {
  featureImportance?: FeatureImportanceData;
  confusionMatrix?: ConfusionMatrixData;
  curves?: CurvesData;
  backTesting?: BackTestingData;
  isLoading: boolean;
} {
  const { fetchS3Json } = useS3FileFetchers();
  const baseDir = modelDirectory?.endsWith('/') ? modelDirectory : `${modelDirectory}/`;
  return useQueries({
    queries: [
      {
        queryKey: ['featureImportance', namespace, modelDirectory],
        queryFn: ({ signal }) =>
          fetchS3Json<FeatureImportanceData>(
            namespace!,
            `${baseDir}metrics/feature_importance.json`,
            {
              signal,
              schema: FeatureImportanceDataSchema,
            },
          ),
        enabled: Boolean(namespace && modelDirectory && !isTimeseries),
        retry: false,
      },
      {
        queryKey: ['confusionMatrix', namespace, modelDirectory],
        queryFn: ({ signal }) =>
          fetchS3Json<ConfusionMatrixData>(namespace!, `${baseDir}metrics/confusion_matrix.json`, {
            signal,
            schema: ConfusionMatrixDataSchema,
          }),
        enabled: Boolean(namespace && modelDirectory && isClassification),
        retry: false,
      },
      {
        queryKey: ['curves', namespace, modelDirectory],
        queryFn: ({ signal }) =>
          fetchS3Json<CurvesData>(namespace!, `${baseDir}metrics/curves.json`, {
            signal,
            schema: CurvesDataSchema,
          }),
        enabled: Boolean(namespace && modelDirectory && isClassification),
        retry: false,
      },
      {
        queryKey: ['backTesting', namespace, modelDirectory],
        queryFn: ({ signal }) =>
          fetchS3Json<BackTestingData>(namespace!, `${baseDir}metrics/back_testing.json`, {
            signal,
            schema: BackTestingDataSchema,
          }),
        enabled: Boolean(namespace && modelDirectory && isTimeseries),
        retry: false,
      },
    ],
    combine: ([
      featureImportanceResult,
      confusionMatrixResult,
      curvesResult,
      backTestingResult,
    ]) => ({
      featureImportance: featureImportanceResult.data,
      confusionMatrix: confusionMatrixResult.data,
      curves: curvesResult.data,
      backTesting: backTestingResult.data,
      isLoading: [
        featureImportanceResult,
        confusionMatrixResult,
        curvesResult,
        backTestingResult,
      ].some((r) => r.isLoading),
    }),
  });
}
