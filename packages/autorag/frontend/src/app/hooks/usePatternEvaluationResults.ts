import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { fetchS3Json } from '~/app/hooks/queries';
import { parseEvaluationResultsArtifact } from '~/app/hooks/evaluationResultsSchema';
import type { AutoRAGEvaluationResult } from '~/app/types/autoragPattern';

export type RawEvaluationResult = unknown;

export function normalizeEvaluationResult(raw: RawEvaluationResult): AutoRAGEvaluationResult {
  return parseEvaluationResultsArtifact([raw])[0];
}

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

      const results = await fetchS3Json(namespace, key, { signal });
      return parseEvaluationResultsArtifact(results);
    },
    enabled: enabled && Boolean(namespace && key),
    retry: false,
  });
}
