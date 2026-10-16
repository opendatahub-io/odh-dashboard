import type { TrackingOutcome } from '@odh-dashboard/ui-core';
import type { EvaluationStatusMessage } from './evaluationErrorCategory';

export const EVAL_HUB_EVENTS = {
  EVALUATION_RUN_STARTED: 'Evaluations Evaluation Run Started',
  EVALUATION_COMPLETED: 'Evaluations Evaluation Completed',
  EVALUATION_DELETED: 'Evaluations Evaluation Deleted',
  EVALUATION_STOPPED: 'Evaluations Evaluation Stopped',
  EXTERNAL_LINK_CLICKED: 'Evaluations External Link Clicked',
  MLFLOW_EXPERIMENT_SELECTED: 'Evaluations MLFlow Experiment Selected',
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
  SECURITY_INSIGHTS_VIEWED: 'Security Insights Viewed',
  SECURITY_INSIGHTS_FILTER_TYPE_CHANGED: 'Security Insights Filter Type Changed',
  SECURITY_INSIGHTS_FILTER_APPLIED: 'Security Insights Filter Applied',
  SECURITY_INSIGHTS_SORT_CHANGED: 'Security Insights Sort Changed',
  SECURITY_INSIGHTS_PAGINATION_CHANGED: 'Security Insights Pagination Changed',
  BENCHMARK_CATALOG_OPENED: 'evalhub.benchmark.catalog.opened',
  COLLECTION_CATEGORY_SELECTED: 'evalhub.collection.category.selected',
  COLLECTION_GALLERY_VIEWED: 'evalhub.collection.gallery.viewed',
  COLLECTION_TILE_CLICKED: 'evalhub.collection.gallery.tile_clicked',
  COLLECTION_DETAIL_VIEWED: 'evalhub.collection.detail.viewed',
  JOB_CREATE_OPENED: 'evalhub.job.create.opened',
  JOB_CREATE_VALIDATION_FAILED: 'evalhub.job.create.validation_failed',
  COMPARISON_VIEW_RENDERED: 'evalhub.comparison.view.rendered',
  JOB_DETAIL_OPENED: 'evalhub.monitoring.job_detail_opened',
  FAILURE_DETAIL_OPENED: 'evalhub.monitoring.failure_detail_opened',
  COLLECTION_CUSTOMIZE_CLICKED: 'evalhub.collection.customize.clicked',
  COLLECTION_EDIT_OPENED: 'evalhub.collection.edit.opened',
  COLLECTION_CREATE_OPENED: 'evalhub.collection.create.opened',
  COLLECTION_SAVED: 'evalhub.collection.saved',
  REPORT_GENERATION_TRIGGERED: 'evalhub.report.generation.triggered',
  COLLECTION_DELETED: 'evalhub.collection.deleted',
  EVALUATION_STATUS_TAB_SELECTED: 'evalhub.monitoring.status_tab_selected',
  EVALUATION_LOGS_VIEWED: 'evalhub.monitoring.logs_viewed',
  EVALUATION_RESULTS_VIEWED: 'evalhub.monitoring.results_viewed',
  EVALUATION_RECONFIGURE_SELECTED: 'evalhub.monitoring.reconfigure_selected',
  COLLECTION_ALL_SUITES_OPENED: 'evalhub.collection.all_suites.opened',
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

export type ResultBenchmarkCardSelectedProperties = {
  benchmarkId: string;
  evaluationName?: string;
  collectionName?: string;
};

export type BenchmarkRunSelectedProperties = {
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

export type SecurityInsightsViewedProperties = {
  sourceId: string;
  modelName: string;
  insightCount: number;
};

export type SecurityInsightsFilterTypeChangedProperties = {
  previousFilterType: string;
  newFilterType: string;
};

export type SecurityInsightsFilterAppliedProperties = {
  filterType: string;
  hasResults: boolean;
  resultCount: number;
};

export type SecurityInsightsSortChangedProperties = {
  column: string;
  direction: 'asc' | 'desc';
};

export type SecurityInsightsPaginationChangedProperties = {
  page: number;
  perPage: number;
  totalItems: number;
};

export type BenchmarkCatalogOpenedProperties = {
  surface: EvalHubCollectionSurface;
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
  collectionName?: string;
  saveMode: 'create' | 'edit' | 'copy';
  suiteName?: string;
  suiteDescription?: string;
  /** JSON-serialised values for each collection metadata form field. */
  suiteDomains?: string;
  suiteTasks?: string;
  suiteModalities?: string;
  suiteIndustries?: string;
  suiteEvaluates?: string;
  suiteThreshold?: number;
  benchmarkCount?: number;
  /** JSON-serialised final benchmark form state, including user-entered parameters. */
  benchmarks?: string;
  error_category?: string;
};

export type ReportGenerationTriggeredProperties = Record<string, never>;

export type CollectionDeletedProperties = {
  collectionName: string;
  outcome: 'success' | 'error';
  error_category?: string;
};

export type EvalHubEventName = (typeof EVAL_HUB_EVENTS)[keyof typeof EVAL_HUB_EVENTS];

export type EvalHubEventProperties = {
  [EVAL_HUB_EVENTS.EVALUATION_RUN_STARTED]: EvaluationRunStartedProperties;
  [EVAL_HUB_EVENTS.EVALUATION_COMPLETED]: EvaluationCompletedProperties;
  [EVAL_HUB_EVENTS.EVALUATION_DELETED]: EvaluationDeletedProperties;
  [EVAL_HUB_EVENTS.EVALUATION_STOPPED]: EvaluationDeletedProperties;
  [EVAL_HUB_EVENTS.EXTERNAL_LINK_CLICKED]: ExternalLinkClickedProperties;
  [EVAL_HUB_EVENTS.MLFLOW_EXPERIMENT_SELECTED]: MlflowExperimentSelectedProperties;
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
  [EVAL_HUB_EVENTS.SECURITY_INSIGHTS_VIEWED]: SecurityInsightsViewedProperties;
  [EVAL_HUB_EVENTS.SECURITY_INSIGHTS_FILTER_TYPE_CHANGED]: SecurityInsightsFilterTypeChangedProperties;
  [EVAL_HUB_EVENTS.SECURITY_INSIGHTS_FILTER_APPLIED]: SecurityInsightsFilterAppliedProperties;
  [EVAL_HUB_EVENTS.SECURITY_INSIGHTS_SORT_CHANGED]: SecurityInsightsSortChangedProperties;
  [EVAL_HUB_EVENTS.SECURITY_INSIGHTS_PAGINATION_CHANGED]: SecurityInsightsPaginationChangedProperties;
  [EVAL_HUB_EVENTS.BENCHMARK_CATALOG_OPENED]: BenchmarkCatalogOpenedProperties;
  [EVAL_HUB_EVENTS.COLLECTION_CATEGORY_SELECTED]: CollectionCategorySelectedProperties;
  [EVAL_HUB_EVENTS.COLLECTION_GALLERY_VIEWED]: CollectionGalleryViewedProperties;
  [EVAL_HUB_EVENTS.COLLECTION_TILE_CLICKED]: CollectionTileProperties;
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
