/* eslint-disable camelcase */
import { parseEvaluationResultsArtifact } from '~/app/hooks/evaluationResultsSchema';
import { LegacyEvaluationResultsSchema } from '~/app/hooks/legacyEvaluationResults';

const sharedFields = {
  question: 'What is RAG?',
  correct_answers: ['RAG retrieves and generates.'],
  question_id: 'q0',
  answer: 'RAG is a pattern.',
};

describe('parseEvaluationResultsArtifact', () => {
  it('should parse canonical evaluator-qualified metrics and document_key contexts', () => {
    const result = parseEvaluationResultsArtifact([
      {
        ...sharedFields,
        answer_contexts: [{ text: 'Context text', document_key: 'doc-key' }],
        metrics: [
          { name: 'faithfulness', evaluator: 'unitxt', score: 0.8 },
          { name: 'faithfulness', evaluator: 'judge', score: null },
        ],
      },
    ]);

    expect(result[0].metrics).toEqual([
      { name: 'faithfulness', evaluator: 'unitxt', score: 0.8 },
      { name: 'faithfulness', evaluator: 'judge', score: null },
    ]);
    expect(result[0].answer_contexts).toEqual([{ text: 'Context text', document_key: 'doc-key' }]);
  });

  it('should normalize legacy scores and document_id contexts with unitxt identity', () => {
    const result = parseEvaluationResultsArtifact([
      {
        ...sharedFields,
        answer_contexts: [{ text: 'Context text', document_id: 'doc-id' }],
        scores: { faithfulness: 0.8, answer_correctness: null },
      },
    ]);

    expect(result[0].metrics).toEqual([
      { name: 'faithfulness', evaluator: 'unitxt', score: 0.8 },
      { name: 'answer_correctness', evaluator: 'unitxt', score: null },
    ]);
    expect(result[0].answer_contexts).toEqual([{ text: 'Context text', document_key: 'doc-id' }]);
  });

  it('should use explicit metrics presence rather than metrics length for dispatch', () => {
    expect(
      parseEvaluationResultsArtifact([
        {
          ...sharedFields,
          answer_contexts: [],
          metrics: [],
          scores: { faithfulness: 0.4 },
        },
      ]),
    ).toEqual([
      {
        ...sharedFields,
        answer_contexts: [],
        metrics: [],
      },
    ]);
  });

  it('should reject malformed and mixed row shapes', () => {
    expect(() =>
      parseEvaluationResultsArtifact([
        { ...sharedFields, answer_contexts: [], scores: { faithfulness: 0.4 } },
        { ...sharedFields, answer_contexts: [], metrics: [] },
      ]),
    ).toThrow();
    expect(() =>
      parseEvaluationResultsArtifact([{ ...sharedFields, answer_contexts: [] }]),
    ).toThrow();
  });

  it('should preserve an empty canonical results artifact', () => {
    expect(parseEvaluationResultsArtifact([])).toEqual([]);
  });
});

describe('LegacyEvaluationResultsSchema', () => {
  it('should require legacy document_id and scores fields', () => {
    expect(
      LegacyEvaluationResultsSchema.safeParse([
        { ...sharedFields, answer_contexts: [{ text: 'ctx', document_id: 'id' }], scores: {} },
      ]).success,
    ).toBe(true);
  });
});
