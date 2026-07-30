import {
  Bullseye,
  Button,
  Card,
  CardBody,
  Content,
  ContentVariants,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  Label,
  Skeleton,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import { ColumnsIcon, ExclamationCircleIcon, StarIcon } from '@patternfly/react-icons';
import {
  ActionsColumn,
  InnerScrollContainer,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  type ThProps,
} from '@patternfly/react-table';
import React from 'react';
import { Link, useParams } from 'react-router';
import type { ColumnManagementModalColumn } from '@patternfly/react-component-groups';
import AutomlRunInProgress from '~/app/components/empty-states/AutomlRunInProgress';
import { useAutomlResultsContext, type AutomlModel } from '~/app/context/AutomlResultsContext';
import { RuntimeStateKF } from '~/app/types/pipeline';
import {
  formatMetricName,
  formatMetricValue,
  isRunInProgress,
  orderModelsByLeaderboardRank,
  resolveEvalMetric,
} from '~/app/utilities/utils';
import ManageColumnsModal from './ManageColumnsModal';
import './AutomlLeaderboard.scss';

type LeaderboardEntry = {
  rank: number;
  modelKey: string;
  displayName: string;
  metrics: Record<string, number | string>;
  optimizedMetricValue: number | string;
};

/**
 * Column metadata for leaderboard table headers and tooltips.
 * Metric columns use `"metric:<key>"` IDs matching the column IDs at render time.
 *
 * @property name - The full display name shown in the tooltip header.
 * @property acronym - Optional short label rendered in the column header instead of `name`.
 *   When present, the header displays the acronym while the tooltip continues to show the
 *   full `name`. Useful for metric columns where the full name is too long for a header cell.
 * @property description - Optional supplementary text shown below `name` in the tooltip.
 * @property minWidth - Optional CSS min-width value applied to the column header (e.g., `"9rem"`).
 *   Prevents narrow metric columns from collapsing when the table has many columns.
 */
type ColumnMeta = { name: string; acronym?: string; description?: string; minWidth?: string };

const COLUMN_META: Record<string, ColumnMeta> = {
  rank: {
    name: 'Rank',
    description:
      'The rank of the model. Ranks are determined by the performance of the optimized metric.',
  },
  model: {
    name: 'Model name',
    description: 'The name of the generated model.',
  },
  'metric:accuracy': {
    name: 'Accuracy',
    description:
      'The proportion of predictions that are correct. A high accuracy score means the model correctly classifies most inputs.',
    minWidth: '9rem',
  },
  'metric:balanced_accuracy': {
    name: 'Balanced Accuracy',
    description:
      "The average of the model's accuracy in each category. A high balanced accuracy score means the model correctly classifies inputs in most categories.",
    minWidth: '13rem',
  },
  'metric:precision': {
    name: 'Precision',
    description:
      'The proportion of positive predictions that are correct. A high precision score means the model rarely labels a negative example as positive.',
    minWidth: '9rem',
  },
  'metric:recall': {
    name: 'Recall',
    description:
      'The proportion of actual positives that the model correctly identifies. A high recall score means the model rarely misses positive examples.',
    minWidth: '9rem',
  },
  'metric:roc_auc': {
    name: 'Receiver Operating Characteristic (Area Under Curve)',
    acronym: formatMetricName('roc_auc'),
    description: 'Measures how well a model distinguishes between two classes.',
    minWidth: '9rem',
  },
  'metric:mcc': {
    name: 'Matthews correlation coefficient (MCC)',
    acronym: formatMetricName('mcc'),
    description:
      'A correlation coefficient between observed and predicted classifications that accounts for all four quadrants of a confusion matrix. Ranges from -1 (total disagreement) to +1 (perfect prediction), with 0 indicating no better than random.',
    minWidth: '9rem',
  },
  'metric:log_loss': {
    name: 'Log Loss',
    description:
      'Penalizes confident wrong predictions. Lower values indicate better calibrated probabilities.',
    minWidth: '9rem',
  },
  'metric:f1': {
    name: formatMetricName('f1'),
    acronym: formatMetricName('f1'),
    description:
      'Harmonic average of the precision and recall, with best value of 1 (perfect precision and recall) and worst at 0.',
    minWidth: '8rem',
  },
  'metric:f1_macro': {
    name: formatMetricName('f1_macro'),
    acronym: formatMetricName('f1_macro'),
    description:
      'Unweighted mean of per-class F1 scores. Treats all classes equally regardless of support.',
    minWidth: '9rem',
  },
  'metric:f1_micro': {
    name: formatMetricName('f1_micro'),
    acronym: formatMetricName('f1_micro'),
    description:
      'F1 computed on aggregate true positives, false positives, and false negatives across all classes.',
    minWidth: '9rem',
  },
  'metric:f1_weighted': {
    name: formatMetricName('f1_weighted'),
    acronym: formatMetricName('f1_weighted'),
    description:
      'Weighted mean of per-class F1 scores, weighted by the number of samples in each class.',
    minWidth: '9rem',
  },
  'metric:roc_auc_ovo': {
    name: 'ROC AUC (One-vs-One)',
    acronym: formatMetricName('roc_auc_ovo'),
    description:
      'ROC AUC using one-vs-one strategy, averaging over all pairwise class combinations.',
    minWidth: '9rem',
  },
  'metric:roc_auc_ovo_macro': {
    name: 'ROC AUC OvO Macro',
    acronym: formatMetricName('roc_auc_ovo_macro'),
    description: 'Macro-averaged one-vs-one ROC AUC. Unweighted mean across all class pairs.',
    minWidth: '9rem',
  },
  'metric:roc_auc_ovo_weighted': {
    name: 'ROC AUC OvO Weighted',
    acronym: formatMetricName('roc_auc_ovo_weighted'),
    description: 'Weighted one-vs-one ROC AUC, weighted by class prevalence.',
    minWidth: '9rem',
  },
  'metric:roc_auc_ovr': {
    name: 'ROC AUC (One-vs-Rest)',
    acronym: formatMetricName('roc_auc_ovr'),
    description: 'ROC AUC using one-vs-rest strategy, treating each class as a binary problem.',
    minWidth: '9rem',
  },
  'metric:roc_auc_ovr_macro': {
    name: 'ROC AUC OvR Macro',
    acronym: formatMetricName('roc_auc_ovr_macro'),
    description: 'Macro-averaged one-vs-rest ROC AUC. Unweighted mean across all classes.',
    minWidth: '9rem',
  },
  'metric:roc_auc_ovr_micro': {
    name: 'ROC AUC OvR Micro',
    acronym: formatMetricName('roc_auc_ovr_micro'),
    description:
      'Micro-averaged one-vs-rest ROC AUC. Computed on aggregate counts across all classes.',
    minWidth: '9rem',
  },
  'metric:roc_auc_ovr_weighted': {
    name: 'ROC AUC OvR Weighted',
    acronym: formatMetricName('roc_auc_ovr_weighted'),
    description: 'Weighted one-vs-rest ROC AUC, weighted by class prevalence.',
    minWidth: '9rem',
  },
  'metric:average_precision': {
    name: 'Average Precision',
    description:
      'Area under the precision-recall curve. Summarizes the trade-off between precision and recall.',
    minWidth: '9rem',
  },
  'metric:precision_macro': {
    name: 'Precision Macro',
    description: 'Unweighted mean of per-class precision. Treats all classes equally.',
    minWidth: '9rem',
  },
  'metric:precision_micro': {
    name: 'Precision Micro',
    description:
      'Precision computed on aggregate true positives and false positives across all classes.',
    minWidth: '9rem',
  },
  'metric:precision_weighted': {
    name: 'Precision Weighted',
    description:
      'Weighted mean of per-class precision, weighted by the number of samples in each class.',
    minWidth: '9rem',
  },
  'metric:recall_macro': {
    name: 'Recall Macro',
    description: 'Unweighted mean of per-class recall. Treats all classes equally.',
    minWidth: '9rem',
  },
  'metric:recall_micro': {
    name: 'Recall Micro',
    description:
      'Recall computed on aggregate true positives and false negatives across all classes.',
    minWidth: '9rem',
  },
  'metric:recall_weighted': {
    name: 'Recall Weighted',
    description:
      'Weighted mean of per-class recall, weighted by the number of samples in each class.',
    minWidth: '9rem',
  },
  'metric:pac_score': {
    name: formatMetricName('pac_score'),
    acronym: formatMetricName('pac_score'),
    description: 'Probabilistic accuracy score that evaluates prediction confidence calibration.',
    minWidth: '9rem',
  },
  'metric:r2': {
    name: formatMetricName('r2'),
    acronym: formatMetricName('r2'),
    description:
      'The proportion of variance in the target variable that the model explains. A score of 1.0 means the model perfectly predicts the target. A score of 0.0 means the model performs no better than predicting the mean.',
    minWidth: '8rem',
  },
  'metric:mean_absolute_error': {
    name: 'Mean Absolute Error (MAE)',
    acronym: formatMetricName('mean_absolute_error'),
    description: 'Average of absolute differences between the actual values and predicted values.',
    minWidth: '9rem',
  },
  'metric:mean_squared_error': {
    name: 'Mean Squared Error (MSE)',
    acronym: formatMetricName('mean_squared_error'),
    description: 'Measures the average squared difference between the actual and predicted values.',
    minWidth: '9rem',
  },
  'metric:root_mean_squared_error': {
    name: 'Root Mean Squared Error (RMSE)',
    acronym: formatMetricName('root_mean_squared_error'),
    description:
      'Square root of the mean of the squared differences between the actual values and predicted values.',
    minWidth: '9rem',
  },
  'metric:median_absolute_error': {
    name: 'Median Absolute Error (MedAE)',
    acronym: formatMetricName('median_absolute_error'),
    description: 'The median of all absolute differences between actual and predicted values.',
    minWidth: '9rem',
  },
  'metric:pearsonr': {
    name: 'Pearson r',
    acronym: formatMetricName('pearsonr'),
    description:
      'Measures the linear correlation between predicted and actual values. Ranges from -1 (perfect negative correlation) to +1 (perfect positive correlation), with 0 indicating no linear relationship.',
    minWidth: '9rem',
  },
  'metric:mean_absolute_percentage_error': {
    name: 'Mean Absolute Percentage Error (MAPE)',
    acronym: formatMetricName('mean_absolute_percentage_error'),
    description:
      'The average of absolute percentage errors between predicted and actual values. Expresses prediction accuracy as a percentage, making it easy to interpret across different scales.',
    minWidth: '9rem',
  },
  'metric:mean_absolute_scaled_error': {
    name: 'Mean Absolute Scaled Error (MASE)',
    acronym: formatMetricName('mean_absolute_scaled_error'),
    description:
      'A scale-independent measure of forecast accuracy. A MASE absolute value below 1.0 means the model outperforms a naive baseline forecast. Lower values indicate better performance.',
    minWidth: '9rem',
  },
  'metric:root_mean_squared_logarithmic_error': {
    name: 'Root Mean Squared Logarithmic Error (RMSLE)',
    acronym: formatMetricName('root_mean_squared_logarithmic_error'),
    description:
      'Square root of the mean of the squared differences between the log of actual values and the log of predicted values. Useful when target values span a wide range.',
    minWidth: '9rem',
  },
  'metric:root_mean_squared_scaled_error': {
    name: 'Root Mean Squared Scaled Error (RMSSE)',
    acronym: formatMetricName('root_mean_squared_scaled_error'),
    description:
      'A scale-independent error metric that normalizes RMSE by the in-sample naive forecast error. A value below 1.0 means the model outperforms a naive one-step-ahead baseline.',
    minWidth: '9rem',
  },
  'metric:symmetric_mean_absolute_percentage_error': {
    name: 'Symmetric Mean Absolute Percentage Error (SMAPE)',
    acronym: formatMetricName('symmetric_mean_absolute_percentage_error'),
    description:
      'Symmetric mean absolute percentage error (SMAPE or sMAPE). At each fitted point, the absolute difference between actual value and predicted value is divided by half the sum of absolute actual value and predicted value, and then average all such values across all the fitted points.',
    minWidth: '9rem',
  },
  'metric:scaled_quantile_loss': {
    name: 'Scaled Quantile Loss (SQL)',
    acronym: formatMetricName('scaled_quantile_loss'),
    description:
      'Measures the accuracy of probabilistic forecasts at specific quantiles, scaled relative to the total absolute values of the target. Lower values indicate better calibrated prediction intervals.',
    minWidth: '9rem',
  },
  'metric:weighted_absolute_percentage_error': {
    name: 'Weighted Absolute Percentage Error (WAPE)',
    acronym: formatMetricName('weighted_absolute_percentage_error'),
    description:
      'The sum of absolute errors divided by the sum of absolute actual values. Unlike MAPE, it handles zero actual values gracefully and gives more weight to larger observations.',
    minWidth: '9rem',
  },
  'metric:weighted_quantile_loss': {
    name: 'Weighted Quantile Loss (WQL)',
    acronym: formatMetricName('weighted_quantile_loss'),
    description:
      'A weighted average of quantile losses across multiple quantiles, measuring the overall quality of probabilistic forecasts. Lower values indicate better prediction interval coverage.',
    minWidth: '9rem',
  },
};

// Safe accessor — COLUMN_META is typed as Record<string, …> so TS believes every
// key returns a value, but at runtime dynamic metric keys may be absent.
// Helper to resolve display name for any column id
const getColumnName = (id: string, fallbackLabel: string): string =>
  getColumnMeta(id)?.name ?? fallbackLabel;

// Resolve display text for a column header: acronym → name → fallback
const getColumnHeader = (id: string, fallback?: string): string =>
  getColumnMeta(id)?.acronym ?? getColumnMeta(id)?.name ?? fallback ?? id;

const getColumnMeta = (id: string): ColumnMeta | undefined =>
  id in COLUMN_META ? COLUMN_META[id] : undefined;

const getColumnInfoProps = (
  columnId: string,
  tooltipName?: string,
  suffix?: string,
): ThProps['info'] | undefined => {
  const meta = getColumnMeta(columnId);
  const name = tooltipName ?? meta?.name;
  const description = meta?.description;
  if (!description && !meta?.acronym && !suffix) {
    return undefined;
  }
  return {
    popover: (
      <>
        {name && <strong>{name}</strong>}
        {name && description && ': '}
        {description}
        {suffix && ` ${suffix}`}
      </>
    ),
  };
};

const MetricCell: React.FC<{ value: number | string }> = ({ value }) => (
  <Tooltip content={String(value)}>
    <span>{formatMetricValue(value)}</span>
  </Tooltip>
);

type AutomlLeaderboardProps = {
  onViewDetails?: (modelName: string, rank: number) => void;
  onClickSaveNotebook?: (modelName: string) => void;
  onRegisterModel?: (modelName: string) => void;
};

function AutomlLeaderboard({
  onViewDetails,
  onClickSaveNotebook,
  onRegisterModel,
}: AutomlLeaderboardProps): React.JSX.Element | null {
  const { namespace, runId } = useParams<{ namespace: string; runId: string }>();
  const {
    models,
    parameters,
    modelsLoading,
    modelsError,
    onRetryModels,
    pipelineRun,
    pipelineRunLoading,
    bestModelKey,
  } = useAutomlResultsContext();
  // FYI default taskType to timeseries since it is the only task which will not have
  // this as an actual parameter passed to the pipeline
  const taskType = parameters?.task_type ?? 'timeseries';

  // Sorting state
  const [activeSort, setActiveSort] = React.useState<{
    id: string;
    direction: 'asc' | 'desc';
  }>({ id: 'rank', direction: 'asc' });

  // Check if pipeline is still running
  const pipelineRunning = isRunInProgress(pipelineRun?.state);

  // Determine the optimized metric (prefer the user's choice, fall back to task-type default)
  const optimizedMetric = resolveEvalMetric(parameters?.eval_metric, taskType);

  // Extract all unique metric keys across all models
  const metricKeys = React.useMemo(() => {
    const keysSet = new Set<string>();
    Object.values(models).forEach((model: AutomlModel) => {
      // Defensive check: verify metrics and test_data are non-null plain objects (not arrays)
      const testData =
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        model.metrics &&
        typeof model.metrics === 'object' &&
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        !Array.isArray(model.metrics) &&
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        model.metrics.test_data &&
        typeof model.metrics.test_data === 'object' &&
        !Array.isArray(model.metrics.test_data)
          ? model.metrics.test_data
          : {};
      Object.keys(testData).forEach((key) => {
        keysSet.add(key.toLowerCase());
      });
    });
    return Array.from(keysSet).toSorted();
  }, [models]);

  // Metric keys excluding the optimized metric (shown in sticky column)
  const nonOptimizedMetricKeys = React.useMemo(
    () => metricKeys.filter((key) => key.toLowerCase() !== optimizedMetric.toLowerCase()),
    [metricKeys, optimizedMetric],
  );

  // Column definitions — source of truth for column IDs, labels, and default order
  const columnDefs = React.useMemo<{ id: string; label: string }[]>(
    () => [
      { id: 'rank', label: 'Rank' },
      { id: 'model', label: 'Model name' },
      {
        id: 'optimized-metric',
        label: `${formatMetricName(optimizedMetric)} (optimized)`,
      },
      ...nonOptimizedMetricKeys.map((key) => ({
        id: `metric:${key}`,
        label: getColumnName(`metric:${key}`, formatMetricName(key)),
      })),
    ],
    [nonOptimizedMetricKeys, optimizedMetric],
  );

  // Column visibility and ordering state — whitelist approach so new columns are hidden by default
  const DEFAULT_VISIBLE_IDS = React.useMemo(
    () => new Set(['rank', 'model', 'optimized-metric']),
    [],
  );
  const [visibleColumnIds, setVisibleColumnIds] = React.useState<Set<string>>(
    () => new Set(DEFAULT_VISIBLE_IDS),
  );
  const [columnOrder, setColumnOrder] = React.useState<string[] | null>(null);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = React.useState(false);

  // Default columns in original order with default visibility — used by "Reset to default"
  const defaultColumns: ColumnManagementModalColumn[] = React.useMemo(
    () =>
      columnDefs.map((col) => ({
        key: col.id,
        title: col.label,
        isShownByDefault: DEFAULT_VISIBLE_IDS.has(col.id),
        isShown: DEFAULT_VISIBLE_IDS.has(col.id),
      })),
    [columnDefs, DEFAULT_VISIBLE_IDS],
  );

  // Bridge to ManageColumnsModal format — preserves user's drag order
  const managedColumns: ColumnManagementModalColumn[] = React.useMemo(() => {
    let ordered = columnDefs;
    if (columnOrder) {
      const orderMap = new Map(columnOrder.map((key, i) => [key, i]));
      ordered = columnDefs.toSorted(
        (a, b) =>
          (orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
          (orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER),
      );
    }

    return ordered.map((col) => ({
      key: col.id,
      title: col.label,
      isShownByDefault: DEFAULT_VISIBLE_IDS.has(col.id),
      isShown: visibleColumnIds.has(col.id),
    }));
  }, [columnDefs, visibleColumnIds, columnOrder, DEFAULT_VISIBLE_IDS]);

  const handleApplyColumns = React.useCallback((newColumns: ColumnManagementModalColumn[]) => {
    const newVisibleIds = new Set<string>();
    newColumns.forEach((col) => {
      if (col.isShown) {
        newVisibleIds.add(col.key);
      }
    });
    setVisibleColumnIds(newVisibleIds);
    setColumnOrder(newColumns.map((col) => col.key));

    // Reset sort to the first visible column if the currently sorted column is being hidden
    const fallbackSortId = newColumns.find((col) => col.isShown)?.key ?? 'rank';
    setActiveSort((prev) =>
      newVisibleIds.has(prev.id) ? prev : { id: fallbackSortId, direction: 'asc' },
    );
  }, []);

  // All visible columns in user order, used for both header and body rendering
  const visibleColumns = React.useMemo(() => {
    let ordered = columnDefs;
    if (columnOrder) {
      const orderMap = new Map(columnOrder.map((key, i) => [key, i]));
      ordered = columnDefs.toSorted(
        (a, b) =>
          (orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
          (orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER),
      );
    }
    return ordered.filter((col) => visibleColumnIds.has(col.id));
  }, [columnDefs, visibleColumnIds, columnOrder]);

  // Column IDs in render order (visible only) — bridges PF's numeric sort index API
  const sortableColumnIds = React.useMemo(
    () => visibleColumns.map((col) => col.id),
    [visibleColumns],
  );

  // Transform models into LeaderboardEntry array
  const data: LeaderboardEntry[] = React.useMemo(() => {
    const entries = Object.entries(models).map(([modelName, model]: [string, AutomlModel]) => {
      // Defensive check: verify metrics and test_data are non-null plain objects (not arrays)
      const testData =
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        model.metrics &&
        typeof model.metrics === 'object' &&
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        !Array.isArray(model.metrics) &&
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        model.metrics.test_data &&
        typeof model.metrics.test_data === 'object' &&
        !Array.isArray(model.metrics.test_data)
          ? model.metrics.test_data
          : {};
      const testDataLookup = Object.fromEntries(
        Object.entries(testData).map(([k, v]) => [k.toLowerCase(), v]),
      );

      const getMetricValue = (metricName: string): number | string => {
        const value = testDataLookup[metricName.toLowerCase()];

        if (typeof value === 'number' && Number.isFinite(value)) {
          return value;
        }
        return 'N/A';
      };

      // Build metrics object with all available metrics
      const metrics: Record<string, number | string> = {};
      metricKeys.forEach((key) => {
        metrics[key] = getMetricValue(key);
      });

      const optimizedMetricValue = getMetricValue(optimizedMetric);

      return {
        rank: 0, // Will be assigned after sorting by optimized metric initially
        modelKey: modelName,
        displayName: model.name || modelName,
        metrics,
        optimizedMetricValue,
      };
    });

    // Rank by optimized metric, reserving rank 1 for the pipeline best_model when available.
    const entryByKey = Object.fromEntries(entries.map((entry) => [entry.modelKey, entry]));
    const orderedModelKeys = orderModelsByLeaderboardRank(
      entries.map((entry) => entry.modelKey),
      (modelKey) => entryByKey[modelKey].optimizedMetricValue,
      bestModelKey,
    );

    const rankedEntries = orderedModelKeys.map((modelKey, index) => ({
      ...entryByKey[modelKey],
      rank: index + 1,
    }));

    // Apply user-selected sorting
    if (activeSort.id === 'rank') {
      return rankedEntries.toSorted((a, b) =>
        activeSort.direction === 'asc' ? a.rank - b.rank : b.rank - a.rank,
      );
    }
    if (activeSort.id === 'model') {
      return rankedEntries.toSorted((a, b) => {
        const comparison = a.displayName.localeCompare(b.displayName);
        return activeSort.direction === 'asc' ? comparison : -comparison;
      });
    }

    // Sort by metric column (optimized or non-optimized)
    if (activeSort.id === 'optimized-metric' || activeSort.id.startsWith('metric:')) {
      const metricKey =
        activeSort.id === 'optimized-metric' ? null : activeSort.id.slice('metric:'.length);
      return rankedEntries.toSorted((a, b) => {
        const aVal = metricKey ? a.metrics[metricKey] : a.optimizedMetricValue;
        const bVal = metricKey ? b.metrics[metricKey] : b.optimizedMetricValue;

        // N/A always sorts last regardless of direction
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
        const comparison = aNum - bNum;
        return activeSort.direction === 'asc' ? comparison : -comparison;
      });
    }

    return rankedEntries;
  }, [models, metricKeys, optimizedMetric, activeSort, bestModelKey]);

  // Memoized sort callback - stable reference shared by all columns
  const handleSort = React.useCallback(
    (_event: React.MouseEvent, index: number, direction: 'asc' | 'desc') => {
      setActiveSort((prev) => ({
        id: sortableColumnIds[index] || prev.id,
        direction,
      }));
    },
    [sortableColumnIds],
  );

  // Helper function to get sort params for a column
  const getSortParams = React.useCallback(
    (columnId: string): ThProps['sort'] => {
      const activeSortIndex = sortableColumnIds.indexOf(activeSort.id);
      return {
        sortBy: {
          index: activeSortIndex >= 0 ? activeSortIndex : 0,
          direction: activeSort.direction,
        },
        onSort: handleSort,
        columnIndex: sortableColumnIds.indexOf(columnId),
      };
    },
    [sortableColumnIds, activeSort, handleSort],
  );

  // Presets hidden for AutoML until there are meaningful preset groups
  // const columnPresets: ColumnPreset[] = React.useMemo(() => {
  //   const leadingKeys = ['rank', 'model', 'optimized-metric'];
  //   const metricColumnKeys = nonOptimizedMetricKeys.map((key) => `metric:${key}`);
  //   return [{ label: 'All metrics', visibleColumnKeys: [...leadingKeys, ...metricColumnKeys] }];
  // }, [nonOptimizedMetricKeys]);

  // Handler for viewing model details
  const handleViewDetails = (modelName: string, rank: number) => {
    if (onViewDetails) {
      onViewDetails(modelName, rank);
    }
  };

  // -- Column render helpers (used in the unified column loop) --

  const getHeaderTestId = (colId: string): string | undefined => {
    if (colId === 'rank') {
      return 'rank-header';
    }
    if (colId === 'model') {
      return 'model-name-header';
    }
    if (colId === 'optimized-metric') {
      return `metric-header-${optimizedMetric}`;
    }
    if (colId.startsWith('metric:')) {
      return `metric-header-${colId.slice('metric:'.length)}`;
    }
    return undefined;
  };

  const getCellTestId = (colId: string, rank: number): string | undefined => {
    if (colId === 'rank') {
      return `rank-${rank}`;
    }
    if (colId === 'model') {
      return `model-name-${rank}`;
    }
    if (colId === 'optimized-metric') {
      return `metric-${optimizedMetric}-${rank}`;
    }
    if (colId.startsWith('metric:')) {
      return `metric-${colId.slice('metric:'.length)}-${rank}`;
    }
    return undefined;
  };

  const renderHeaderContent = (col: { id: string; label: string }): React.ReactNode => {
    if (col.id === 'optimized-metric') {
      return (
        <>
          {getColumnHeader(`metric:${optimizedMetric}`, formatMetricName(optimizedMetric))}{' '}
          <span
            data-testid="optimized-indicator"
            className="automl-leaderboard__optimized-indicator"
          >
            (optimized)
          </span>
        </>
      );
    }
    return getColumnHeader(col.id, col.label);
  };

  const getHeaderInfoProps = (colId: string): ThProps['info'] | undefined => {
    if (colId === 'optimized-metric') {
      const metricName =
        getColumnMeta(`metric:${optimizedMetric}`)?.name ?? formatMetricName(optimizedMetric);
      const hasBrackets = metricName.includes('(');
      return getColumnInfoProps(
        `metric:${optimizedMetric}`,
        `${metricName} ${hasBrackets ? '[optimized]' : '(optimized)'}`,
        'AutoML prioritized performance of this metric and used it to rank models.',
      );
    }
    return getColumnInfoProps(colId);
  };

  const renderCellContent = (col: { id: string }, entry: LeaderboardEntry): React.ReactNode => {
    if (col.id === 'rank') {
      return entry.rank === 1 ? (
        <Label color="teal" icon={<StarIcon />} data-testid="top-rank-label">
          {entry.rank}
        </Label>
      ) : (
        entry.rank
      );
    }
    if (col.id === 'model') {
      return (
        <Button
          variant="link"
          isInline
          onClick={() => handleViewDetails(entry.modelKey, entry.rank)}
          data-testid={`model-link-${entry.rank}`}
        >
          {entry.displayName}
        </Button>
      );
    }
    if (col.id === 'optimized-metric') {
      return <MetricCell value={entry.optimizedMetricValue} />;
    }
    if (col.id.startsWith('metric:')) {
      const metricKey = col.id.slice('metric:'.length);
      return <MetricCell value={entry.metrics[metricKey]} />;
    }
    return null;
  };

  // Show empty state when pipeline is still running
  if (pipelineRunning) {
    if (!namespace) {
      return null;
    }
    return <AutomlRunInProgress namespace={namespace} />;
  }

  // Show loading state with 5 rows and 8 columns
  if (pipelineRunLoading || modelsLoading) {
    return (
      <Card>
        <CardBody>
          <Content component={ContentVariants.h3}>Results</Content>
          <Table
            aria-label="AutoML Model Leaderboard"
            variant="compact"
            data-testid="leaderboard-loading"
          >
            <Thead>
              <Tr>
                {Array.from({ length: 8 }).map((__, colIndex) => (
                  <Th key={colIndex}>
                    <Skeleton />
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {Array.from({ length: 5 }).map((__, rowIndex) => (
                <Tr key={rowIndex}>
                  {Array.from({ length: 8 }).map((_, colIndex) => (
                    <Td key={colIndex}>
                      <Skeleton />
                    </Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    );
  }

  // Show error state when model fetching failed
  if (modelsError) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="Unable to fetch models"
          status="danger"
          variant={EmptyStateVariant.sm}
          data-testid="leaderboard-error"
        >
          <EmptyStateBody>An error occurred while loading model results.</EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button variant="link" onClick={onRetryModels}>
                Retry
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      </Bullseye>
    );
  }

  // Show empty state when no models were produced
  if (Object.keys(models).length === 0) {
    const isRunSucceeded = pipelineRun?.state === RuntimeStateKF.SUCCEEDED;
    const isRunFailed =
      pipelineRun?.state === RuntimeStateKF.FAILED ||
      pipelineRun?.state === RuntimeStateKF.CANCELED;

    // Helper to render message with pipeline run link (falls back to plain text when route params are missing)
    const messageWithLink = (before: string, linkText: string, after = '.') =>
      namespace && runId ? (
        <>
          <span>{before} </span>
          <Button
            variant="link"
            isInline
            component={(props) => (
              <Link {...props} to={`/develop-train/pipelines/runs/${namespace}/runs/${runId}`} />
            )}
          >
            {linkText}
          </Button>
          <span>{after}</span>
        </>
      ) : (
        `${before} ${linkText}${after}`
      );

    let messageContent: React.ReactNode;
    if (!pipelineRun) {
      messageContent = messageWithLink(
        'Unable to determine pipeline run status. Please check the',
        'pipeline configuration and logs',
      );
    } else if (isRunFailed) {
      messageContent = messageWithLink(
        'The pipeline run did not complete successfully. Please check the',
        'pipeline configuration and logs',
        ' for errors.',
      );
    } else if (isRunSucceeded) {
      messageContent = messageWithLink(
        'The pipeline run completed but did not generate any models. Please check the',
        'pipeline configuration and logs',
      );
    } else {
      // SKIPPED, PAUSED, CACHED, RUNTIME_STATE_UNSPECIFIED, or other unexpected states
      messageContent = messageWithLink(
        'The pipeline run is in an unexpected state. Please check the',
        'pipeline status and logs',
      );
    }

    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          titleText="No models produced"
          variant={EmptyStateVariant.sm}
          data-testid="leaderboard-empty"
        >
          <EmptyStateBody>{messageContent}</EmptyStateBody>
        </EmptyState>
      </Bullseye>
    );
  }

  return (
    <Card>
      <CardBody>
        <Content component={ContentVariants.h3}>Results</Content>
        <Toolbar hasNoPadding>
          <ToolbarContent alignItems="center">
            <ToolbarItem>
              <Content component={ContentVariants.small} data-testid="columns-selected-count">
                {visibleColumns.length}/{columnDefs.length} columns selected
              </Content>
            </ToolbarItem>
            <ToolbarItem>
              <Button
                variant="link"
                icon={<ColumnsIcon />}
                onClick={() => setIsManageColumnsOpen(true)}
                data-testid="manage-columns-button"
              >
                Manage columns
              </Button>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
        <InnerScrollContainer>
          <Table
            aria-label="AutoML Model Leaderboard"
            variant="compact"
            data-testid="leaderboard-table"
            className="automl-leaderboard"
            isStickyHeader
          >
            <Thead>
              <Tr>
                {visibleColumns.map((col) => {
                  const colMeta = getColumnMeta(
                    col.id === 'optimized-metric' ? `metric:${optimizedMetric}` : col.id,
                  );
                  return (
                    <Th
                      key={col.id}
                      sort={getSortParams(col.id)}
                      info={getHeaderInfoProps(col.id)}
                      data-testid={getHeaderTestId(col.id)}
                      className={col.id === 'rank' ? 'automl-leaderboard__rank-cell' : undefined}
                      style={colMeta?.minWidth ? { minWidth: colMeta.minWidth } : undefined}
                    >
                      {renderHeaderContent(col)}
                    </Th>
                  );
                })}
                <Th
                  screenReaderText="Actions"
                  isStickyColumn
                  hasLeftBorder
                  stickyMinWidth="50px"
                  stickyRightOffset="0"
                />
              </Tr>
            </Thead>
            <Tbody>
              {data.map((entry) => (
                <Tr key={entry.rank} data-testid={`leaderboard-row-${entry.rank}`}>
                  {visibleColumns.map((col) => (
                    <Td
                      key={col.id}
                      dataLabel={col.label}
                      data-testid={getCellTestId(col.id, entry.rank)}
                      className={col.id === 'rank' ? 'automl-leaderboard__rank-cell' : undefined}
                    >
                      {renderCellContent(col, entry)}
                    </Td>
                  ))}
                  <Td
                    isActionCell
                    isStickyColumn
                    hasLeftBorder
                    stickyMinWidth="50px"
                    stickyRightOffset="0"
                  >
                    <ActionsColumn
                      items={[
                        {
                          title: 'View details',
                          onClick: () => handleViewDetails(entry.modelKey, entry.rank),
                        },
                        {
                          title: 'Register model',
                          onClick: () => {
                            onRegisterModel?.(entry.modelKey);
                          },
                        },
                        {
                          title: 'Save notebook',
                          onClick: () => {
                            onClickSaveNotebook?.(entry.modelKey);
                          },
                        },
                      ]}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </InnerScrollContainer>
      </CardBody>
      <ManageColumnsModal
        isOpen={isManageColumnsOpen}
        onClose={() => setIsManageColumnsOpen(false)}
        appliedColumns={managedColumns}
        defaultColumns={defaultColumns}
        applyColumns={handleApplyColumns}
        /* presets={columnPresets} — hidden until AutoML has meaningful preset groups */
      />
    </Card>
  );
}

export default AutomlLeaderboard;
