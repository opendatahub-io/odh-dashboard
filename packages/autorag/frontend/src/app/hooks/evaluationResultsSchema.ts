/** Canonical schemas and parser for evaluation_results.json artifacts. */
/* eslint-disable camelcase */
import * as z from 'zod';
import type { AutoRAGEvaluationResult } from '~/app/types/autoragPattern';
import {
  LegacyEvaluationResultsSchema,
  normalizeLegacyEvaluationResults,
} from './legacyEvaluationResults';

const CanonicalEvaluationResultSchema = z.object({
  question: z.string(),
  answer: z.string(),
  question_id: z.string().optional(),
  correct_answers: z.array(z.string()),
  answer_contexts: z.array(z.object({ text: z.string(), document_key: z.string() })),
  metrics: z.array(
    z.object({ name: z.string(), evaluator: z.string(), score: z.number().nullable() }),
  ),
});

export const CanonicalEvaluationResultsSchema = z.array(CanonicalEvaluationResultSchema);
export type CanonicalRawEvaluationResult = z.infer<typeof CanonicalEvaluationResultSchema>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export function normalizeCanonicalEvaluationResults(
  results: CanonicalRawEvaluationResult[],
): AutoRAGEvaluationResult[] {
  return results;
}

/** Dispatches by explicit row shape; an empty array is accepted as canonical. */
export function parseEvaluationResultsArtifact(value: unknown): AutoRAGEvaluationResult[] {
  const rows = z.array(z.unknown()).parse(value);
  const first = rows[0];

  if (isRecord(first) && 'metrics' in first) {
    return normalizeCanonicalEvaluationResults(CanonicalEvaluationResultsSchema.parse(value));
  }
  if (isRecord(first) && 'scores' in first) {
    return normalizeLegacyEvaluationResults(LegacyEvaluationResultsSchema.parse(value));
  }
  if (rows.length === 0) {
    return [];
  }
  return normalizeCanonicalEvaluationResults(CanonicalEvaluationResultsSchema.parse(value));
}

/* eslint-enable camelcase */
