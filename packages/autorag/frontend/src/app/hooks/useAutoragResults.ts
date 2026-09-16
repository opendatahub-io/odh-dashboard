import { useQueries, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { useS3ListFilesQuery, fetchS3Json } from '~/app/hooks/queries';
import {
  isCanonicalRawPattern,
  parsePatternArtifact,
  type RawPatternArtifact,
} from '~/app/hooks/patternSchema';
import { normalizeLegacyPattern } from '~/app/hooks/legacyPattern';
import { useAutoragOutputDir } from '~/app/hooks/useAutoragOutputDir';
import type { AutoragPattern } from '~/app/types/autoragPattern';
import type { PipelineRun, S3CommonPrefix } from '~/app/types';

/* eslint-disable camelcase */
export function normalizePattern(
  raw: RawPatternArtifact,
  vectorIoProviderId?: string,
): AutoragPattern {
  if (!isCanonicalRawPattern(raw)) {
    return normalizeLegacyPattern(raw, vectorIoProviderId);
  }

  return {
    name: raw.name,
    iteration: raw.iteration,
    max_combinations: raw.max_combinations,
    duration_seconds: raw.duration_seconds,
    settings: raw.settings,
    evaluation: raw.evaluation,
    inference: raw.inference,
    indexing: raw.indexing,
  };
}
/* eslint-enable camelcase */

type UseAutoragResultsReturn = {
  patterns: Record<string, AutoragPattern>;
  failedPatterns: string[];
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  refetch: () => void;
  ragPatternsBasePath?: string;
};

const UUID_DIRECTORY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ArtifactDirectoryResolution = {
  id?: string;
  error?: string;
};

/**
 * Resolves the artifact directory only when the S3 listing identifies exactly one UUID child.
 * Common prefixes do not include recency metadata, so multiple candidates are ambiguous.
 */
export function resolveArtifactDirectory(
  prefixes: S3CommonPrefix[],
  basePath: string,
): ArtifactDirectoryResolution {
  const normalizedBasePath = basePath.replace(/\/+$/, '');
  const expectedPrefix = `${normalizedBasePath}/`;
  const ids = prefixes
    .map(({ prefix }) => {
      if (!prefix.startsWith(expectedPrefix)) {
        return undefined;
      }
      const remainder = prefix.slice(expectedPrefix.length).split('/').filter(Boolean);
      const id = remainder.length === 1 ? remainder[0] : undefined;
      return id && UUID_DIRECTORY_PATTERN.test(id) ? id : undefined;
    })
    .filter((id): id is string => Boolean(id));
  const uniqueIds = [...new Set(ids)];

  if (uniqueIds.length === 1) {
    return { id: uniqueIds[0] };
  }

  if (uniqueIds.length > 1) {
    return {
      error: `Multiple UUID directories found in ${basePath}; artifact recency is not available from the S3 listing`,
    };
  }

  return {
    error: `No UUID directory found in ${basePath}. Expected a UUID child directory`,
  };
}

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
  const { rootDir, patternGenerationDir } = useAutoragOutputDir(pipelineRun);
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

  // Step 1b: Extract the non-deterministic UUID directory. The listing exposes no recency
  // metadata for common prefixes, so multiple UUID directories must be treated as ambiguous.
  const artifactDirectoryResolution = React.useMemo(() => {
    if (!templatesOptimizationData?.common_prefixes || !templatesOptimizationPath) {
      return {};
    }

    return resolveArtifactDirectory(
      templatesOptimizationData.common_prefixes,
      templatesOptimizationPath,
    );
  }, [templatesOptimizationData, templatesOptimizationPath]);
  const nonDeterministicId = artifactDirectoryResolution.id;

  // Step 2: List pattern directories (Pattern1, Pattern2, etc.) from {uuid}/rag_patterns/
  const candidateRagPatternsPrefix = nonDeterministicId
    ? `${rootDir}/${runId}/${patternGenerationDir}/${nonDeterministicId}/rag_patterns`
    : undefined;
  const {
    data: ragPatternsData,
    isLoading: isRagPatternsLoading,
    isError: isRagPatternsError,
  } = useS3ListFilesQuery(namespace, candidateRagPatternsPrefix);

  // Only expose ragPatternsBasePath when S3 listing succeeded and returned results
  const ragPatternsBasePath =
    isRagPatternsLoading || isRagPatternsError || !ragPatternsData?.common_prefixes?.length // eslint-disable-line @typescript-eslint/no-unnecessary-condition -- ragPatternsData can be undefined when query is disabled
      ? undefined
      : candidateRagPatternsPrefix;

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
    if (templatesOptimizationData && artifactDirectoryResolution.error) {
      return new Error(artifactDirectoryResolution.error);
    }

    // Check if rag_patterns directory exists and has content
    if (
      nonDeterministicId &&
      !isRagPatternsLoading &&
      ragPatternsData &&
      patternDirectories.length === 0
    ) {
      return new Error(
        `No pattern directories found in ${ragPatternsBasePath}/. Expected pattern directories like Pattern1, Pattern2, etc.`,
      );
    }

    return null;
  }, [
    shouldFetchS3Files,
    isTemplatesOptimizationLoading,
    templatesOptimizationData,
    artifactDirectoryResolution,
    nonDeterministicId,
    isRagPatternsLoading,
    ragPatternsData,
    patternDirectories,
    ragPatternsBasePath,
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

          const raw = parsePatternArtifact(
            await fetchS3Json(namespace, patternJsonPath, { signal }),
          );

          const params = pipelineRun?.runtime_config?.parameters;
          const providerId =
            params && 'vector_io_provider_id' in params
              ? String(params.vector_io_provider_id)
              : undefined;

          const normalized = normalizePattern(raw, providerId);

          if (normalized.name !== name) {
            throw new Error(
              `Pattern identity mismatch: directory "${name}" contains pattern named "${normalized.name}"`,
            );
          }

          return {
            patternName: name,
            directory,
            data: normalized,
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
    ragPatternsBasePath,
  };
}
