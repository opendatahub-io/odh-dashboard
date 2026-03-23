import { useQueries } from '@tanstack/react-query';
import React from 'react';
import { useS3ListFilesQuery, fetchS3File, fetchS3Files } from '~/app/hooks/queries';
import type { AutoragPattern } from '~/app/context/AutoragResultsContext';
import type { PipelineRun, S3ListObjectsResponse, S3CommonPrefix } from '~/app/types';

type UseAutoragResultsReturn = {
  patterns: Record<string, AutoragPattern>;
  isLoading: boolean;
  isError: boolean;
};

/**
 * Custom hook to fetch and process AutoRAG pattern results from S3.
 *
 * This hook handles the complex cascade of queries needed to fetch AutoRAG results:
 * 1. Fetches S3 files to get pattern directories
 * 2. Fetches pattern artifacts for each directory
 * 3. Fetches metrics.json for each pattern
 * 4. Transforms all data into the final AutoragPattern format
 *
 * @param runId - The pipeline run ID
 * @param namespace - The Kubernetes namespace
 * @param pipelineRun - The pipeline run object (optional, for metadata)
 * @returns Object containing patterns, loading state, and error state
 */
export function useAutoragResults(
  runId?: string,
  namespace?: string,
  pipelineRun?: PipelineRun,
): UseAutoragResultsReturn {
  // Step 1: Fetch S3 files when pipeline run is in SUCCEEDED state
  const shouldFetchS3Files = pipelineRun?.state === 'SUCCEEDED';
  const rootDir = 'autorag-training-pipeline';
  const patternGenerationDir = 'autorag-patterns-full-refit';
  const generatedPatternsPath = shouldFetchS3Files
    ? `${rootDir}/${runId}/${patternGenerationDir}`
    : undefined;
  const { data: s3Files } = useS3ListFilesQuery(namespace, generatedPatternsPath);

  // Step 2: Fetch pattern artifact directories from each common prefix
  const patternArtifactQueries = useQueries({
    queries: (s3Files?.common_prefixes ?? []).map((prefixObj: S3CommonPrefix) => {
      const path = `${prefixObj.prefix}pattern_artifact`;
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

  // Step 3: Extract all pattern paths from the artifact directories
  const patternDirectories = React.useMemo(
    () =>
      patternArtifactQueries.data.flatMap((artifactResult) => {
        const prefixes = artifactResult.common_prefixes;
        return prefixes.map((prefixObj: S3CommonPrefix) => {
          // Extract pattern name from prefix like "...pattern_artifact/Pattern_L5_FULL/"
          const { prefix } = prefixObj;
          const parts = prefix.split('/').filter(Boolean);
          const name = parts[parts.length - 1]; // Last segment is the pattern name
          return {
            name,
            directory: prefix,
          };
        });
      }),
    [patternArtifactQueries.data],
  );

  // Step 4: Fetch metrics.json for each pattern
  const metricsQueries = useQueries({
    queries: patternDirectories.map(({ name, directory }) => {
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
          return data?.data?.columns || data;
        },
        enabled: Boolean(
          namespace && patternDirectories.length > 0 && !patternArtifactQueries.isPending,
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

  // Step 5: Transform data into final AutoragPattern format
  const patterns = React.useMemo(() => {
    if (
      metricsQueries.isPending ||
      patternDirectories.length === 0 ||
      metricsQueries.data.length !== patternDirectories.length
    ) {
      return {};
    }

    const results: Record<string, AutoragPattern> = {};

    patternDirectories.forEach((pattern, index) => {
      const patternData = metricsQueries.data[index];
      // S3 data already matches AutoragPattern schema
      results[pattern.name] = patternData;
    });

    return results;
  }, [metricsQueries.data, metricsQueries.isPending, patternDirectories]);

  return {
    patterns,
    isLoading: patternArtifactQueries.isPending || metricsQueries.isPending,
    isError: patternArtifactQueries.isError || metricsQueries.isError,
  };
}
