/* eslint-disable camelcase */
import type { AutoRAGEvaluationResult } from '~/app/types/autoragPattern';
import { getComparisonResult } from '~/app/components/run-results/PatternDetailsModal/tabs/SampleQATab';

const result = (question_id?: string, document_key = 'document-key'): AutoRAGEvaluationResult => ({
  question: question_id ?? 'question',
  question_id,
  answer: 'answer',
  correct_answers: ['correct answer'],
  answer_contexts: [{ text: 'context', document_key }],
  metrics: [],
});

describe('getComparisonResult', () => {
  it('should use the row index when the primary row has no question id', () => {
    const comparison = result('comparison-id', 'comparison-document');

    expect(getComparisonResult(result(undefined), new Map(), [comparison], 0)).toBe(comparison);
  });

  it('should use the row index when the comparison row has no question id', () => {
    const primary = result('q1', 'primary-document');
    const comparison = result(undefined, 'comparison-document');

    expect(getComparisonResult(primary, new Map(), [comparison], 0)).toBe(comparison);
  });

  it('should match comparison rows by matching question ids', () => {
    const primary = result('q1', 'primary-document');
    const comparison = result('q1', 'different-document');

    expect(getComparisonResult(primary, new Map([['q1', comparison]]), [comparison], 0)).toBe(
      comparison,
    );
  });

  it('should not match comparison rows with mismatched question ids', () => {
    const primary = result('q1', 'primary-document');
    const comparison = result('q2', 'comparison-document');

    expect(
      getComparisonResult(primary, new Map([['q2', comparison]]), [comparison], 0),
    ).toBeUndefined();
  });
});
