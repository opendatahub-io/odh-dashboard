import { useQueries, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import {
  useS3ListFilesQuery,
  fetchS3Json,
  AutomlModelSchema,
  isRawTimeseriesModelV34,
} from '~/app/hooks/queries';
import { getFiles as getS3Files } from '~/app/api/s3.ts';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import type { PipelineRun, S3ListObjectsResponse } from '~/app/types';
import { isTabularRun } from '~/app/utilities/utils';

/* eslint-disable camelcase */
const METRIC_ALIASES: Record<string, string> = {
  MAE: 'mean_absolute_error',
  MSE: 'mean_squared_error',
  RMSE: 'root_mean_squared_error',
  RMSLE: 'root_mean_squared_logarithmic_error',
  MAPE: 'mean_absolute_percentage_error',
  SMAPE: 'symmetric_mean_absolute_percentage_error',
  MASE: 'mean_absolute_scaled_error',
  RMSSE: 'root_mean_squared_scaled_error',
  WAPE: 'weighted_absolute_percentage_error',
  WQL: 'weighted_quantile_loss',
  SQL: 'scaled_quantile_loss',
};
/* eslint-enable camelcase */

// Timeseries runs return acronym metric keys (e.g. "MAE") while tabular runs
// return snake_case keys (e.g. "mean_absolute_error"). normalizeMetricsToSnakeCase
// is used to normalize keys so downstream code only handles one form. See RHOAIENG-59989.
function normalizeMetricsToSnakeCase(testData: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(testData)) {
    const normalized = METRIC_ALIASES[key.toUpperCase()] ?? key;
    result[normalized] = value;
  }
  return result;
}

type UseAutomlResultsReturn = {
  models: Record<string, AutomlModel>;
  failedModels: string[];
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  refetch: () => void;
};

/**
 * Custom hook to fetch and process AutoML model results from S3.
 * Models are outputted into the following directory structure
 *      Tabular:     autogluon-tabular-training-pipeline/xxx/autogluon-models-training/yyy/models_artifact/WeightedEnsemble_L5_FULL
 *      Time series: autogluon-timeseries-training-pipeline/xxx/autogluon-timeseries-models-full-refit/yyy/model_artifact/TemporalFusionTransformer_FULL
 * where xxx is the kubeflow pipeline run_id and yyy is a nondeterministic ID.
 * The directory variables used to generate these paths in this file are as follows:
 *      ${rootDir}/xxx/${modelGenerationDir}/yyy/${modelArtifactsDirectory}/${modelName}
 *
 * ## Testing Strategy
 *
 * **DO NOT unit test this hook directly.**
 *
 * This hook has cascading async query stages that make it extremely difficult to unit test:
 * 1. S3 list query → model directories
 * 2. Artifact queries (one per directory) → model artifact paths
 * 3. Model JSON queries (one per model, enabled AFTER artifacts complete) → model data
 *
 * The cascading `useQueries` with conditional `enabled` flags creates complex timing dependencies
 * that are difficult to mock and lead to flaky tests.
 *
 * **Instead, test this hook through:**
 * - `AutomlResultsContext.spec.tsx` - Tests the context that orchestrates this hook
 * - `AutomlResultsPage.spec.tsx` - Tests the page-level integration
 * - Cypress tests - End-to-end testing with real async flows
 *
 * This provides better coverage of real-world usage and is more maintainable.
 *
 * This hook handles the cascade of queries needed to fetch AutoML results:
 * 1. Fetches S3 files to get model directories
 * 2. Fetches model artifacts for each directory
 * 3. Fetches model.json for each model
 * 4. Collects all models into a Record keyed by model name
 *
 * @param runId - The pipeline run ID
 * @param namespace - The Kubernetes namespace
 * @param pipelineRun - The pipeline run object (optional, for metadata)
 * @returns Object containing models, loading state, and error state
 */
export function useAutomlResults(
  runId?: string,
  namespace?: string,
  pipelineRun?: PipelineRun,
): UseAutomlResultsReturn {
  // Step 1: Fetch S3 files when pipeline run is in SUCCEEDED state AND runId exists
  const shouldFetchS3Files = pipelineRun?.state === 'SUCCEEDED' && Boolean(runId);
  const isTabular = isTabularRun(pipelineRun);
  const rootDir = isTabular
    ? `autogluon-tabular-training-pipeline`
    : 'autogluon-timeseries-training-pipeline';
  const modelGenerationDir = isTabular
    ? 'autogluon-models-training'
    : 'autogluon-timeseries-models-full-refit';
  const generatedModelsPath = shouldFetchS3Files
    ? `${rootDir}/${runId}/${modelGenerationDir}`
    : undefined;

  const {
    data: s3Files,
    isLoading: isS3Loading,
    isFetching: isS3Fetching,
    isError: isS3Error,
    refetch: refetchS3Files,
  } = useS3ListFilesQuery(namespace, generatedModelsPath);

  // Step 2: Fetch model artifact directories from each common prefix
  const modelArtifactsDirectory = isTabular ? 'models_artifact' : 'model_artifact';
  const modelArtifactQueries = useQueries({
    queries: (s3Files?.common_prefixes ?? [])
      .filter((prefixObj) => typeof prefixObj.prefix === 'string' && prefixObj.prefix.length > 0)
      .map((prefixObj) => {
        const path = `${prefixObj.prefix}${modelArtifactsDirectory}`;
        return {
          queryKey: ['automl', 's3Files', namespace, path],
          queryFn: async ({ signal }) => {
            if (!namespace) {
              throw new Error('namespace is required');
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
          enabled: Boolean(namespace && s3Files?.common_prefixes),
          retry: false,
        };
      }),
    combine: (results) => ({
      data: results
        .filter((r) => !r.isError)
        .map((r) => r.data)
        .filter((d): d is S3ListObjectsResponse => d !== undefined),
      isPending: results.some((r) => r.isPending),
      isError: results.length > 0 && results.every((r) => r.isError),
    }),
  });

  // Step 3: Extract all model paths from the artifact directories
  const modelDirectories = React.useMemo(
    () =>
      modelArtifactQueries.data.flatMap((artifactResult) => {
        const prefixes = artifactResult.common_prefixes;
        return prefixes
          .filter(
            (prefixObj) => typeof prefixObj.prefix === 'string' && prefixObj.prefix.length > 0,
          )
          .map((prefixObj) => {
            // Extract model name from prefix like ".../${modelArtifactsDirectory}/WeightedEnsemble_L5_FULL/"
            const { prefix } = prefixObj;
            const parts = prefix.split('/').filter(Boolean);
            if (parts.length === 0) {
              // eslint-disable-next-line no-console
              console.warn(`Skipping model with invalid prefix: ${prefix}`);
              return null;
            }
            const name = parts[parts.length - 1]; // Last segment is the model name

            // Security: Validate name to prevent prototype pollution
            const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
            if (dangerousKeys.includes(name)) {
              // eslint-disable-next-line no-console
              console.warn(`Skipping model with dangerous name: ${name} in directory ${prefix}`);
              return null;
            }

            return {
              name,
              directory: prefix,
              // Parent path up to models_artifact/ (excludes the model name).
              // Used as the base for resolving predictor and notebook paths,
              // which already include the model name as their first segment.
              artifactDirectory: `${parts.slice(0, -1).join('/')}/`,
            };
          })
          .filter(
            (item): item is { name: string; directory: string; artifactDirectory: string } =>
              item !== null,
          );
      }),
    [modelArtifactQueries.data],
  );

  // Step 4: Fetch model.json for each model directory
  const modelQueries = useQueries({
    queries: modelDirectories.map(({ name, directory, artifactDirectory }) => {
      const modelJsonPath = `${directory}model.json`;
      return {
        queryKey: ['automl', 's3File', namespace, name, modelJsonPath],
        queryFn: async ({ signal }) => {
          if (!namespace) {
            throw new Error('namespace is required');
          }

          const validated = await fetchS3Json(namespace, modelJsonPath, {
            signal,
            schema: AutomlModelSchema,
          });

          // Rewrite relative location paths to absolute S3 paths.
          // Timeseries (3.4) uses `notebooks` (plural, directory); all others use `notebook` (file).
          // V35 and timeseries have `location.metrics`; legacy tabular does not.
          const notebook = isRawTimeseriesModelV34(validated)
            ? `${artifactDirectory}${validated.location.notebooks}/automl_predictor_notebook.ipynb`
            : `${artifactDirectory}${validated.location.notebook}`;

          const locationMetrics =
            'metrics' in validated.location
              ? `${artifactDirectory}${validated.location.metrics}`
              : undefined;

          const model: AutomlModel = {
            name: validated.name,
            location: {
              // eslint-disable-next-line camelcase
              model_directory: directory,
              predictor: `${artifactDirectory}${validated.location.predictor}`,
              notebook,
              ...(locationMetrics != null && { metrics: locationMetrics }),
            },
            metrics: {
              // eslint-disable-next-line camelcase
              test_data: normalizeMetricsToSnakeCase(validated.metrics.test_data),
            },
          };

          return { name, model };
        },
        enabled: Boolean(
          namespace && modelDirectories.length > 0 && !modelArtifactQueries.isPending,
        ),
        retry: false,
      };
    }),
    combine: (results) => {
      // eslint-disable-next-line no-console
      results.forEach((r, i) => {
        if (r.isError) {
          // eslint-disable-next-line no-console
          console.error(
            `Model query failed for AutoML model "${modelDirectories[i]?.name}" (directory: "${modelDirectories[i]?.directory}")`,
            r.error,
          );
        }
      });
      if (results.length > 0 && results.every((r) => r.isError)) {
        // eslint-disable-next-line no-console
        console.error(
          'ALL AutoML model queries failed. Total:',
          results.length,
          'Errors:',
          results.map((r, i) => ({
            model: modelDirectories[i]?.name,
            directory: modelDirectories[i]?.directory,
            error: r.error,
          })),
        );
      }
      return {
        data: results.filter((r) => !r.isError).map((r) => r.data),
        isPending: results.some((r) => r.isPending),
        isError: results.length > 0 && results.every((r) => r.isError),
        failedModels: results
          .map((r, i) => (r.isError ? modelDirectories[i]?.name : null))
          .filter((name): name is string => Boolean(name)),
      };
    },
  });

  // Step 5: Collect models into a Record keyed by model name
  const models = React.useMemo(() => {
    if (modelQueries.isPending || modelDirectories.length === 0) {
      return {};
    }

    // Security: Create results with null prototype to prevent prototype pollution
    const results: Record<string, AutomlModel> = Object.create(null);

    modelQueries.data.forEach((entry) => {
      // Skip entries that failed to load or are missing
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- entry can be undefined at runtime from failed queries
      if (!entry || !entry.name || !entry.model) {
        if (entry?.name) {
          // eslint-disable-next-line no-console
          console.warn(`Skipping model ${entry.name}: failed to load model.json`);
        }
        return;
      }

      const { name: modelName, model } = entry;

      // Security: Additional validation to reject dangerous keys
      const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
      if (dangerousKeys.includes(modelName)) {
        // eslint-disable-next-line no-console
        console.warn(`Skipping model with dangerous name: ${modelName}`);
        return;
      }

      results[modelName] = model;
    });

    return results;
  }, [modelQueries.data, modelQueries.isPending, modelDirectories]);

  // Determine overall error state
  const hasError = isS3Error || modelArtifactQueries.isError || modelQueries.isError;

  // Determine the first error encountered
  const error = hasError
    ? (isS3Error ? new Error('Failed to list model directories') : undefined) ||
      (modelArtifactQueries.isError ? new Error('Failed to list model artifacts') : undefined) ||
      (modelQueries.isError ? new Error('Failed to fetch model data') : undefined)
    : undefined;

  const queryClient = useQueryClient();
  const refetch = React.useCallback(() => {
    refetchS3Files();
    queryClient.invalidateQueries({ queryKey: ['automl', 's3Files', namespace] });
    queryClient.invalidateQueries({ queryKey: ['automl', 's3File', namespace] });
  }, [refetchS3Files, queryClient, namespace]);

  return {
    models,
    failedModels: modelQueries.failedModels,
    isLoading:
      isS3Loading ||
      (!s3Files && isS3Fetching) ||
      modelArtifactQueries.isPending ||
      modelQueries.isPending,
    isError: hasError,
    error,
    refetch,
  };
}
