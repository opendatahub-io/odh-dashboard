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
  RUN_CREATED: 'AutoML Run Created',
  RUN_RECONFIGURED: 'AutoML Run Reconfigured',
  RUN_STOPPED: 'AutoML Run Stopped',
  RUN_RETRIED: 'AutoML Run Retried',
  RUN_DELETED: 'AutoML Run Deleted',
  METRIC_VIEWED: 'AutoML Metric Viewed',
  NOTEBOOK_DOWNLOADED: 'AutoML Notebook Downloaded',
  MODEL_DETAILS_DOWNLOADED: 'AutoML Model Details Downloaded',
  MODEL_REGISTERED: 'AutoML Model Registered',
  S3_CONNECTION_CREATED: 'AutoML S3 Connection Created',
  LEADERBOARD_SORTED: 'AutoML Leaderboard Sorted',
  LEADERBOARD_FILTER_APPLIED: 'AutoML Leaderboard Filter Applied',
  MODEL_COMPARED: 'AutoML Model Compared',
} as const;

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

const isKnownTaskType = (value: string): value is TaskType => value in PREDICTION_TYPE_MAP;

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
  hasTargetColumn: boolean;
  isRecommended: boolean;
  hasS3Connection: boolean;
};

/** Distinguishes which page/control a run action (retry, stop, delete, reconfigure) was triggered from. */
export type RunActionSource = 'runsList' | 'resultsPage';

/**
 * Distinguishes which control triggered a per-model action. Several model actions (save notebook,
 * register model) are reachable both from the leaderboard row kebab and from the model details
 * modal's "Save as" menu.
 */
export type ModelActionSource = 'leaderboard' | 'modelDetailsModal';

export type RunOutcomeTrackingProperties = {
  outcome: TrackingOutcome;
  success?: boolean;
  error?: string;
  source?: RunActionSource;
};

export type ModelActionOutcomeProperties = {
  outcome: TrackingOutcome;
  success?: boolean;
  error?: string;
  source?: ModelActionSource;
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

export const fireAutomlMetricViewed = (metricName?: string): void => {
  fireMiscTrackingEvent(AUTOML_EVENTS.METRIC_VIEWED, { metricName });
};

export const fireAutomlNotebookDownloaded = (source: ModelActionSource): void => {
  fireMiscTrackingEvent(AUTOML_EVENTS.NOTEBOOK_DOWNLOADED, { downloadType: 'notebook', source });
};

export const fireAutomlModelDetailsDownloaded = (): void => {
  fireMiscTrackingEvent(AUTOML_EVENTS.MODEL_DETAILS_DOWNLOADED, { downloadType: 'modelDetails' });
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

export const fireAutomlLeaderboardFilterApplied = (filterType: string): void => {
  fireMiscTrackingEvent(AUTOML_EVENTS.LEADERBOARD_FILTER_APPLIED, { filterType });
};

export const fireAutomlModelCompared = (countOfModelsCompared: number): void => {
  fireMiscTrackingEvent(AUTOML_EVENTS.MODEL_COMPARED, { countOfModelsCompared });
};
