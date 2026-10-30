/**
 * Benchmarks whose adapters cannot run without caller-supplied test data (test_data_ref).
 * For these, the UI hides the "None" source option and requires a test data source.
 *
 * Verified against the core EvalHub registry (config/providers/{ragas,atif,deepeval,ibm-clear}.yaml
 * in github.com/eval-hub/eval-hub) and the adapter input-resolution code
 * (github.com/eval-hub/eval-hub-contrib): for every entry below, the fallback input paths
 * (/data — an empty output EmptyDir — and the data_path/data_dir/trajectory_path parameters)
 * cannot supply user data, so test_data_ref is the only way to provide input.
 *
 * Excluded: ibm-clear's `agentic-evaluation` requires input but supports fetching traces
 * from MLflow via parameters, so it is not hard-gated.
 *
 * Interim curated list — the provider registry does not yet expose input-data requirements
 * per benchmark. Tracked in RHOAIENG-102150: replace this constant with the upstream
 * registry field when it lands. Keyed by provider ID; values list benchmark IDs.
 */
export const BENCHMARKS_REQUIRING_TEST_DATA: Readonly<Partial<Record<string, readonly string[]>>> =
  {
    ragas: ['ragas_rag_default', 'ragas_rag_full'],
    atif: ['atif_trajectory_default'],
    deepeval: [
      'deepeval-faithfulness',
      'deepeval-relevancy',
      'deepeval-hallucination',
      'deepeval-correctness',
      'deepeval-summarization',
    ],
  };

export const benchmarkRequiresTestData = (
  providerId: string | undefined,
  benchmarkId: string | undefined,
): boolean => {
  if (!providerId || !benchmarkId) {
    return false;
  }
  return BENCHMARKS_REQUIRING_TEST_DATA[providerId]?.includes(benchmarkId) ?? false;
};
