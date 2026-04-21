import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { fetchS3File } from '~/app/hooks/queries';
import type { AutoRAGEvaluationResult } from '~/app/types/autoragPattern';

/**
 * Lazily fetches evaluation_results.json for a single pattern from S3.
 *
 * The file lives at `{ragPatternsBasePath}/{patternName}/evaluation_results.json`.
 * React Query caches the result, so reopening the modal for the same pattern is instant.
 *
 * @param namespace - Kubernetes namespace (needed by the S3 proxy)
 * @param ragPatternsBasePath - Base S3 path up to `rag_patterns/`
 * @param patternName - Name of the pattern directory (e.g. "pattern0")
 * @param enabled - Only fetch when true (typically when the modal is open)
 */
export function usePatternEvaluationResults(
  namespace?: string,
  ragPatternsBasePath?: string,
  patternName?: string,
  enabled = false,
): UseQueryResult<AutoRAGEvaluationResult[], Error> {
  const key =
    ragPatternsBasePath && patternName
      ? `${ragPatternsBasePath}/${patternName}/evaluation_results.json`
      : undefined;

  return useQuery({
    queryKey: ['evaluationResults', namespace, key],
    queryFn: async ({ signal }) => {
      if (!namespace || !key) {
        throw new Error('namespace and evaluation results key are required');
      }

      const blob = await fetchS3File(namespace, key, { signal });
      const text = await blob.text();
      const parsed: unknown = JSON.parse(text);

      if (!Array.isArray(parsed)) {
        throw new Error(`Invalid evaluation results: expected array, got ${typeof parsed}`);
      }

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return parsed as AutoRAGEvaluationResult[];
    },
    enabled: enabled && Boolean(namespace && key),
    retry: false,
  });
}
