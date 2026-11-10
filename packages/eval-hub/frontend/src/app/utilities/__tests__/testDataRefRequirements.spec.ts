import {
  benchmarkRequiresTestData,
  BENCHMARKS_REQUIRING_TEST_DATA,
} from '~/app/utilities/testDataRefRequirements';

describe('benchmarkRequiresTestData', () => {
  it('should require test data for a listed benchmark id', () => {
    expect(benchmarkRequiresTestData('ragas', 'ragas_rag_default')).toBe(true);
    expect(benchmarkRequiresTestData('ragas', 'ragas_rag_full')).toBe(true);
    expect(benchmarkRequiresTestData('atif', 'atif_trajectory_default')).toBe(true);
    expect(benchmarkRequiresTestData('deepeval', 'deepeval-faithfulness')).toBe(true);
  });

  it('should not require test data for an unlisted benchmark of a listed provider', () => {
    expect(benchmarkRequiresTestData('ragas', 'other_benchmark')).toBe(false);
    expect(benchmarkRequiresTestData('deepeval', 'deepeval-other')).toBe(false);
  });

  it('should not require test data for an unlisted provider', () => {
    expect(benchmarkRequiresTestData('lm_evaluation_harness', 'arc_easy')).toBe(false);
  });

  it('should not gate ibm-clear, which supports MLflow trace input as an alternative', () => {
    expect(benchmarkRequiresTestData('ibm-clear', 'agentic-evaluation')).toBe(false);
  });

  it('should not require test data when the provider or benchmark is missing', () => {
    expect(benchmarkRequiresTestData(undefined, 'ragas_rag_default')).toBe(false);
    expect(benchmarkRequiresTestData('ragas', undefined)).toBe(false);
    expect(benchmarkRequiresTestData(undefined, undefined)).toBe(false);
  });

  it('should list exactly the verified required benchmarks', () => {
    expect(BENCHMARKS_REQUIRING_TEST_DATA).toEqual({
      ragas: ['ragas_rag_default', 'ragas_rag_full'],
      atif: ['atif_trajectory_default'],
      deepeval: [
        'deepeval-faithfulness',
        'deepeval-relevancy',
        'deepeval-hallucination',
        'deepeval-correctness',
        'deepeval-summarization',
      ],
    });
  });
});
