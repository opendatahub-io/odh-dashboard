import { useQueries, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { useS3ListFilesQuery, fetchS3File } from '~/app/hooks/queries';
import type { AutoragPattern } from '~/app/types/autoragPattern';
import type { PipelineRun, S3CommonPrefix } from '~/app/types';

type UseAutoragResultsReturn = {
  patterns: Record<string, AutoragPattern>;
  failedPatterns: string[];
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  refetch: () => void;
  ragPatternsBasePath?: string;
};

/**
 * Custom hook to fetch and process AutoRAG pattern results from S3.
 *
 * This hook handles the complex cascade of queries needed to fetch AutoRAG results:
 * 1. Lists S3 objects in rag-templates-optimization/ to discover the non-deterministic UUID directory
 * 2. Lists pattern directories (Pattern1, Pattern2, etc.) from {uuid}/rag_patterns/
 * 3. Fetches pattern.json from each pattern directory
 * 4. Transforms all data into the final AutoragPattern format
 *
 * ## Testing Strategy
 *
 * **DO NOT unit test this hook directly.**
 *
 * This hook has cascading async query stages with conditional dependencies that make it
 * extremely difficult to unit test with mocks. The pattern queries only start after the
 * UUID discovery completes, requiring multiple render cycles with complex timing.
 *
 * **Instead, test this hook through:**
 * - `AutoragResultsContext.spec.tsx` - Tests the context that orchestrates this hook
 * - `AutoragResultsPage.spec.tsx` - Tests the page-level integration
 * - Cypress tests - End-to-end testing with real async flows
 *
 * See `__tests__/TESTING.md` for details.
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
  // Step 1: Fetch S3 files to discover the non-deterministic UUID directory
  const shouldFetchS3Files = pipelineRun?.state === 'SUCCEEDED' && Boolean(runId);
  const rootDir = 'documents-rag-optimization-pipeline';
  const patternGenerationDir = 'rag-templates-optimization';
  const templatesOptimizationPath = shouldFetchS3Files
    ? `${rootDir}/${runId}/${patternGenerationDir}`
    : undefined;
  const {
    data: templatesOptimizationData,
    isLoading: isTemplatesOptimizationLoading,
    isFetching: isTemplatesOptimizationFetching,
    isError: isTemplatesOptimizationError,
    refetch: refetchTemplatesOptimization,
  } = useS3ListFilesQuery(namespace, templatesOptimizationPath);

  // Step 1b: Extract the non-deterministic UUID directory
  // NOTE: Using most recent directory by timestamp (lexicographic sort of UUID prefixes).
  // TODO: Clarify if this timestamp selection logic is correct or if we need explicit timestamps.
  const nonDeterministicId = React.useMemo(() => {
    if (!templatesOptimizationData?.common_prefixes) {
      return undefined;
    }

    const prefixes = templatesOptimizationData.common_prefixes.filter(
      (prefixObj) => typeof prefixObj.prefix === 'string' && prefixObj.prefix.length > 0,
    );
    if (prefixes.length === 0) {
      return undefined;
    }

    // Sort prefixes lexicographically and take the last one (most recent by UUID timestamp)
    const sortedPrefixes = prefixes.toSorted((a, b) => a.prefix.localeCompare(b.prefix));
    const lastPrefix = sortedPrefixes[sortedPrefixes.length - 1];

    // Extract UUID from prefix like "documents-rag-optimization-pipeline/{runId}/rag-templates-optimization/{UUID}/"
    const parts = lastPrefix.prefix.split('/').filter(Boolean);
    if (parts.length === 0) {
      return undefined;
    }
    return parts[parts.length - 1]; // Last segment is the UUID
  }, [templatesOptimizationData]);

  // Step 2: List pattern directories (Pattern1, Pattern2, etc.) from {uuid}/rag_patterns/
  const ragPatternsPath = nonDeterministicId
    ? `${rootDir}/${runId}/${patternGenerationDir}/${nonDeterministicId}/rag_patterns`
    : undefined;
  const {
    data: ragPatternsData,
    isLoading: isRagPatternsLoading,
    isError: isRagPatternsError,
  } = useS3ListFilesQuery(namespace, ragPatternsPath);

  // Step 2b: Extract pattern directory names
  const patternDirectories = React.useMemo(() => {
    if (!ragPatternsData?.common_prefixes) {
      return [];
    }

    return ragPatternsData.common_prefixes
      .filter(
        (prefixObj: S3CommonPrefix) =>
          typeof prefixObj.prefix === 'string' && prefixObj.prefix.length > 0,
      )
      .map((prefixObj: S3CommonPrefix) => {
        // Extract pattern name from prefix like "...rag_patterns/Pattern1/"
        const { prefix } = prefixObj;
        const parts = prefix.split('/').filter(Boolean);
        if (parts.length === 0) {
          // eslint-disable-next-line no-console
          console.warn(`Skipping pattern with invalid prefix: ${prefix}`);
          return null;
        }
        const name = parts[parts.length - 1]; // Last segment is the pattern name (Pattern1, Pattern2, etc.)

        // Security: Validate name to prevent prototype pollution
        const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
        if (dangerousKeys.includes(name)) {
          // eslint-disable-next-line no-console
          console.warn(`Skipping pattern with dangerous name: ${name} in directory ${prefix}`);
          return null;
        }

        return {
          name,
          directory: prefix,
        };
      })
      .filter((item): item is { name: string; directory: string } => item !== null);
  }, [ragPatternsData]);

  // Validate file structure and create error messages for missing/unexpected directories
  const structureError = React.useMemo(() => {
    // Only check for errors if we're supposed to be fetching and initial queries have completed
    if (!shouldFetchS3Files || isTemplatesOptimizationLoading) {
      return null;
    }

    // Check if non-deterministic UUID directory was found
    if (templatesOptimizationData && !nonDeterministicId) {
      return new Error(
        `No UUID directory found in ${templatesOptimizationPath}. Expected structure: documents-rag-optimization-pipeline/{runId}/rag-templates-optimization/{UUID}/`,
      );
    }

    // Check if rag_patterns directory exists and has content
    if (
      nonDeterministicId &&
      !isRagPatternsLoading &&
      ragPatternsData &&
      patternDirectories.length === 0
    ) {
      return new Error(
        `No pattern directories found in ${ragPatternsPath}/. Expected pattern directories like Pattern1, Pattern2, etc.`,
      );
    }

    return null;
  }, [
    shouldFetchS3Files,
    isTemplatesOptimizationLoading,
    templatesOptimizationData,
    nonDeterministicId,
    templatesOptimizationPath,
    isRagPatternsLoading,
    ragPatternsData,
    patternDirectories,
    ragPatternsPath,
  ]);

  // Step 3: Fetch pattern.json for each pattern directory
  const patternQueries = useQueries({
    queries: patternDirectories.map(({ name, directory }) => {
      const patternJsonPath = `${directory}pattern.json`;
      return {
        queryKey: ['autorag', 's3File', namespace, name, patternJsonPath],
        queryFn: async ({ signal }) => {
          if (!namespace || !patternJsonPath) {
            throw new Error('namespace and key are required');
          }

          const blob = await fetchS3File(namespace, patternJsonPath, { signal });
          const text = await blob.text();
          const patternData = JSON.parse(text);

          // Validate that patternData is a non-null object with required AutoragPattern fields
          if (!patternData || typeof patternData !== 'object' || Array.isArray(patternData)) {
            throw new Error(
              `Invalid pattern data structure in ${patternJsonPath}: expected object, got ${typeof patternData}`,
            );
          }

          // Validate required fields for AutoragPattern
          const required = [
            'name',
            'iteration',
            'max_combinations',
            'duration_seconds',
            'settings',
            'scores',
            'final_score',
          ];
          const missing = required.filter((field) => !(field in patternData));
          if (missing.length > 0) {
            throw new Error(
              `Invalid pattern data in ${patternJsonPath}: missing required fields: ${missing.join(', ')}`,
            );
          }

          return {
            patternName: name,
            directory,
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            data: patternData as AutoragPattern,
          };
        },
        enabled: Boolean(namespace && patternDirectories.length > 0),
        retry: false,
      };
    }),
    combine: (results) => ({
      data: results.filter((r) => !r.isError).map((r) => r.data),
      isPending: results.some((r) => r.isPending),
      isError: results.length > 0 && results.every((r) => r.isError),
      failedPatterns: results
        .map((r, i) => (r.isError ? patternDirectories[i]?.name : null))
        .filter((name): name is string => Boolean(name)),
    }),
  });

  // Step 4: Transform data into final AutoragPattern format
  const patterns = React.useMemo(() => {
    if (patternQueries.isPending || patternDirectories.length === 0) {
      return {};
    }

    // Security: Create results with null prototype to prevent prototype pollution
    const results: Record<string, AutoragPattern> = Object.create(null);

    patternQueries.data.forEach((entry) => {
      // Skip entries that failed to load or are missing
      if (!entry) {
        return;
      }
      if (!entry.patternName) {
        // eslint-disable-next-line no-console
        console.warn('Skipping pattern: missing pattern name');
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!entry.data) {
        // eslint-disable-next-line no-console
        console.warn(`Skipping pattern ${entry.patternName}: failed to load data`);
        return;
      }

      const { patternName, data: patternData } = entry;

      // Security: Additional validation to reject dangerous keys
      const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
      if (dangerousKeys.includes(patternName)) {
        // eslint-disable-next-line no-console
        console.warn(`Skipping pattern with dangerous name: ${patternName}`);
        return;
      }

      // Defensive validation: skip patterns with invalid data structure
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!patternData || typeof patternData !== 'object' || Array.isArray(patternData)) {
        // eslint-disable-next-line no-console
        console.warn(`Skipping pattern ${patternName}: invalid data structure`);
        return;
      }

      // Defensive validation: check required fields
      const required = [
        'name',
        'iteration',
        'max_combinations',
        'duration_seconds',
        'settings',
        'scores',
        'final_score',
      ];
      const missing = required.filter((field) => !(field in patternData));
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (missing.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `Skipping pattern ${patternName}: missing required fields: ${missing.join(', ')}`,
        );
        return;
      }

      // S3 data already matches AutoragPattern schema
      results[patternName] = patternData;
    });

    return results;
  }, [patternQueries.data, patternQueries.isPending, patternDirectories]);

  // Determine overall error state
  const hasError =
    Boolean(structureError) ||
    isTemplatesOptimizationError ||
    isRagPatternsError ||
    patternQueries.isError;

  // If there's a structure error, log it for debugging
  React.useEffect(() => {
    if (structureError) {
      // eslint-disable-next-line no-console
      console.error('AutoRAG file structure error:', structureError.message);
    }
  }, [structureError]);

  // Determine the first error encountered
  const error =
    structureError ||
    (isTemplatesOptimizationError
      ? new Error('Failed to list templates optimization directory')
      : undefined) ||
    (isRagPatternsError ? new Error('Failed to list RAG patterns directory') : undefined) ||
    (patternQueries.isError ? new Error('Failed to fetch pattern data') : undefined);

  const queryClient = useQueryClient();
  const refetch = React.useCallback(() => {
    refetchTemplatesOptimization();
    queryClient.invalidateQueries({ queryKey: ['autorag', 's3Files', namespace] });
    queryClient.invalidateQueries({ queryKey: ['autorag', 's3File', namespace] });
  }, [refetchTemplatesOptimization, queryClient, namespace]);

  return {
    patterns,
    failedPatterns: patternQueries.failedPatterns,
    isLoading:
      isTemplatesOptimizationLoading ||
      (!templatesOptimizationData && isTemplatesOptimizationFetching) ||
      isRagPatternsLoading ||
      patternQueries.isPending,
    isError: hasError,
    error,
    refetch,
    ragPatternsBasePath: ragPatternsPath,
  };
}
