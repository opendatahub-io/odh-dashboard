export const EVAL_HUB_EVENTS = {
  PAGE_VIEWED: 'Evaluations Page Viewed',
  START_EVALUATION_SELECTED: 'Evaluations Start Evaluation Selected',
  EVALUATION_RUN_STARTED: 'Evaluations Evaluation Run Started',
  EVALUATION_COMPLETED: 'Evaluations Evaluation Completed',
  EVALUATION_DELETED: 'Evaluations Evaluation Deleted',
  EXTERNAL_LINK_CLICKED: 'Evaluations External Link Clicked',
  MLFLOW_EXPERIMENT_SELECTED: 'Evaluations MLFlow Experiment Selected',
  RESULT_BENCHMARK_CARD_SELECTED: 'Evaluations Result Benchmark Card Selected',
  BENCHMARK_RUN_SELECTED: 'Evaluations Benchmark Run Selected',
} as const;

/**
 * `source` identifies which page/surface the user initiated the evaluation flow from.
 * Currently always 'evaluations_page', but future entry points (e.g. a model detail
 * page shortcut) would pass a different value so analysts can segment by origin.
 */
export type EvaluationRunStartedProperties = {
  source: string;
  evaluationName?: string;
  sourceType?: 'inference_endpoint' | 'pre_recorded_responses';
  modelName?: string;
  endpointOrigin?: string;
  hasAPIKey?: boolean;
  sourceName?: string;
  hasDatasetURL?: boolean;
  hasAccessToken?: boolean;
  hasAdditionalArguments?: boolean;
  countOfAdditionalArguments?: number;
  outcome?: string;
  success?: boolean;
  errorName?: string;
};

export type EvaluationCompletedProperties = {
  evaluationName: string;
  runOutcome: 'completed' | 'failed' | 'cancelled';
  durationMs?: number;
  /** JSON-serialised array of benchmark type IDs. */
  benchmarkTypes?: string;
  error?: string;
};

export type EvaluationDeletedProperties = {
  evaluationName: string;
  /** State the evaluation was in at the time of deletion (e.g. 'completed', 'failed', 'running'). */
  previousState: string;
};

export type ExternalLinkClickedProperties = {
  href: string;
  section?: string;
};

export type MlflowExperimentSelectedProperties = {
  experimentSelection: 'default' | 'existing' | 'new';
  experimentName?: string;
};

export type ResultBenchmarkCardSelectedProperties = {
  benchmarkId: string;
  evaluationName?: string;
  collectionName?: string;
};

export type BenchmarkRunSelectedProperties = {
  collectionName?: string;
  /** Array of benchmark type IDs. Serialised as a JSON string when sent to Segment. */
  benchmarkTypes: string[];
  runType: 'single' | 'collection';
  countOfBenchmarks: number;
};
