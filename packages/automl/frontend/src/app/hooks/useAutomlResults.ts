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
  // Step 1: Fetch S3 files when pipeline run is in SUCCEEDED state
  const shouldFetchS3Files = pipelineRun?.state === 'SUCCEEDED';
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
    queries: (s3Files?.common_prefixes ?? []).map((prefixObj) => {
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
      data: results.map((r) => r.data).filter((d): d is S3ListObjectsResponse => d !== undefined),
      isPending: results.some((r) => r.isPending),
      isError: results.some((r) => r.isError),
    }),
  });

  // Step 3: Extract all model paths from the artifact directories
  const modelDirectories = React.useMemo(
    () =>
      modelArtifactQueries.data.flatMap((artifactResult) => {
        const prefixes = artifactResult.common_prefixes;
        return prefixes.map((prefixObj) => {
          // Extract model name from prefix like "...model_artifact/WeightedEnsemble_L5_FULL/"
          const { prefix } = prefixObj;
          const parts = prefix.split('/').filter(Boolean);
          const name = parts[parts.length - 1]; // Last segment is the model name
          return {
            name,
            directory: prefix,
          };
        });
      }),
    [modelArtifactQueries.data],
  );

  // Step 4: Fetch metrics.json for each model
  const metricsQueries = useQueries({
    queries: modelDirectories.map(({ name, directory }) => {
      const metricsPath = `${directory}metrics/metrics.json`;
      return {
        queryKey: ['s3File', namespace, name, metricsPath],
        queryFn: async () => {
          if (!namespace || !metricsPath) {
            throw new Error('namespace and key are required');
          }

          const blob = await fetchS3File(namespace, metricsPath);
          const text = await blob.text();
          const data = JSON.parse(text);
          const metricsData = data?.data?.columns || data;

          // Validate that metricsData is a non-null object
          if (!metricsData || typeof metricsData !== 'object' || Array.isArray(metricsData)) {
            throw new Error(
              `Invalid metrics data structure in ${metricsPath}: expected object, got ${typeof metricsData}`,
            );
          }

          return metricsData;
        },
        enabled: Boolean(
          namespace && modelDirectories.length > 0 && !modelArtifactQueries.isPending,
        ),
        retry: false,
      };
    }),
    combine: (results) => ({
      data: results.map((r) => r.data).filter((d): d is Record<string, unknown> => d !== undefined),
      isPending: results.some((r) => r.isPending),
      isError: results.some((r) => r.isError),
    }),
  });

  // Step 5: Transform data into final AutomlModel format
  const models = React.useMemo(() => {
    if (
      metricsQueries.isPending ||
      modelDirectories.length === 0 ||
      metricsQueries.data.length !== modelDirectories.length
    ) {
      return {};
    }

    const results: Record<string, AutomlModel> = {};
    const taskType = pipelineRun?.runtime_config?.parameters?.task_type ?? 'timeseries';

    modelDirectories.forEach((model, index) => {
      const metricsData = metricsQueries.data[index];

      // Defensive validation: skip models with invalid metrics data
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!metricsData || typeof metricsData !== 'object' || Array.isArray(metricsData)) {
        // eslint-disable-next-line no-console
        console.warn(`Skipping model ${model.name}: invalid metrics data structure`);
        return;
      }

      /* eslint-disable camelcase */
      const evalMetric = getOptimizedMetricForTask(taskType) ?? 'accuracy';
      results[model.name] = {
        display_name: model.name,
        model_config: {
          eval_metric: evalMetric,
        },
        location: {
          model_directory: model.directory,
          predictor: `${model.directory}predictor/predictor.pkl`,
          notebook: `${model.directory}notebooks/automl_predictor_notebook.ipynb`,
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
