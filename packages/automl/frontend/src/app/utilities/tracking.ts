import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  TASK_TYPE_BINARY,
  TASK_TYPE_MULTICLASS,
  TASK_TYPE_REGRESSION,
  TASK_TYPE_TIMESERIES,
} from '~/app/utilities/const';
import type { TaskType } from '~/app/types';

export { TrackingOutcome };

export const AUTOML_EVENTS = {
  PROJECT_DROPDOWN_OPTION_SELECTED: 'AutoML Project Dropdown Option Selected',
  RUN_DETAILS_DEFINED: 'AutoML Run Details Defined',
  TRAINING_DATA_CONFIGURED: 'AutoML Training Data Configured',
  TARGET_COLUMN_CONFIGURED: 'AutoML Target Column Configured',
  RUN_CREATED: 'AutoML Run Created',
  RUN_RECONFIGURED: 'AutoML Run Reconfigured',
  RUN_STOPPED: 'AutoML Run Stopped',
  RUN_RETRIED: 'AutoML Run Retried',
  RUN_DELETED: 'AutoML Run Deleted',
  MODEL_DETAILS_TAB_VIEWED: 'AutoML Model Details Tab Viewed',
  BACKTEST_WINDOW_METRIC_VIEWED: 'AutoML Backtest Window Metric Viewed',
  NOTEBOOK_DOWNLOADED: 'AutoML Notebook Downloaded',
  MODEL_DETAILS_DOWNLOAD_INITIATED: 'AutoML Model Details Download Initiated',
  MODEL_REGISTERED: 'AutoML Model Registered',
  S3_CONNECTION_CREATED: 'AutoML S3 Connection Created',
  LEADERBOARD_SORTED: 'AutoML Leaderboard Sorted',
  FLOW_EXITED: 'AutoML Flow Exited',
  RESULTS_VIEWED: 'AutoML Results Viewed',
  MODEL_DETAILS_VIEWED: 'AutoML Model Details Viewed',
} as const;

export const fireAutomlProjectDropdownOptionSelected = (selectedProject: string): void => {
  fireMiscTrackingEvent(AUTOML_EVENTS.PROJECT_DROPDOWN_OPTION_SELECTED, { selectedProject });
};

/** Maps AutoML's internal task_type values to the product-wide predictionType taxonomy. */
const PREDICTION_TYPE_MAP: Record<TaskType, string> = {
  [TASK_TYPE_BINARY]: 'binaryClassification',
  [TASK_TYPE_MULTICLASS]: 'multiclassClassification',
  [TASK_TYPE_REGRESSION]: 'regression',
  [TASK_TYPE_TIMESERIES]: 'timeSeriesForecasting',
};

/** Maps AutoML's internal eval_metric keys (any case) to the product-wide optimizationMetric taxonomy. */
/* eslint-disable camelcase -- keys mirror the BFF's snake_case eval_metric values */
const OPTIMIZATION_METRIC_MAP: Record<string, string> = {
  accuracy: 'accuracy',
  roc_auc: 'rocAuc',
  f1: 'f1Score',
  precision: 'precision',
  recall: 'recall',
  log_loss: 'logLoss',
  balanced_accuracy: 'balancedAccuracy',
};
/* eslint-enable camelcase */

const isKnownTaskType = (value: string): value is TaskType =>
  Object.prototype.hasOwnProperty.call(PREDICTION_TYPE_MAP, value);

export const mapPredictionType = (taskType?: string): string | undefined => {
  if (!taskType) {
    return undefined;
  }
  return isKnownTaskType(taskType) ? PREDICTION_TYPE_MAP[taskType] : taskType;
};

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- metric may be undefined at runtime
export const mapOptimizationMetric = (metric?: string): string | undefined =>
  metric ? (OPTIMIZATION_METRIC_MAP[metric.toLowerCase()] ?? metric) : undefined;

export type RunConfigTrackingProperties = {
  predictionType?: string;
  optimizationMetric?: string;
  isRecommended: boolean;
};

/** Distinguishes which page/control a run action (retry, stop, delete, reconfigure) was triggered from. */
export type RunActionSource = 'runsList' | 'resultsPage';

/**
 * Identifies where the user was in the configure flow when they exited without completing it.
 * `'trainingData'` and `'predictionType'` only apply to the create-run flow, where the configure
 * screen's sections are genuinely unlocked progressively. In the reconfigure flow the entire
 * configure screen (file, target column, prediction type, etc.) is already fully populated on
 * mount, so there's no equivalent progression to observe — reconfigure reports `'configure'`
 * once that screen is reached, with no further sub-step granularity.
 */
export type AutomlFunnelStep = 'defineDetails' | 'trainingData' | 'predictionType' | 'configure';

/** Where the user ended up after exiting the configure flow. `'none'` covers cases (e.g. tab close) where the destination can't be determined. */
export type AutomlExitDestination = 'experimentsList' | 'home' | 'otherAutoml' | 'none';

/**
 * Distinguishes which control triggered a per-model action. Several model actions (save notebook,
 * register model) are reachable both from the leaderboard row kebab and from the model details
 * modal's "Save as" menu.
 */
export type ModelActionSource = 'leaderboard' | 'modelDetailsModal';

/**
 * Allowlisted, non-sensitive failure category for outcome-tracking `error` fields.
 * `Error.message` from run actions, configuration, and model registration failures may
 * originate from the backend, a proxy, or a dependency, and can embed credentials, tenant
 * identifiers, resource details, user input, or internal endpoint information. Never forward
 * a raw error message into analytics — detailed messages belong only in the in-product
 * notification shown via `useNotification`. Callers must map caught errors to this fixed set
 * before passing them to an outcome-tracking event.
 */
export type AutomlFailureCategory = 'actionFailed';

/** The single allowlisted failure category currently in use — see {@link AutomlFailureCategory}. */
export const AUTOML_FAILURE_CATEGORY: AutomlFailureCategory = 'actionFailed';

export type RunOutcomeTrackingProperties = {
  outcome: TrackingOutcome;
  success?: boolean;
  error?: AutomlFailureCategory;
  source?: RunActionSource;
};

export type ModelActionOutcomeProperties = {
  outcome: TrackingOutcome;
  success?: boolean;
  error?: AutomlFailureCategory;
  source?: ModelActionSource;
};

/**
 * Fires when the user leaves the "define details" (name/description) step of the configure
 * flow — either moving forward (outcome: submit) or cancelling out (outcome: cancel). This is
 * a pure local step transition with no backend call, so unlike other outcome-bearing events
 * there's no success/error to report.
 */
export const fireAutomlRunDetailsDefined = (
  outcome: TrackingOutcome,
  hasDescription: boolean,
): void => {
  fireFormTrackingEvent(AUTOML_EVENTS.RUN_DETAILS_DEFINED, { outcome, hasDescription });
};

/**
 * Fires once when the user completes the training data section of the configure flow
 * (an S3 connection plus a file are selected, whether picked from the bucket or uploaded).
 * Used to measure funnel retention through the multi-section AutoML configure page.
 */
export const fireAutomlTrainingDataConfigured = (
  trainingDataSourceType: 'select' | 'upload',
): void => {
  fireMiscTrackingEvent(AUTOML_EVENTS.TRAINING_DATA_CONFIGURED, { trainingDataSourceType });
};

/**
 * Fires once when the user selects a target column in the configure flow. Used to measure
 * funnel retention through the multi-section AutoML configure page. Prediction type and
 * whether it matched the recommendation are captured later, at run creation time.
 */
export const fireAutomlTargetColumnConfigured = (): void => {
  fireMiscTrackingEvent(AUTOML_EVENTS.TARGET_COLUMN_CONFIGURED, {});
};

export const fireAutomlRunCreated = (
  properties: RunConfigTrackingProperties & RunOutcomeTrackingProperties,
): void => {
  fireFormTrackingEvent(AUTOML_EVENTS.RUN_CREATED, properties);
};

export const fireAutomlRunReconfigured = (
  properties: RunConfigTrackingProperties &
    RunOutcomeTrackingProperties & { changedFields: string[] },
): void => {
  fireFormTrackingEvent(AUTOML_EVENTS.RUN_RECONFIGURED, {
    ...properties,
    changedFields: properties.changedFields.join(','),
  });
};

export const fireAutomlRunStopped = (properties: RunOutcomeTrackingProperties): void => {
  fireFormTrackingEvent(AUTOML_EVENTS.RUN_STOPPED, properties);
};

export const fireAutomlRunRetried = (properties: RunOutcomeTrackingProperties): void => {
  fireFormTrackingEvent(AUTOML_EVENTS.RUN_RETRIED, properties);
};

export const fireAutomlRunDeleted = (properties: RunOutcomeTrackingProperties): void => {
  fireFormTrackingEvent(AUTOML_EVENTS.RUN_DELETED, properties);
};

/** Maps tabConfig.ts tab keys (kebab-case) to camelCase names for AutoML Model Details Tab Viewed tracking. */
const MODEL_DETAILS_TAB_NAME_MAP: Record<string, string> = {
  'model-information': 'modelInformation',
  'feature-summary': 'featureSummary',
  'model-evaluation': 'modelEvaluation',
  'confusion-matrix': 'confusionMatrix',
  'roc-curve': 'rocCurve',
  'precision-recall': 'precisionRecall',
  'backtest-window': 'backtestWindow',
};

export const mapModelDetailsTabName = (tabKey: string): string =>
  MODEL_DETAILS_TAB_NAME_MAP[tabKey] ?? tabKey;

export const fireAutomlModelDetailsTabViewed = (tabKey: string, taskType?: string): void => {
  fireMiscTrackingEvent(AUTOML_EVENTS.MODEL_DETAILS_TAB_VIEWED, {
    tabName: mapModelDetailsTabName(tabKey),
    predictionType: mapPredictionType(taskType),
  });
};

export const fireAutomlBacktestWindowMetricViewed = (metricName: string): void => {
  fireMiscTrackingEvent(AUTOML_EVENTS.BACKTEST_WINDOW_METRIC_VIEWED, { metricName });
};

export const fireAutomlNotebookDownloaded = (source: ModelActionSource): void => {
  fireMiscTrackingEvent(AUTOML_EVENTS.NOTEBOOK_DOWNLOADED, { downloadType: 'notebook', source });
};

/**
 * Fires when the user clicks "Download" on the model details modal, which triggers the
 * browser print dialog. This tracks intent only — `window.print()`'s `afterprint` event
 * fires whether the user completes, saves, or cancels the dialog, so it cannot be used as
 * proof of a completed download. Unlike `fireAutomlNotebookDownloaded`, which fires after a
 * verified successful blob download, there is no reliable "completed" signal available here.
 */
export const fireAutomlModelDetailsDownloadInitiated = (): void => {
  fireMiscTrackingEvent(AUTOML_EVENTS.MODEL_DETAILS_DOWNLOAD_INITIATED, {
    downloadType: 'modelDetails',
  });
};

export const fireAutomlModelRegistered = (
  properties: ModelActionOutcomeProperties & { registryTarget?: string },
): void => {
  fireFormTrackingEvent(AUTOML_EVENTS.MODEL_REGISTERED, properties);
};

export const fireAutomlS3ConnectionCreated = (properties: RunOutcomeTrackingProperties): void => {
  fireFormTrackingEvent(AUTOML_EVENTS.S3_CONNECTION_CREATED, properties);
};

export const fireAutomlLeaderboardSorted = (
  sortColumn: string,
  sortDirection: 'asc' | 'desc',
): void => {
  fireMiscTrackingEvent(AUTOML_EVENTS.LEADERBOARD_SORTED, { sortColumn, sortDirection });
};

/**
 * Fires when the user leaves the configure flow before creating a run — either via an explicit
 * in-app action (Cancel, breadcrumb) or by abandoning the tab/browser entirely. Not fired on a
 * successful run creation, nor when navigating between steps within the flow (e.g. Back).
 *
 * `changedFields` is only meaningful for the reconfigure flow, where `lastFunnelStep` alone
 * can't say whether the user changed anything before leaving (the form starts fully populated).
 * It's a comma-joined list of the same field names used by `fireAutomlRunReconfigured`'s
 * `changedFields` (empty string if reconfiguring with no changes made), and is omitted entirely
 * for the create-run flow.
 */
export const fireAutomlFlowExited = (
  exitType: 'abandon' | 'navigate',
  lastFunnelStep: AutomlFunnelStep,
  exitDestination: AutomlExitDestination,
  changedFields?: string,
): void => {
  fireMiscTrackingEvent(AUTOML_EVENTS.FLOW_EXITED, {
    exitType,
    lastFunnelStep,
    exitDestination,
    ...(changedFields !== undefined && { changedFields }),
  });
};

/** Where the user came from when navigating to the results page. */
export type AutomlResultsEntrySource = 'experimentsList' | 'notification' | 'direct' | 'other';

/** Router `location.state` shape set by links/navigations that lead to the results page. */
export type AutomlResultsNavigationState = {
  entrySource: AutomlResultsEntrySource;
};

export const isAutomlResultsNavigationState = (
  state: unknown,
): state is AutomlResultsNavigationState => {
  if (!state || typeof state !== 'object' || !('entrySource' in state)) {
    return false;
  }
  const { entrySource } = state;
  return (
    entrySource === 'experimentsList' ||
    entrySource === 'notification' ||
    entrySource === 'direct' ||
    entrySource === 'other'
  );
};

/**
 * Fires once per run when the results page finishes loading a run. `entrySource` is read from
 * router state set by the link/navigation that brought the user here, falling back to `'other'`
 * when the page was reached without that state (e.g. a bookmarked/pasted URL or a page refresh).
 */
export const fireAutomlResultsViewed = (entrySource: AutomlResultsEntrySource): void => {
  fireMiscTrackingEvent(AUTOML_EVENTS.RESULTS_VIEWED, { entrySource });
};

/** Which control on the results page the user drilled into a model's details from. */
export type ModelDetailsEntrySource = 'resultsTable' | 'pipelineViz' | 'other';

/**
 * Fires each time the user opens the model details modal (leaderboard row name link or
 * "View details" row action; the pipeline visualization does not yet link into the modal but
 * the source is captured for when it does).
 */
export const fireAutomlModelDetailsViewed = (
  entrySource: ModelDetailsEntrySource = 'resultsTable',
): void => {
  fireMiscTrackingEvent(AUTOML_EVENTS.MODEL_DETAILS_VIEWED, { entrySource });
};
