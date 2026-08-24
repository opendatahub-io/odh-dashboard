import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { z } from 'zod';
import { fetchS3Json } from '~/app/hooks/queries';
import type {
  AutoRAGEvaluationResult,
  AutoRAGEvaluationMetricResult,
} from '~/app/types/autoragPattern';

const rawEvaluationResultSchema = z.object({
  question: z.string(),
  answer: z.string(),
  question_id: z.string().optional(), // eslint-disable-line camelcase
  correct_answers: z.array(z.string()), // eslint-disable-line camelcase
  answer_contexts: z.array(z.object({ text: z.string(), document_id: z.string() })), // eslint-disable-line camelcase
  metrics: z
    .array(z.object({ name: z.string(), evaluator: z.string(), score: z.number() }))
    .optional(),
  scores: z.record(z.string(), z.number()).optional(),
});

const evaluationResultsSchema = z.array(rawEvaluationResultSchema);

export type RawEvaluationResult = z.infer<typeof rawEvaluationResultSchema>;

export function normalizeEvaluationResult(raw: RawEvaluationResult): AutoRAGEvaluationResult {
  const metrics: AutoRAGEvaluationMetricResult[] =
    raw.metrics && raw.metrics.length > 0
      ? raw.metrics
      : raw.scores
        ? Object.entries(raw.scores).map(([name, score]) => ({
            name,
            evaluator: 'unitxt',
            score,
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

      const results = await fetchS3Json(namespace, key, {
        signal,
        schema: evaluationResultsSchema,
      });
      return results.map(normalizeEvaluationResult);
    },
    enabled: enabled && Boolean(namespace && key),
    retry: false,
  });
}
