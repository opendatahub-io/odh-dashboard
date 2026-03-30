import { useQueries } from '@tanstack/react-query';
import React from 'react';
import { useS3ListFilesQuery, fetchS3File, fetchS3Files } from '~/app/hooks/queries';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import type { PipelineRun, S3ListObjectsResponse } from '~/app/types';
import { isTabularRun, getOptimizedMetricForTask } from '~/app/utilities/utils';

type UseAutomlResultsReturn = {
  models: Record<string, AutomlModel>;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
};

/**
 * Custom hook to fetch and process AutoML model results from S3.
 *
 * ## Testing Strategy
 *
 * **DO NOT unit test this hook directly.**
 *
 * This hook has 3 cascading async query stages that make it extremely difficult to unit test:
 * 1. S3 list query → model directories
 * 2. Artifact queries (one per directory) → model artifact paths
 * 3. Metrics queries (one per model, enabled AFTER artifacts complete) → model data
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
 * This hook handles the complex cascade of queries needed to fetch AutoML results:
 * 1. Fetches S3 files to get model directories
 * 2. Fetches model artifacts for each directory
 * 3. Fetches metrics.json for each model
 * 4. Transforms all data into the final AutomlModel format
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
    ? 'autogluon-models-full-refit'
    : 'timeseries-models-full-refit';
  const generatedModelsPath = shouldFetchS3Files
    ? `${rootDir}/${runId}/${modelGenerationDir}`
    : undefined;
  const {
    data: s3Files,
    isLoading: isS3Loading,
    isError: isS3Error,
  } = useS3ListFilesQuery(namespace, generatedModelsPath);

  // Step 2: Fetch model artifact directories from each common prefix
  const modelArtifactQueries = useQueries({
    queries: (s3Files?.common_prefixes ?? [])
      .filter((prefixObj) => typeof prefixObj.prefix === 'string' && prefixObj.prefix.length > 0)
      .map((prefixObj) => {
        const path = `${prefixObj.prefix}model_artifact`;
        return {
          queryKey: ['s3Files', namespace, path],
          queryFn: async () => {
            if (!namespace) {
              throw new Error('namespace is required');
            }
            return fetchS3Files(namespace, path);
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
            // Extract model name from prefix like "...model_artifact/WeightedEnsemble_L5_FULL/"
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
            };
          })
          .filter((item): item is { name: string; directory: string } => item !== null);
      }),
    [modelArtifactQueries.data],
  );

  // Step 4: Fetch metrics.json for each model
  const metricsQueries = useQueries({
    queries: modelDirectories.map(({ name, directory }) => {
      const metricsPath = `${directory}metrics/metrics.json`;
      return {
        queryKey: ['s3File', namespace, name, metricsPath],
        queryFn: async ({ signal }) => {
          if (!namespace || !metricsPath) {
            throw new Error('namespace and key are required');
          }

          const blob = await fetchS3File(namespace, metricsPath, { signal });
          const text = await blob.text();
          const data = JSON.parse(text);
          const metricsData = data?.data?.columns || data;

          // Validate that metricsData is a non-null object
          if (!metricsData || typeof metricsData !== 'object' || Array.isArray(metricsData)) {
            throw new Error(
              `Invalid metrics data structure in ${metricsPath}: expected object, got ${typeof metricsData}`,
            );
          }

          return {
            modelName: name,
            directory,
            data: metricsData,
          };
        },
        enabled: Boolean(
          namespace && modelDirectories.length > 0 && !modelArtifactQueries.isPending,
        ),
        retry: false,
      };
    }),
    combine: (results) => ({
      data: results.filter((r) => !r.isError).map((r) => r.data),
      isPending: results.some((r) => r.isPending),
      isError: results.length > 0 && results.every((r) => r.isError),
      failedModels: results
        .map((r, i) => (r.isError ? modelDirectories[i]?.name : null))
        .filter((name): name is string => Boolean(name)),
    }),
  });

  // Step 5: Transform data into final AutomlModel format
  const models = React.useMemo(() => {
    if (metricsQueries.isPending || modelDirectories.length === 0) {
      return {};
    }

    // Security: Create results with null prototype to prevent prototype pollution
    const results: Record<string, AutomlModel> = Object.create(null);
    const taskType = pipelineRun?.runtime_config?.parameters?.task_type ?? 'timeseries';

    metricsQueries.data.forEach((entry) => {
      // Skip entries that failed to load or are missing
      if (!entry || !entry.modelName || !entry.directory || !entry.data) {
        if (entry?.modelName) {
          // eslint-disable-next-line no-console
          console.warn(`Skipping model ${entry.modelName}: failed to load metrics`);
        }
        return;
      }

      const { modelName, directory, data: metricsData } = entry;

      // Security: Additional validation to reject dangerous keys
      const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
      if (dangerousKeys.includes(modelName)) {
        // eslint-disable-next-line no-console
        console.warn(`Skipping model with dangerous name: ${modelName}`);
        return;
      }

      // Defensive validation: skip models with invalid metrics data
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!metricsData || typeof metricsData !== 'object' || Array.isArray(metricsData)) {
        // eslint-disable-next-line no-console
        console.warn(`Skipping model ${modelName}: invalid metrics data structure`);
        return;
      }

      /* eslint-disable camelcase */
      const evalMetric = getOptimizedMetricForTask(taskType) ?? 'accuracy';
      results[modelName] = {
        display_name: modelName,
        model_config: {
          eval_metric: evalMetric,
        },
        location: {
          model_directory: directory,
          predictor: `${directory}predictor/predictor.pkl`,
          notebook: `${directory}notebooks/automl_predictor_notebook.ipynb`,
        },
        metrics: {
          test_data: metricsData,
        },
      };
      /* eslint-enable camelcase */
    });

    return results;
  }, [metricsQueries.data, metricsQueries.isPending, modelDirectories, pipelineRun]);

  // Determine overall error state
  const hasError = isS3Error || modelArtifactQueries.isError || metricsQueries.isError;

  // Determine the first error encountered
  const error = hasError
    ? (isS3Error ? new Error('Failed to list model directories') : undefined) ||
      (modelArtifactQueries.isError ? new Error('Failed to list model artifacts') : undefined) ||
      (metricsQueries.isError ? new Error('Failed to fetch model metrics') : undefined)
    : undefined;

  return {
    models,
    isLoading: isS3Loading || modelArtifactQueries.isPending || metricsQueries.isPending,
    isError: hasError,
    error,
  };
}
