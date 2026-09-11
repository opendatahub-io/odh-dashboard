/* eslint-disable camelcase */
import {
  normalizeEvaluationResult,
  type RawEvaluationResult,
} from '~/app/hooks/usePatternEvaluationResults';

describe('normalizeEvaluationResult', () => {
  it('should pass through strict evaluation rows with document_key and metrics', () => {
    const raw: RawEvaluationResult = {
      question: 'What is RAG?',
      correct_answers: ['Retrieval augmented generation'],
      question_id: 'q0',
      answer: 'A retrieval pattern',
      answer_contexts: [{ text: 'Context', document_key: 'doc0' }],
      metrics: [{ name: 'faithfulness', evaluator: 'ragas', score: 0.8 }],
    };
    expect(normalizeEvaluationResult(raw)).toEqual(raw);
  });

  it('should preserve evaluator-qualified duplicate metric rows', () => {
    const raw: RawEvaluationResult = {
      question: 'Question',
      correct_answers: ['Answer'],
      answer: 'Answer',
      answer_contexts: [],
      metrics: [
        { name: 'faithfulness', evaluator: 'unitxt', score: 0.8 },
        { name: 'faithfulness', evaluator: 'ragas', score: 0.6 },
      ],
    };
    expect(normalizeEvaluationResult(raw).metrics).toHaveLength(2);
  });
});
