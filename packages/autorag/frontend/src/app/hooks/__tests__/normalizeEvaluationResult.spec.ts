/* eslint-disable camelcase */
import {
  normalizeEvaluationResult,
  type RawEvaluationResult,
} from '~/app/hooks/usePatternEvaluationResults';

describe('normalizeEvaluationResult', () => {
  const baseFields = {
    question: 'What is RAG?',
    correct_answers: ['RAG retrieves and generates.'],
    question_id: 'q0',
    answer: 'RAG is a pattern.',
    answer_contexts: [{ text: 'Context text', document_id: 'doc0' }],
  };

  it('should pass through V2 results with metrics array unchanged', () => {
    const raw: RawEvaluationResult = {
      ...baseFields,
      metrics: [
        { name: 'faithfulness', evaluator: 'unitxt', score: 0.8 },
        { name: 'answer_correctness', evaluator: 'judge', score: 0.7 },
      ],
    };

    const result = normalizeEvaluationResult(raw);
    expect(result.metrics).toEqual([
      { name: 'faithfulness', evaluator: 'unitxt', score: 0.8 },
      { name: 'answer_correctness', evaluator: 'judge', score: 0.7 },
    ]);
    expect(result.question).toBe('What is RAG?');
    expect(result.question_id).toBe('q0');
  });

  it('should convert V1 scores record to metrics array', () => {
    const raw: RawEvaluationResult = {
      ...baseFields,
      scores: {
        faithfulness: 0.8,
        answer_correctness: 0.7,
      },
    };

    const result = normalizeEvaluationResult(raw);
    expect(result.metrics).toHaveLength(2);
    expect(result.metrics).toContainEqual({
      name: 'faithfulness',
      evaluator: 'unitxt',
      score: 0.8,
    });
    expect(result.metrics).toContainEqual({
      name: 'answer_correctness',
      evaluator: 'unitxt',
      score: 0.7,
    });
  });

  it('should handle V1 scores with zero values', () => {
    const raw: RawEvaluationResult = {
      ...baseFields,
      scores: { faithfulness: 0 },
    };

    const result = normalizeEvaluationResult(raw);
    expect(result.metrics[0].score).toBe(0);
  });

  it('should preserve question_id when present', () => {
    const raw: RawEvaluationResult = {
      ...baseFields,
      question_id: 'custom-id',
      metrics: [],
    };

    const result = normalizeEvaluationResult(raw);
    expect(result.question_id).toBe('custom-id');
  });

  it('should handle missing question_id (V2 may omit it)', () => {
    const withoutId = { ...baseFields };
    delete (withoutId as Record<string, unknown>).question_id;
    const raw: RawEvaluationResult = {
      ...withoutId,
      metrics: [],
    } as RawEvaluationResult;

    const result = normalizeEvaluationResult(raw);
    expect(result.question_id).toBeUndefined();
  });

  it('should preserve answer_contexts', () => {
    const raw: RawEvaluationResult = {
      ...baseFields,
      answer_contexts: [
        { text: 'ctx1', document_id: 'doc1' },
        { text: 'ctx2', document_id: 'doc2' },
      ],
      metrics: [],
    };

    const result = normalizeEvaluationResult(raw);
    expect(result.answer_contexts).toHaveLength(2);
    expect(result.answer_contexts[0].document_id).toBe('doc1');
  });
});
