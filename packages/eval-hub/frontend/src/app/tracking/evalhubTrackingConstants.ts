import type { TrackingOutcome } from '@odh-dashboard/ui-core';
import type { EvaluationStatusMessage } from './evaluationErrorCategory';

export const EVAL_HUB_EVENTS = {
  EVALUATION_RUN_STARTED: 'Evaluations Evaluation Run Started',
  EVALUATION_COMPLETED: 'Evaluations Evaluation Completed',
  EVALUATION_DELETED: 'Evaluations Evaluation Deleted',
  EVALUATION_STOPPED: 'Evaluations Evaluation Stopped',
  EXTERNAL_LINK_CLICKED: 'Evaluations External Link Clicked',
  MLFLOW_EXPERIMENT_SELECTED: 'Evaluations MLFlow Experiment Selected',
  MLFLOW_RUN_TABS_LOAD_FAILED: 'Evaluations MLFlow Run Tabs Load Failed',
  RESULT_BENCHMARK_CARD_SELECTED: 'Evaluations Result Benchmark Card Selected',
  BENCHMARK_RUN_SELECTED: 'Evaluations Benchmark Run Selected',
  COMPARE_RUN_SELECTED: 'Evaluations Compare Run Selected',
  COMPARE_INITIATED: 'Evaluations Compare Initiated',
  COMPARE_BENCHMARK_CHOSEN: 'Evaluations Compare Benchmark Chosen',
  RUN_SOURCE_SELECTED: 'Evaluations Run Source Selected',
  RUN_MODEL_SELECTED: 'Evaluations Run Model Selected',
  EXTERNAL_CONNECTION_TESTED: 'Evaluations External Connection Tested',
  RUN_THRESHOLD_CHANGED: 'Evaluations Run Threshold Changed',
  RUN_METRIC_SELECTED: 'Evaluations Run Metric Selected',
  RUN_PARAMETER_CHANGED: 'Evaluations Run Parameter Changed',
  BENCHMARK_CATALOG_OPENED: 'Evaluations Benchmark Catalog Opened',
  BENCHMARK_CATALOG_FILTER_APPLIED: 'Evaluations Benchmark Catalog Filter Applied',
  BENCHMARK_COLLECTION_FILTER_APPLIED: 'Evaluations Benchmark Collection Filter Applied',
  EVALUATION_RUNS_FILTER_APPLIED: 'Evaluations Evaluation Runs Filter Applied',
  BENCHMARK_DETAILS_VIEWED: 'Evaluations Benchmark Details Viewed',
  COLLECTION_CATEGORY_SELECTED: 'Evaluations Collection Category Selected',
  COLLECTION_GALLERY_VIEWED: 'Evaluations Collection Gallery Viewed',
  COLLECTION_DETAIL_VIEWED: 'Benchmark Collection Details Viewed',
  JOB_CREATE_OPENED: 'Evaluations Job Create Opened',
  JOB_CREATE_VALIDATION_FAILED: 'Evaluations Job Create Validation Failed',
  COMPARISON_VIEW_RENDERED: 'Evaluations Comparison View Rendered',
  JOB_DETAIL_OPENED: 'Evaluations Job Detail Opened',
  FAILURE_DETAIL_OPENED: 'Evaluations Failure Detail Opened',
  COLLECTION_CUSTOMIZE_CLICKED: 'Evaluations Collection Customize Clicked',
  COLLECTION_EDIT_OPENED: 'Evaluations Collection Edit Opened',
  COLLECTION_CREATE_OPENED: 'Evaluations Collection Create Opened',
  COLLECTION_SAVED: 'Evaluations Collection Saved',
  REPORT_GENERATION_TRIGGERED: 'Evaluations Report Generation Triggered',
  COLLECTION_DELETED: 'Evaluations Collection Deleted',
  EVALUATION_STATUS_TAB_SELECTED: 'Evaluations Status Tab Selected',
  EVALUATION_LOGS_VIEWED: 'Evaluations Logs Viewed',
  EVALUATION_RESULTS_VIEWED: 'Evaluations Results Viewed',
  EVALUATION_RECONFIGURE_SELECTED: 'Evaluations Reconfigure Selected',
  COLLECTION_ALL_SUITES_OPENED: 'Evaluations Collection All Suites Opened',
} as const;

export type EvalHubCollectionSurface =
  'collection_gallery' | 'my_benchmark_suites' | 'curated_gallery';

/**
 * `source` identifies which page/surface the user initiated the evaluation flow from.
 * Currently always 'evaluations_page', but future entry points (e.g. a model detail
 * page shortcut) would pass a different value so analysts can segment by origin.
 */
export type EvaluationRunStartedProperties = {
  source: string;
  evaluationName?: string;
  sourceType?: 'model' | 'agent' | 'pre_recorded_responses';
  modelName?: string;
  endpointOrigin?: string;
  hasAPIKey?: boolean;
  sourceName?: string;
  hasDatasetURL?: boolean;
  hasAccessToken?: boolean;
  hasAdditionalArguments?: boolean;
  countOfAdditionalArguments?: number;
  outcome?: TrackingOutcome;
  success?: boolean;
  errorName?: string;
};

export type EvaluationCompletedProperties = {
  evaluationName: string;
  runOutcome: 'completed' | 'failed' | 'cancelled';
  durationMs?: number;
  /** JSON-serialised array of benchmark type IDs. */
  benchmarkTypes?: string;
  /** Raw evaluation status message; the tracking wrapper reduces it to a safe message-code category. */
  error?: EvaluationStatusMessage;
};

export type EvaluationDeletedProperties = {
  evaluationName: string;
  /** State the evaluation was in at the time of deletion (e.g. 'completed', 'failed', 'running'). */
  previousState: string;
};

export type ExternalLinkClickedProperties = {
  url: string;
  benchmarkId: string;
  surface: string;
};

export type MlflowExperimentSelectedProperties = {
  experimentSelection: 'default' | 'existing' | 'new';
  experimentName?: string;
};

export type MlflowRunTabsLoadFailedProperties = Record<string, never>;

export type ResultBenchmarkCardSelectedProperties = {
  benchmarkId: string;
  evaluationName?: string;
  /** Only reported for system (curated) collections — custom suite names are dropped at dispatch (PII exclusion). */
  collectionName?: string;
};

export type BenchmarkRunSelectedProperties = {
  /** Only reported for system (curated) collections — custom suite names are dropped at dispatch (PII exclusion). */
  collectionName?: string;
  /** JSON-serialised array of benchmark type IDs. */
  benchmarkTypes: string;
  runType: 'single' | 'collection';
  countOfBenchmarks: number;
};

export type CompareRunSelectedProperties = {
  evaluationName: string;
  evaluationType: 'Benchmark' | 'Benchmark suite';
  isSelected: boolean;
  countOfRuns: number;
};

export type CompareInitiatedProperties = {
  countOfRuns: number;
  runTypes: 'all_benchmarks' | 'all_suites' | 'mixed';
  hasCollections: boolean;
};

export type CompareBenchmarkChosenProperties = {
  countOfBenchmarks: number;
  totalAvailable: number;
  benchmarkNames: string;
};

export type RunSourceSelectedProperties = {
  sourceType: 'model' | 'agent' | 'prerecorded';
};

export type RunModelSelectedProperties = {
  selectedModel: string;
  isExternal: boolean;
};

export type ExternalConnectionTestedProperties = {
  outcome: 'success' | 'error';
  endpointType: 'model' | 'agent' | 'prerecorded';
  error?: string;
};

export type RunThresholdChangedProperties = {
  thresholdValue: number;
  benchmarkName: string;
};

export type RunMetricSelectedProperties = {
  metricName: string;
  isDefault: boolean;
  benchmarkName: string;
};

export type RunParameterChangedProperties = {
  parameterName: string;
  /** Redacted shape descriptor (e.g. "string(12)", "number", "boolean") — never the raw value. */
  parameterValueShape: string;
  benchmarkName: string;
  isDefault: boolean;
};

export type BenchmarkCatalogOpenedProperties = {
  surface: EvalHubCollectionSurface;
};

export type BenchmarkCatalogFilterType =
  'category' | 'evaluates' | 'framework' | 'metric' | 'search';

export type BenchmarkCatalogFilterAppliedProperties = {
  filterType: BenchmarkCatalogFilterType;
  // For the search filter, value is the trimmed input length — raw search text is never reported.
  value: string;
};

export type BenchmarkCollectionFilterType =
  | 'search'
  | 'category'
  | 'benchmark'
  | 'metric'
  | 'evaluates'
  | 'modality'
  | 'task'
  | 'industry'
  | 'tag';

export type BenchmarkCollectionFilterAppliedProperties = {
  filterType: BenchmarkCollectionFilterType;
  // For the search filter, value is the trimmed input length — raw search text is never reported.
  value: string;
  surface: EvalHubCollectionSurface;
};

export type EvaluationRunsFilterAttribute = 'name' | 'type' | 'status';

export type EvaluationRunsFilterAppliedProperties =
  | {
      filterAttribute: 'status';
      /** Status values are non-PII enums (e.g. 'failed') and are tracked as-is. */
      value: string;
    }
  | {
      filterAttribute: Exclude<EvaluationRunsFilterAttribute, 'status'>;
      /** Redacted shape descriptor (e.g. "string(12)") — never the raw value. */
      valueShape: string;
    };

export type BenchmarkDetailsViewedProperties = {
  source: 'catalogTable' | 'suiteEditor';
};

export type CollectionCategorySelectedProperties = {
  categoryId: string;
  evaluationTarget?: string;
  surface: EvalHubCollectionSurface;
};

export type CollectionGalleryViewedProperties = {
  surface: EvalHubCollectionSurface;
};

export type CollectionTileProperties = {
  /** Only reported for system (curated) collections — custom suite names are dropped at dispatch (PII exclusion). */
  collectionName: string;
  surface: EvalHubCollectionSurface;
};

export type JobCreateOpenedProperties = {
  surface: string;
};

export type JobCreateValidationFailedProperties = {
  validation_error_category: 'form_invalid' | 'parameters_not_object' | 'parameters_invalid_json';
};

export type ComparisonViewRenderedProperties = {
  surface: string;
  countOfRuns: number;
};

export type JobDetailOpenedProperties = {
  evaluationName: string;
  state: string;
};

export type FailureDetailOpenedProperties = {
  evaluationName: string;
  failure_category: string;
  benchmarkIndex?: number;
};

export type EvaluationStatusTabSelectedProperties = {
  evaluationName: string;
  tab: 'progress' | 'events_log';
};

export type EvaluationLogsViewedProperties = {
  evaluationName: string;
  benchmarkIndex?: number;
  source: 'status_tab' | 'progress_benchmark';
};

export type EvaluationResultsViewedProperties = {
  evaluationName: string;
};

export type EvaluationReconfigureSelectedProperties = {
  evaluationName: string;
  previousState: string;
};

export type CollectionCustomizeProperties = CollectionTileProperties;

export type CollectionCreateOpenedProperties = {
  surface: EvalHubCollectionSurface;
};

export type CollectionSavedProperties = {
  outcome: TrackingOutcome.submit;
  success: boolean;
  /** Dropped at dispatch — saved suites are always custom, so the name is user-entered (PII exclusion). */
  collectionName?: string;
  saveMode: 'create' | 'edit' | 'copy';
  /** Which submit button the user clicked — distinct from saveMode, which is the form's mode. */
  action: 'save' | 'save_and_run';
  fromCurated: boolean;
  /** Present only when cloning an existing collection (saveMode 'copy'). */
  sourceCollectionId?: string;
  countOfEvaluatesAssetTypes: number;
  /** JSON-serialised values for each collection metadata form field. */
  suiteDomains?: string;
  suiteTasks?: string;
  suiteModalities?: string;
  suiteIndustries?: string;
  suiteEvaluates?: string;
  suiteThreshold?: number;
  benchmarkCount?: number;
  /** Alpha-ordered, comma-separated names of the selected benchmarks. */
  benchmarks?: string;
  /** JSON-serialised, unique, alpha-ordered benchmark parameter keys — never raw values. */
  benchmarkParameterKeys?: string;
  /** Whether any selected benchmark has user-entered advanced (additional) parameters. */
  hasAdditionalParameters?: boolean;
  error_category?: string;
};

export type ReportGenerationTriggeredProperties = Record<string, never>;

export type CollectionDeletedProperties = {
  /** Only reported for system (curated) collections — custom suite names are dropped at dispatch (PII exclusion). */
  collectionName: string;
  outcome: 'success' | 'error';
  error_category?: string;
};

export type EvalHubEventName = (typeof EVAL_HUB_EVENTS)[keyof typeof EVAL_HUB_EVENTS];

// Distributes keyof over union property types so every arm (e.g. both members of
// EvaluationRunsFilterAppliedProperties) yields its keys.
type UnionPropertyKeys<T> = T extends unknown ? keyof T & string : never;

export type EvalHubEventProperties = {
  [EVAL_HUB_EVENTS.EVALUATION_RUN_STARTED]: EvaluationRunStartedProperties;
  [EVAL_HUB_EVENTS.EVALUATION_COMPLETED]: EvaluationCompletedProperties;
  [EVAL_HUB_EVENTS.EVALUATION_DELETED]: EvaluationDeletedProperties;
  [EVAL_HUB_EVENTS.EVALUATION_STOPPED]: EvaluationDeletedProperties;
  [EVAL_HUB_EVENTS.EXTERNAL_LINK_CLICKED]: ExternalLinkClickedProperties;
  [EVAL_HUB_EVENTS.MLFLOW_EXPERIMENT_SELECTED]: MlflowExperimentSelectedProperties;
  [EVAL_HUB_EVENTS.MLFLOW_RUN_TABS_LOAD_FAILED]: MlflowRunTabsLoadFailedProperties;
  [EVAL_HUB_EVENTS.RESULT_BENCHMARK_CARD_SELECTED]: ResultBenchmarkCardSelectedProperties;
  [EVAL_HUB_EVENTS.BENCHMARK_RUN_SELECTED]: BenchmarkRunSelectedProperties;
  [EVAL_HUB_EVENTS.COMPARE_RUN_SELECTED]: CompareRunSelectedProperties;
  [EVAL_HUB_EVENTS.COMPARE_INITIATED]: CompareInitiatedProperties;
  [EVAL_HUB_EVENTS.COMPARE_BENCHMARK_CHOSEN]: CompareBenchmarkChosenProperties;
  [EVAL_HUB_EVENTS.RUN_SOURCE_SELECTED]: RunSourceSelectedProperties;
  [EVAL_HUB_EVENTS.RUN_MODEL_SELECTED]: RunModelSelectedProperties;
  [EVAL_HUB_EVENTS.EXTERNAL_CONNECTION_TESTED]: ExternalConnectionTestedProperties;
  [EVAL_HUB_EVENTS.RUN_THRESHOLD_CHANGED]: RunThresholdChangedProperties;
  [EVAL_HUB_EVENTS.RUN_METRIC_SELECTED]: RunMetricSelectedProperties;
  [EVAL_HUB_EVENTS.RUN_PARAMETER_CHANGED]: RunParameterChangedProperties;
  [EVAL_HUB_EVENTS.BENCHMARK_CATALOG_OPENED]: BenchmarkCatalogOpenedProperties;
  [EVAL_HUB_EVENTS.BENCHMARK_CATALOG_FILTER_APPLIED]: BenchmarkCatalogFilterAppliedProperties;
  [EVAL_HUB_EVENTS.BENCHMARK_COLLECTION_FILTER_APPLIED]: BenchmarkCollectionFilterAppliedProperties;
  [EVAL_HUB_EVENTS.EVALUATION_RUNS_FILTER_APPLIED]: EvaluationRunsFilterAppliedProperties;
  [EVAL_HUB_EVENTS.BENCHMARK_DETAILS_VIEWED]: BenchmarkDetailsViewedProperties;
  [EVAL_HUB_EVENTS.COLLECTION_CATEGORY_SELECTED]: CollectionCategorySelectedProperties;
  [EVAL_HUB_EVENTS.COLLECTION_GALLERY_VIEWED]: CollectionGalleryViewedProperties;
  [EVAL_HUB_EVENTS.COLLECTION_DETAIL_VIEWED]: CollectionTileProperties;
  [EVAL_HUB_EVENTS.JOB_CREATE_OPENED]: JobCreateOpenedProperties;
  [EVAL_HUB_EVENTS.JOB_CREATE_VALIDATION_FAILED]: JobCreateValidationFailedProperties;
  [EVAL_HUB_EVENTS.COMPARISON_VIEW_RENDERED]: ComparisonViewRenderedProperties;
  [EVAL_HUB_EVENTS.JOB_DETAIL_OPENED]: JobDetailOpenedProperties;
  [EVAL_HUB_EVENTS.FAILURE_DETAIL_OPENED]: FailureDetailOpenedProperties;
  [EVAL_HUB_EVENTS.EVALUATION_STATUS_TAB_SELECTED]: EvaluationStatusTabSelectedProperties;
  [EVAL_HUB_EVENTS.EVALUATION_LOGS_VIEWED]: EvaluationLogsViewedProperties;
  [EVAL_HUB_EVENTS.EVALUATION_RESULTS_VIEWED]: EvaluationResultsViewedProperties;
  [EVAL_HUB_EVENTS.EVALUATION_RECONFIGURE_SELECTED]: EvaluationReconfigureSelectedProperties;
  [EVAL_HUB_EVENTS.COLLECTION_ALL_SUITES_OPENED]: CollectionGalleryViewedProperties;
  [EVAL_HUB_EVENTS.COLLECTION_CUSTOMIZE_CLICKED]: CollectionCustomizeProperties;
  [EVAL_HUB_EVENTS.COLLECTION_EDIT_OPENED]: CollectionTileProperties;
  [EVAL_HUB_EVENTS.COLLECTION_CREATE_OPENED]: CollectionCreateOpenedProperties;
  [EVAL_HUB_EVENTS.COLLECTION_SAVED]: CollectionSavedProperties;
  [EVAL_HUB_EVENTS.REPORT_GENERATION_TRIGGERED]: ReportGenerationTriggeredProperties;
  [EVAL_HUB_EVENTS.COLLECTION_DELETED]: CollectionDeletedProperties;
};

/**
 * Runtime allowlist of property keys per event. The `satisfies` check keeps it in sync
 * with the property types at compile time, but structural typing permits callers to
 * pass values carrying extra keys — those are dropped before dispatch.
 */
export const EVAL_HUB_EVENT_PROPERTY_ALLOWLIST = {
  [EVAL_HUB_EVENTS.EVALUATION_RUN_STARTED]: [
    'source',
    'evaluationName',
    'sourceType',
    'modelName',
    'endpointOrigin',
    'hasAPIKey',
    'sourceName',
    'hasDatasetURL',
    'hasAccessToken',
    'hasAdditionalArguments',
    'countOfAdditionalArguments',
    'outcome',
    'success',
    'errorName',
  ],
  [EVAL_HUB_EVENTS.EVALUATION_COMPLETED]: [
    'evaluationName',
    'runOutcome',
    'durationMs',
    'benchmarkTypes',
    'error',
  ],
  [EVAL_HUB_EVENTS.EVALUATION_DELETED]: ['evaluationName', 'previousState'],
  [EVAL_HUB_EVENTS.EVALUATION_STOPPED]: ['evaluationName', 'previousState'],
  [EVAL_HUB_EVENTS.EXTERNAL_LINK_CLICKED]: ['url', 'benchmarkId', 'surface'],
  [EVAL_HUB_EVENTS.MLFLOW_EXPERIMENT_SELECTED]: ['experimentSelection', 'experimentName'],
  [EVAL_HUB_EVENTS.MLFLOW_RUN_TABS_LOAD_FAILED]: [],
  [EVAL_HUB_EVENTS.RESULT_BENCHMARK_CARD_SELECTED]: [
    'benchmarkId',
    'evaluationName',
    'collectionName',
  ],
  [EVAL_HUB_EVENTS.BENCHMARK_RUN_SELECTED]: [
    'collectionName',
    'benchmarkTypes',
    'runType',
    'countOfBenchmarks',
  ],
  [EVAL_HUB_EVENTS.COMPARE_RUN_SELECTED]: [
    'evaluationName',
    'evaluationType',
    'isSelected',
    'countOfRuns',
  ],
  [EVAL_HUB_EVENTS.COMPARE_INITIATED]: ['countOfRuns', 'runTypes', 'hasCollections'],
  [EVAL_HUB_EVENTS.COMPARE_BENCHMARK_CHOSEN]: [
    'countOfBenchmarks',
    'totalAvailable',
    'benchmarkNames',
  ],
  [EVAL_HUB_EVENTS.RUN_SOURCE_SELECTED]: ['sourceType'],
  [EVAL_HUB_EVENTS.RUN_MODEL_SELECTED]: ['selectedModel', 'isExternal'],
  [EVAL_HUB_EVENTS.EXTERNAL_CONNECTION_TESTED]: ['outcome', 'endpointType', 'error'],
  [EVAL_HUB_EVENTS.RUN_THRESHOLD_CHANGED]: ['thresholdValue', 'benchmarkName'],
  [EVAL_HUB_EVENTS.RUN_METRIC_SELECTED]: ['metricName', 'isDefault', 'benchmarkName'],
  [EVAL_HUB_EVENTS.RUN_PARAMETER_CHANGED]: [
    'parameterName',
    'parameterValueShape',
    'benchmarkName',
    'isDefault',
  ],
  [EVAL_HUB_EVENTS.BENCHMARK_CATALOG_OPENED]: ['surface'],
  [EVAL_HUB_EVENTS.BENCHMARK_CATALOG_FILTER_APPLIED]: ['filterType', 'value'],
  [EVAL_HUB_EVENTS.BENCHMARK_COLLECTION_FILTER_APPLIED]: ['filterType', 'value', 'surface'],
  [EVAL_HUB_EVENTS.EVALUATION_RUNS_FILTER_APPLIED]: ['filterAttribute', 'value', 'valueShape'],
  [EVAL_HUB_EVENTS.BENCHMARK_DETAILS_VIEWED]: ['source'],
  [EVAL_HUB_EVENTS.COLLECTION_CATEGORY_SELECTED]: ['categoryId', 'evaluationTarget', 'surface'],
  [EVAL_HUB_EVENTS.COLLECTION_GALLERY_VIEWED]: ['surface'],
  [EVAL_HUB_EVENTS.COLLECTION_DETAIL_VIEWED]: ['collectionName', 'surface'],
  [EVAL_HUB_EVENTS.JOB_CREATE_OPENED]: ['surface'],
  [EVAL_HUB_EVENTS.JOB_CREATE_VALIDATION_FAILED]: ['validation_error_category'],
  [EVAL_HUB_EVENTS.COMPARISON_VIEW_RENDERED]: ['surface', 'countOfRuns'],
  [EVAL_HUB_EVENTS.JOB_DETAIL_OPENED]: ['evaluationName', 'state'],
  [EVAL_HUB_EVENTS.FAILURE_DETAIL_OPENED]: ['evaluationName', 'failure_category', 'benchmarkIndex'],
  [EVAL_HUB_EVENTS.EVALUATION_STATUS_TAB_SELECTED]: ['evaluationName', 'tab'],
  [EVAL_HUB_EVENTS.EVALUATION_LOGS_VIEWED]: ['evaluationName', 'benchmarkIndex', 'source'],
  [EVAL_HUB_EVENTS.EVALUATION_RESULTS_VIEWED]: ['evaluationName'],
  [EVAL_HUB_EVENTS.EVALUATION_RECONFIGURE_SELECTED]: ['evaluationName', 'previousState'],
  [EVAL_HUB_EVENTS.COLLECTION_ALL_SUITES_OPENED]: ['surface'],
  [EVAL_HUB_EVENTS.COLLECTION_CUSTOMIZE_CLICKED]: ['collectionName', 'surface'],
  [EVAL_HUB_EVENTS.COLLECTION_EDIT_OPENED]: ['collectionName', 'surface'],
  [EVAL_HUB_EVENTS.COLLECTION_CREATE_OPENED]: ['surface'],
  [EVAL_HUB_EVENTS.COLLECTION_SAVED]: [
    'outcome',
    'success',
    'collectionName',
    'saveMode',
    'action',
    'fromCurated',
    'sourceCollectionId',
    'countOfEvaluatesAssetTypes',
    'suiteDomains',
    'suiteTasks',
    'suiteModalities',
    'suiteIndustries',
    'suiteEvaluates',
    'suiteThreshold',
    'benchmarkCount',
    'benchmarks',
    'benchmarkParameterKeys',
    'hasAdditionalParameters',
    'error_category',
  ],
  [EVAL_HUB_EVENTS.REPORT_GENERATION_TRIGGERED]: [],
  [EVAL_HUB_EVENTS.COLLECTION_DELETED]: ['collectionName', 'outcome', 'error_category'],
} satisfies { [K in EvalHubEventName]: readonly UnionPropertyKeys<EvalHubEventProperties[K]>[] };
