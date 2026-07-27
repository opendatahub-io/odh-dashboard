import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { fetchS3File } from '~/app/hooks/queries';
import type {
  AutoRAGEvaluationResult,
  AutoRAGEvaluationMetricResult,
} from '~/app/types/autoragPattern';

export type RawEvaluationResult = {
  question: string;
  correct_answers: string[]; // eslint-disable-line camelcase
  question_id?: string; // eslint-disable-line camelcase
  answer: string;
  answer_contexts: { text: string; document_id: string }[]; // eslint-disable-line camelcase
} & ({ metrics: AutoRAGEvaluationMetricResult[] } | { scores: Record<string, number> });

export function normalizeEvaluationResult(raw: RawEvaluationResult): AutoRAGEvaluationResult {
  const metrics: AutoRAGEvaluationMetricResult[] =
    'metrics' in raw && Array.isArray(raw.metrics)
      ? raw.metrics
      : 'scores' in raw && typeof raw.scores === 'object'
        ? Object.entries(raw.scores).map(([name, score]) => ({
            name,
            evaluator: 'unitxt',
            score: typeof score === 'number' ? score : NaN,
          }))
        : [];

  return {
    question: raw.question,
    correct_answers: raw.correct_answers, // eslint-disable-line camelcase
    // V1 results include question_id; V2 may omit it.
    // When absent, comparison matching falls back to array index.
    question_id: raw.question_id, // eslint-disable-line camelcase
    answer: raw.answer,
    answer_contexts: raw.answer_contexts, // eslint-disable-line camelcase
    metrics,
  };
}

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
      return (parsed as RawEvaluationResult[]).map(normalizeEvaluationResult);
    },
    enabled: enabled && Boolean(namespace && key),
    retry: false,
  });
}
