import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import { NESTED_STAGE_RECORD_KEYS } from '~/app/topology/stageMapConstants';
import type { PipelineRun, TaskType } from '~/app/types';
import { RuntimeStateKF } from '~/app/types/pipeline';
import {
  ALL_EVAL_METRICS,
  DEFAULT_EVAL_METRIC_BY_TASK,
  EVAL_METRICS_BY_TASK_TYPE,
  MAX_DISPLAY_NAME_LENGTH,
  METRIC_ALIASES,
  TASK_TYPE_BINARY,
  TASK_TYPE_MULTICLASS,
  TASK_TYPE_REGRESSION,
  TASK_TYPE_TIMESERIES,
  type EvalMetric,
} from './const';

const VALID_RUNTIME_STATES = new Set<string>(Object.values(RuntimeStateKF));

/** Accepts only known KFP runtime state strings; otherwise returns undefined. */
export const normalizePipelineRunState = (state: unknown): string | undefined => {
  if (typeof state !== 'string') {
    return undefined;
  }
  const normalized = state.trim();
  if (normalized.length === 0) {
    return undefined;
  }
  const upper = normalized.toUpperCase();
  return VALID_RUNTIME_STATES.has(upper) ? upper : undefined;
};

/**
 * Whether the run is in a state where it completed successfully.
 */
export const isRunCompleted = (state: unknown): boolean =>
  normalizePipelineRunState(state) === RuntimeStateKF.SUCCEEDED;

/**
 * Whether the run is in a state where it is no longer running.
 */
export const isRunInTerminalState = (state: unknown): boolean => {
  const s = normalizePipelineRunState(state);
  if (!s) {
    return false;
  }
  const TERMINAL_STATES: Set<string> = new Set([
    RuntimeStateKF.SUCCEEDED,
    RuntimeStateKF.FAILED,
    RuntimeStateKF.CANCELED,
    RuntimeStateKF.SKIPPED,
    RuntimeStateKF.CACHED,
  ]);
  return TERMINAL_STATES.has(s);
};

/**
 * Whether the run is in a state where it can be terminated (stopped).
 */
export const isRunTerminatable = (state: unknown): boolean => {
  const s = normalizePipelineRunState(state);
  return (
    s === RuntimeStateKF.RUNNING || s === RuntimeStateKF.PENDING || s === RuntimeStateKF.PAUSED
  );
};

/**
 * Whether the run is still in progress (not yet in a terminal state).
 * Includes CANCELING — the pipeline is still running but cannot be stopped again.
 */
export const isRunInProgress = (state: unknown): boolean => {
  const s = normalizePipelineRunState(state);
  return (
    s === RuntimeStateKF.RUNNING || s === RuntimeStateKF.PENDING || s === RuntimeStateKF.CANCELING
  );
};

/**
 * Whether the run is in a terminal failure state where it can be retried.
 */
export const isRunRetryable = (state: unknown): boolean => {
  const s = normalizePipelineRunState(state);
  return s === RuntimeStateKF.FAILED || s === RuntimeStateKF.CANCELED;
};

/**
 * Whether the run is in a terminal state where it can be deleted.
 */
export const isRunDeletable = (state: unknown): boolean => {
  const s = normalizePipelineRunState(state);
  return (
    s === RuntimeStateKF.SUCCEEDED || s === RuntimeStateKF.FAILED || s === RuntimeStateKF.CANCELED
  );
};

/**
 * Extracts HTTP status from Error.message when handleRestFailures (mod-arch-core)
 * has flattened AxiosError to a plain Error, so 403/404/503 branches can still run.
 * @param error - The error object to parse
 * @returns The HTTP status code, or undefined if not found
 */
export function parseErrorStatus(error: Error): number | undefined {
  const match =
    error.message.match(/\bstatus\s+code\s+(\d{3})\b/i) ??
    error.message.match(/\bstatus[:\s]+(\d{3})\b/i) ??
    error.message.match(/\b(403|404|503)\b/);
  if (match) {
    const code = parseInt(match[1], 10);
    return code >= 100 && code < 600 ? code : undefined;
  }
  return undefined;
}

/**
 * Extracts the task type from a pipeline run's runtime parameters.
 * - Returns the task_type value when present.
 * - Defaults to timeseries when parameters exist but task_type is missing
 *   (timeseries is the only task that omits this parameter).
 * - Returns undefined when runtime_config.parameters is absent.
 */
export const getTaskType = (pipelineRun?: PipelineRun): TaskType | undefined => {
  const params = pipelineRun?.runtime_config?.parameters;
  if (!params) {
    return undefined;
  }
  if (!Object.prototype.hasOwnProperty.call(params, 'task_type')) {
    return TASK_TYPE_TIMESERIES;
  }
  return params.task_type;
};

/**
 * Determines if a pipelineRun's task type is tabular.
 * @param pipelineRun - The pipeline run to check
 * @returns true if the task type is tabular, false otherwise
 */
export const isTabularRun = (pipelineRun?: PipelineRun): boolean => {
  const taskType = getTaskType(pipelineRun) ?? TASK_TYPE_TIMESERIES;

  return [TASK_TYPE_BINARY, TASK_TYPE_MULTICLASS, TASK_TYPE_REGRESSION].includes(taskType);
};

/**
 * Format metric keys from snake_case to a human-readable label.
 * Handles common ML acronyms as special cases.
 */
/* eslint-disable camelcase */
const METRIC_DISPLAY_NAMES: Record<string, string> = {
  f1: 'F₁',
  f1_macro: 'F₁ Macro',
  f1_micro: 'F₁ Micro',
  f1_weighted: 'F₁ Weighted',
  mean_absolute_error: 'MAE',
  mean_absolute_percentage_error: 'MAPE',
  mean_absolute_scaled_error: 'MASE',
  mean_squared_error: 'MSE',
  median_absolute_error: 'MedAE',
  mcc: 'MCC',
  pac_score: 'PAC Score',
  pearsonr: 'Pearson r',
  r2: 'R²',
  roc_auc: 'ROC AUC',
  roc_auc_ovo: 'ROC AUC OvO',
  roc_auc_ovo_macro: 'ROC AUC OvO Macro',
  roc_auc_ovo_weighted: 'ROC AUC OvO Weighted',
  roc_auc_ovr: 'ROC AUC OvR',
  roc_auc_ovr_macro: 'ROC AUC OvR Macro',
  roc_auc_ovr_micro: 'ROC AUC OvR Micro',
  roc_auc_ovr_weighted: 'ROC AUC OvR Weighted',
  root_mean_squared_error: 'RMSE',
  root_mean_squared_logarithmic_error: 'RMSLE',
  root_mean_squared_scaled_error: 'RMSSE',
  scaled_quantile_loss: 'SQL',
  symmetric_mean_absolute_percentage_error: 'SMAPE',
  weighted_absolute_percentage_error: 'WAPE',
  weighted_quantile_loss: 'WQL',
};
/* eslint-enable camelcase */

// Short descriptions for ML metrics — used in tooltip popovers on backtesting summary cards.
// Keys match the short-form names returned in model.metrics.test_data (e.g. 'RMSE', 'MAE').
// The lookup falls back through formatMetricName so snake_case keys (e.g. 'root_mean_squared_error') also resolve.
const METRIC_DESCRIPTIONS: Record<string, string> = {
  RMSE: 'Root mean squared error. Penalizes large forecast errors more heavily than MAE. Lower is better.',
  MAE: 'Mean absolute error. The average magnitude of forecast errors in the same units as the target. Lower is better.',
  R2: 'Coefficient of determination. Measures the fraction of variance explained by the model. Values closer to 1 indicate stronger explanatory power.',
  MASE: 'Mean absolute scaled error. Forecast error relative to a naive seasonal baseline. Values below 1 mean the model outperforms the baseline.',
  MAPE: 'Mean absolute percentage error. Average forecast error as a percentage of actual values. Lower is better.',
  SMAPE: 'Symmetric mean absolute percentage error. Range is 0 to 200%. Lower is better.',
  WAPE: 'Weighted absolute percentage error. Total absolute error divided by total actual values. More robust than MAPE for intermittent series.',
  MSE: 'Mean squared error. The average of squared forecast errors. Lower is better.',
  RMSLE:
    'Root mean squared logarithmic error. Penalizes under-predictions more than over-predictions. Lower is better.',
  RMSSE: 'Root mean squared scaled error. The squared counterpart of MASE. Lower is better.',
  WQL: 'Weighted quantile loss. Measures the accuracy of probabilistic forecasts across quantiles. Lower is better.',
  SQL: 'Scaled quantile loss. Quantile loss normalized by a naive baseline. Lower is better.',
};

export function getMetricDescription(key: string): string {
  const displayName = formatMetricName(key);
  return (
    METRIC_DESCRIPTIONS[key] ||
    METRIC_DESCRIPTIONS[displayName] ||
    'Holdout evaluation metric reported by the model.'
  );
}

/**
 * Case-insensitive metric lookup that also resolves acronym → snake_case aliases
 * (e.g. "RMSE" matches "root_mean_squared_error"). One-way: passing
 * "root_mean_squared_error" will not match an "RMSE" key.
 */
export function findMetricValue(
  metrics: Record<string, number>,
  key: string,
): { key: string; value: number } | undefined {
  const normalized = normalizeMetricKey(key);
  const found = Object.keys(metrics).find(
    (k) => k.toLowerCase() === key.toLowerCase() || k.toLowerCase() === normalized.toLowerCase(),
  );
  return found !== undefined ? { key: found, value: metrics[found] } : undefined;
}

export function truncateLabel(label: string, maxChars = 20): string {
  return label.length > maxChars ? `${label.slice(0, maxChars)}…` : label;
}

export function formatStageTimestamp(timestamp?: string): string {
  if (!timestamp) {
    return '—';
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDurationBetween(startStr?: string, endStr?: string): string | undefined {
  if (!startStr || !endStr) {
    return undefined;
  }

  const ms = new Date(endStr).getTime() - new Date(startStr).getTime();
  if (ms < 0 || !Number.isFinite(ms)) {
    return undefined;
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours} h ${minutes} m` : `${hours} h`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes} m ${seconds} s` : `${minutes} m`;
  }
  return seconds > 0 ? `${seconds} s` : '< 1 s';
}

export function formatMetricName(key: string): string {
  if (METRIC_DISPLAY_NAMES[key]) {
    return METRIC_DISPLAY_NAMES[key];
  }
  const lower = key.toLowerCase();
  if (METRIC_DISPLAY_NAMES[lower]) {
    return METRIC_DISPLAY_NAMES[lower];
  }
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format metric values for display.
 * Uses scientific notation for non-zero values that would round to 0.000.
 */
export function formatMetricValue(value: number | string): string {
  if (typeof value === 'string') {
    return value;
  }
  // If the value would round to 0.000 but is actually non-zero, use scientific notation
  const fixed = value.toFixed(3);
  if ((fixed === '0.000' || fixed === '-0.000') && value !== 0) {
    return value.toExponential(3);
  }
  return fixed;
}

/**
 * Safely coerce an unknown metric value to a number.
 * Returns 0 for non-numeric / missing values.
 */
export function toNumericMetric(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return 0;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/** Coerces a metric value for ranking; rejects partial or non-numeric API values. */
export function toRankableMetric(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
  }
  if (typeof value === 'string') {
    return Number.NEGATIVE_INFINITY;
  }
  return Number.NEGATIVE_INFINITY;
}

function findTestDataMetric(
  testData: Record<string, unknown> | undefined,
  metricName: string,
): unknown {
  if (!testData) {
    return undefined;
  }
  // Same last-wins behavior as AutomlLeaderboard's case-normalized lookup.
  const lookup = Object.fromEntries(
    Object.entries(testData).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return lookup[metricName.toLowerCase()];
}

export function normalizeMetricKey(key: string): string {
  return METRIC_ALIASES[key.toUpperCase()] ?? key;
}

const REVERSE_METRIC_ALIASES: Readonly<Partial<Record<string, string>>> = Object.fromEntries(
  Object.entries(METRIC_ALIASES).map(([acronym, snakeCase]) => [snakeCase, acronym]),
);

/**
 * Find the equivalent metric key in a target task type's supported list.
 * Handles the regression↔timeseries naming difference (snake_case vs acronyms)
 * by checking both the original key and its alias.
 * Returns `undefined` if no equivalent exists.
 */
export function findEquivalentMetric(
  metric: EvalMetric | undefined,
  targetTaskType: string,
): EvalMetric | undefined {
  if (!metric) {
    return undefined;
  }
  const supported = EVAL_METRICS_BY_TASK_TYPE[targetTaskType];
  if (!supported) {
    return undefined;
  }
  const supportedSet = new Set<string>(supported);
  if (supportedSet.has(metric)) {
    return metric;
  }
  // Try the alias: snake_case → acronym or acronym → snake_case
  const alias = REVERSE_METRIC_ALIASES[metric] ?? METRIC_ALIASES[metric.toUpperCase()];
  if (alias && supportedSet.has(alias)) {
    return ALL_EVAL_METRICS.find((m) => m === alias);
  }
  return undefined;
}

/**
 * Gets the optimized metric for a given task type.
 * @param taskType - The task type to get the metric for
 * @returns The optimized metric name, or 'Unknown metric' if no mapping exists
 */
export function getOptimizedMetricForTask(taskType: string): string {
  if (!(taskType in DEFAULT_EVAL_METRIC_BY_TASK)) {
    return 'Unknown metric';
  }
  return normalizeMetricKey(DEFAULT_EVAL_METRIC_BY_TASK[taskType] ?? '');
}

/**
 * Resolves the evaluation metric: uses the user-specified metric if provided,
 * otherwise falls back to the default metric for the given task type.
 */
export function resolveEvalMetric(evalMetric: string | undefined, taskType: string): string {
  return evalMetric ? normalizeMetricKey(evalMetric) : getOptimizedMetricForTask(taskType);
}

const BUILD_LEADERBOARD_STAGE_ID = 'build_leaderboard';

function isStageNestedRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseBestModelValue(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }
  return value.trim();
}

function getRecordField(record: Record<string, unknown>, field: string): string | undefined {
  const topLevel = parseBestModelValue(record[field]);
  if (topLevel) {
    return topLevel;
  }

  for (const nestedKey of NESTED_STAGE_RECORD_KEYS) {
    const nested = record[nestedKey];
    if (isStageNestedRecord(nested)) {
      const value = parseBestModelValue(nested[field]);
      if (value) {
        return value;
      }
    }
  }

  return undefined;
}

/** Reads the pipeline-selected winner from the build_leaderboard stage status. */
export function getBestModelFromStageMap(
  componentStageMap?: ComponentStageMap,
): string | undefined {
  if (!componentStageMap) {
    return undefined;
  }

  const components = Array.isArray(componentStageMap.components)
    ? componentStageMap.components.filter(isStageNestedRecord)
    : [];

  for (const component of components) {
    const stages = Array.isArray(component.stages)
      ? component.stages.filter(isStageNestedRecord)
      : [];
    const stage = stages.find((entry) => entry.id === BUILD_LEADERBOARD_STAGE_ID);
    if (!stage) {
      continue;
    }
    const bestModel = getRecordField(stage, 'best_model');
    if (bestModel) {
      return bestModel;
    }
  }

  for (const component of components) {
    const bestModel = getRecordField(component, 'best_model');
    if (bestModel) {
      return bestModel;
    }
  }

  return getRecordField(componentStageMap, 'best_model');
}

/** Maps a stage-map best_model value to a key in the loaded models record. */
export function resolveBestModelKey(
  models: Record<string, { name?: string } | null | undefined>,
  bestModel?: string,
): string | undefined {
  if (!bestModel) {
    return undefined;
  }
  if (Object.hasOwn(models, bestModel) && models[bestModel] != null) {
    return bestModel;
  }
  const matchingKeys = Object.entries(models)
    .filter(([, model]) => model?.name === bestModel)
    .map(([key]) => key);
  // Ambiguous display-name matches are left unresolved rather than picking arbitrarily.
  return matchingKeys.length === 1 ? matchingKeys[0] : undefined;
}

/** Resolves a models-record key to the display name shown on pipeline tree nodes. */
export function resolveModelDisplayName(
  models: Record<string, { name?: string } | null | undefined>,
  modelKey?: string,
): string | undefined {
  if (!modelKey) {
    return undefined;
  }
  if (!Object.hasOwn(models, modelKey)) {
    return modelKey;
  }
  return models[modelKey]?.name ?? modelKey;
}

export function compareOptimizedMetricValues(aVal: number | string, bVal: number | string): number {
  if (aVal === 'N/A' && bVal === 'N/A') {
    return 0;
  }
  if (aVal === 'N/A') {
    return 1;
  }
  if (bVal === 'N/A') {
    return -1;
  }
  const aNum = typeof aVal === 'number' ? aVal : 0;
  const bNum = typeof bVal === 'number' ? bVal : 0;
  if (Object.is(aNum, bNum)) {
    return 0;
  }
  // NaN is not ordered by >/<; keep it consistently below every finite/infinite metric.
  if (Number.isNaN(aNum)) {
    return 1;
  }
  if (Number.isNaN(bNum)) {
    return -1;
  }
  return bNum > aNum ? 1 : -1;
}

/** Orders model keys by optimized metric, pinning best_model first when provided. */
export function orderModelsByLeaderboardRank(
  modelKeys: string[],
  getOptimizedValue: (modelKey: string) => number | string,
  bestModelKey?: string,
): string[] {
  const sorted = modelKeys.toSorted((a, b) =>
    compareOptimizedMetricValues(getOptimizedValue(a), getOptimizedValue(b)),
  );

  if (!bestModelKey || !modelKeys.includes(bestModelKey)) {
    return sorted;
  }

  return [bestModelKey, ...sorted.filter((key) => key !== bestModelKey)];
}

/**
 * Build a mapping from model name → leaderboard rank (1-based).
 * Ranks by optimized metric descending, with rank 1 reserved for best_model
 * from the build_leaderboard stage when available.
 */
export function computeRankMap(
  models: Record<
    string,
    { metrics?: { test_data?: Record<string, unknown> } | null; name?: string } | null | undefined
  >,
  taskType: string,
  evalMetric?: string,
  bestModel?: string,
): Record<string, number> {
  const optimizedMetric = resolveEvalMetric(evalMetric, taskType);
  const bestModelKey = resolveBestModelKey(models, bestModel);

  const ordered = orderModelsByLeaderboardRank(
    Object.keys(models),
    (modelKey) => {
      const model = models[modelKey];
      if (model == null || model.metrics == null) {
        return Number.NEGATIVE_INFINITY;
      }
      const metric = findTestDataMetric(model.metrics.test_data, optimizedMetric);
      return metric != null ? toRankableMetric(metric) : Number.NEGATIVE_INFINITY;
    },
    bestModelKey,
  );

  return Object.fromEntries(ordered.map((name, index) => [name, index + 1]));
}

/**
 * Generates a reconfigure display name by appending or incrementing a ` - N` suffix.
 * If the result exceeds {@link MAX_DISPLAY_NAME_LENGTH}, the base name is truncated
 * and `...` is inserted so the full string (with suffix) fits within the limit.
 *
 * Examples:
 *  - "my-run" → "my-run - 1"
 *  - "my-run - 1" → "my-run - 2"
 *  - "my-run - 99" → "my-run - 100"
 *  - (248-char name) → "(244-char)... - 1"
 */
export function generateReconfigureName(originalName: string): string {
  const match = originalName.match(/^(.*) - (\d+)$/);
  const baseName = match ? match[1] : originalName;
  const nextNum = match ? (BigInt(match[2]) + 1n).toString() : '1';
  const suffix = ` - ${nextNum}`;

  const result = `${baseName}${suffix}`;
  const codePoints = Array.from(result);
  if (codePoints.length <= MAX_DISPLAY_NAME_LENGTH) {
    return result;
  }

  const ellipsis = '...';
  const suffixLen = Array.from(suffix).length;
  const maxBaseLen = Math.max(0, MAX_DISPLAY_NAME_LENGTH - suffixLen - ellipsis.length);
  const truncatedBase = Array.from(baseName).slice(0, maxBaseLen).join('');
  return Array.from(`${truncatedBase}${ellipsis}${suffix}`)
    .slice(0, MAX_DISPLAY_NAME_LENGTH)
    .join('');
}

/** Trigger a browser download for a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Match exact task dir or task dir + hyphen + KFP branch numeric suffix (e.g. `-2`). */
export function isTrainingTaskDirName(dirName: string, pattern: string): boolean {
  if (dirName === pattern) {
    return true;
  }
  if (!dirName.startsWith(`${pattern}-`)) {
    return false;
  }
  const suffix = dirName.slice(pattern.length + 1);
  return suffix.length > 0 && /^\d+$/.test(suffix);
}

/**
 * Find an S3 common-prefix directory whose leaf name matches the task path or a
 * KFP branch suffix variant (`task-2`). The suffix disambiguates conditional
 * branches and is unrelated to retries or recency; at most one match is expected.
 * Returns the prefix without a trailing slash, or `undefined` when none match.
 */
export function findTrainingTaskPrefix(
  commonPrefixes: { prefix: string }[],
  pattern: string,
): string | undefined {
  const match = commonPrefixes.find((p) => {
    const segments = p.prefix.split('/').filter(Boolean);
    const dirName = segments[segments.length - 1] ?? '';
    return isTrainingTaskDirName(dirName, pattern);
  });
  return match ? match.prefix.replace(/\/$/, '') : undefined;
}
