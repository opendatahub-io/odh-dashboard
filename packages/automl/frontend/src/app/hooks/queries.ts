import { useQueries, useQuery, UseQueryResult } from '@tanstack/react-query';
import * as z from 'zod';
import { getPipelineRunFromBFF } from '~/app/api/pipelines';
import { getFiles as getS3Files } from '~/app/api/s3';
import type {
  ConfusionMatrixData,
  FeatureImportanceData,
  PipelineRun,
  S3ListObjectsResponse,
} from '~/app/types';
import { URL_PREFIX } from '~/app/utilities/const';

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

export type ColumnSchema = {
  name: string;
  type: 'integer' | 'double' | 'int64' | 'float64' | 'timestamp' | 'bool' | 'string';
  values?: (string | number)[];
};

/**
 * Zod schema to validate ColumnSchema array shape
 */
const ColumnSchemaArraySchema = z.array(
  z.object({
    name: z.string(),
    type: z.enum(['integer', 'double', 'int64', 'float64', 'timestamp', 'bool', 'string']),
    values: z.array(z.union([z.string(), z.number()])).optional(),
  }),
);

type FetchS3FileOptions = {
  secretName?: string;
  bucket?: string;
  signal?: AbortSignal;
};

/**
 * Fetches a file from S3 storage and returns it as a Blob.
 * This is a utility function that can be used in both hooks and query functions.
 */
export async function fetchS3File(
  namespace: string,
  key: string,
  options?: FetchS3FileOptions,
): Promise<Blob> {
  if (!key || !key.trim()) {
    throw new Error('File key must be a non-empty string');
  }

  const { secretName, bucket, signal } = options ?? {};
  const params = new URLSearchParams({
    namespace,
    ...(secretName && { secretName }),
    ...(bucket && { bucket }),
  });

  const response = await fetch(
    `${URL_PREFIX}/api/v1/s3/files/${encodeURIComponent(key)}?${params.toString()}`,
    { signal },
  );

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      if (errorData?.error?.message) {
        errorMessage = errorData.error.message;
      }
    } catch {
      // If parsing fails, fall back to statusText
    }
    throw new Error(`Failed to fetch file: ${errorMessage}`);
  }

  return response.blob();
}

export function useS3GetFileQuery(
  namespace?: string,
  secretName?: string,
  bucket?: string,
  key?: string,
): UseQueryResult<Blob, Error> {
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
  return useQuery({
    queryKey: ['files', namespace, secretName, bucket, key],
    queryFn: async ({ signal }) => {
      if (!namespace || !secretName || !key) {
        return [];
      }

      const params = new URLSearchParams({
        namespace,
        secretName,
        ...(bucket && { bucket }),
      });
      params.set('view', 'schema');

      const response = await fetch(
        `${URL_PREFIX}/api/v1/s3/files/${encodeURIComponent(key)}?${params.toString()}`,
        { signal },
      );

      if (!response.ok) {
        let errorMessage = response.statusText;
        try {
          const errorData = await response.json();
          if (errorData?.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch {
          // If parsing fails, fall back to statusText
        }
        throw new Error(`Failed to fetch file schema: ${errorMessage}`);
      }

      const result = await response.json();
      const columns = result?.data?.columns;

      if (!Array.isArray(columns)) {
        return [];
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

export function useS3ListFilesQuery(
  namespace?: string,
  path?: string,
): UseQueryResult<S3ListObjectsResponse, Error> {
  return useQuery({
    queryKey: ['s3Files', namespace, path],
    queryFn: async ({ signal }) => {
      if (!namespace || !path) {
        throw new Error('namespace and path are required');
      }
      return getS3Files(
        '',
        { signal },
        {
          namespace,
          path,
        },
      );
    },
    enabled: Boolean(namespace && path),
    retry: false,
  });
}

const TERMINAL_STATES = new Set(['SUCCEEDED', 'FAILED', 'CANCELED', 'SKIPPED', 'CACHED']);

export const isTerminalState = (state: string): boolean => TERMINAL_STATES.has(state);
const POLL_INTERVAL_MS = 10000;

export function usePipelineRunQuery(
  runId?: string,
  namespace?: string,
): UseQueryResult<PipelineRun, Error> {
  return useQuery({
    queryKey: ['pipelineRun', runId, namespace],
    queryFn: ({ signal }) => getPipelineRunFromBFF('', runId!, namespace!, { signal }),
    enabled: !!runId && !!namespace,
    placeholderData: (previousData) => previousData,
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      if (!state || isTerminalState(state)) {
        return false;
      }
      return POLL_INTERVAL_MS;
    },
  });
}

/**
 * Zod schema to validate FeatureImportanceData shape
 */
/* eslint-disable camelcase */
const FeatureImportanceDataSchema = z.object({
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
const ConfusionMatrixDataSchema = z.record(z.string(), z.record(z.string(), z.number()));

/**
 * Fetches and parses JSON content from S3.
 *
 * @param namespace - K8s namespace
 * @param key - S3 object key
 * @param options - Optional configuration
 * @param options.signal - Abort signal for cancellation
 * @param options.schema - Optional Zod schema for runtime validation
 * @returns Parsed JSON cast to type T (validated if schema provided)
 */
export async function fetchS3Json<T>(
  namespace: string,
  key: string,
  options?: {
    signal?: AbortSignal;
    schema?: z.ZodSchema<T>;
  },
): Promise<T> {
  const { signal, schema } = options ?? {};
  const blob = await fetchS3File(namespace, key, { signal });
  const text = await blob.text();

  try {
    const parsed = JSON.parse(text);

    // Validate if schema provided, otherwise trust the data
    if (schema) {
      return schema.parse(parsed);
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- no schema provided, caller accepts risk
    return parsed as T;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(`Invalid JSON structure from S3 file "${key}": ${issues}`);
    }
    throw new Error(
      `Failed to parse JSON from S3 file "${key}": ${error instanceof Error ? error.message : 'Invalid JSON'}`,
    );
  }
}

/**
 * Zod schemas to validate AutomlModel shape from model.json files.
 *
 * Three schemas cover the evolution of the model.json format:
 *   - 3.4 Tabular:     location.notebook (singular, file path), no location.metrics
 *   - 3.4 Timeseries:  location.notebooks (plural, directory), location.metrics, base_model
 *   - 3.5 Unified:     location.notebook (file path), location.metrics, no base_model
 *
 * model_directory is optional in the raw file since it gets rewritten after parsing.
 */
/* eslint-disable camelcase */

const AutomlModelBaseSchema = z.strictObject({
  name: z.string(),
  location: z.strictObject({
    model_directory: z.string().optional(),
    predictor: z.string(),
  }),
  metrics: z.strictObject({
    test_data: z.record(z.string(), z.number()),
  }),
});

// Legacy tabular schema (pre-3.5): notebook singular, no metrics in location
const AutomlTabularModelSchemaV34 = AutomlModelBaseSchema.extend({
  location: AutomlModelBaseSchema.shape.location.extend({
    notebook: z.string(),
  }),
}).strict();

// Legacy timeseries schema (pre-3.5): notebooks plural (directory), base_model, metrics in location
const AutomlTimeseriesModelSchemaV34 = AutomlModelBaseSchema.extend({
  base_model: z.string(),
  location: AutomlModelBaseSchema.shape.location.extend({
    notebooks: z.string(),
    metrics: z.string(),
  }),
}).strict();

// Unified schema (3.5+): notebook singular (file path), metrics in location, no base_model
const AutomlModelSchemaV35 = AutomlModelBaseSchema.extend({
  location: AutomlModelBaseSchema.shape.location.extend({
    notebook: z.string(),
    metrics: z.string(),
  }),
}).strict();

// Try 3.5 first, then fall back to legacy schemas for backwards compatibility.
// strict() on each schema is what disambiguates V35 from V34 tabular (both have `notebook`).
export const AutomlModelSchema = z.union([
  AutomlModelSchemaV35,
  AutomlTimeseriesModelSchemaV34,
  AutomlTabularModelSchemaV34,
]);

export type AutomlRawTabularModelV34 = z.infer<typeof AutomlTabularModelSchemaV34>;
export type AutomlRawTimeseriesModelV34 = z.infer<typeof AutomlTimeseriesModelSchemaV34>;
export type AutomlRawModelV35 = z.infer<typeof AutomlModelSchemaV35>;
export type AutomlRawModel =
  | AutomlRawModelV35
  | AutomlRawTabularModelV34
  | AutomlRawTimeseriesModelV34;

export const isRawTimeseriesModelV34 = (
  model: AutomlRawModel,
): model is AutomlRawTimeseriesModelV34 => 'notebooks' in model.location;

export const isRawModelV35 = (model: AutomlRawModel): model is AutomlRawModelV35 =>
  'notebook' in model.location && 'metrics' in model.location && !('base_model' in model);
/* eslint-enable camelcase */

export function useModelEvaluationArtifactsQuery(
  namespace?: string,
  modelDirectory?: string,
  isClassification?: boolean,
): {
  featureImportance?: FeatureImportanceData;
  confusionMatrix?: ConfusionMatrixData;
  isLoading: boolean;
} {
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
        enabled: Boolean(namespace && modelDirectory),
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
    ],
    combine: (results) => ({
      featureImportance: results[0].data,
      confusionMatrix: results[1].data,
      isLoading: results.some((r) => r.isLoading),
    }),
  });
}
