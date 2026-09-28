/** Legacy evaluation_results.json schema and isolated conversion to the UI model. */
/* eslint-disable camelcase */
import * as z from 'zod';
import type {
  AutoRAGEvaluationMetricResult,
  AutoRAGEvaluationResult,
} from '~/app/types/autoragPattern';

const LegacyEvaluationResultSchema = z.object({
  question: z.string(),
  answer: z.string(),
  question_id: z.string().optional(),
  correct_answers: z.array(z.string()),
  answer_contexts: z.array(z.object({ text: z.string(), document_id: z.string() })),
  scores: z.record(z.string(), z.number().nullable()),
});

export const LegacyEvaluationResultsSchema = z.array(LegacyEvaluationResultSchema);
export type LegacyRawEvaluationResult = z.infer<typeof LegacyEvaluationResultSchema>;

export function normalizeLegacyEvaluationResults(
  results: LegacyRawEvaluationResult[],
): AutoRAGEvaluationResult[] {
  return results.map((raw) => {
    const metrics: AutoRAGEvaluationMetricResult[] = Object.entries(raw.scores).map(
      ([name, score]) => ({
        name,
        evaluator: 'unitxt',
        score,
      }),
    );

    return {
      question: raw.question,
      correct_answers: raw.correct_answers,
      question_id: raw.question_id,
      answer: raw.answer,
      answer_contexts: raw.answer_contexts.map(({ text, document_id }) => ({
        text,
        document_key: document_id,
      })),
      metrics,
    };
  });
}

/* eslint-enable camelcase */
