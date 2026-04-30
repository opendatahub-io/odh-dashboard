import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Label,
  Skeleton,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import { ColumnsIcon, StarIcon } from '@patternfly/react-icons';
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
import {
  ColumnManagementModal,
  type ColumnManagementModalColumn,
} from '@patternfly/react-component-groups';
import AutomlRunInProgress from '~/app/components/empty-states/AutomlRunInProgress';
import { useAutomlResultsContext, type AutomlModel } from '~/app/context/AutomlResultsContext';
import { RuntimeStateKF } from '~/app/types/pipeline';
import {
  formatMetricName,
  formatMetricValue,
  getOptimizedMetricForTask,
  isRunInProgress,
} from '~/app/utilities/utils';
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
  'metric:f1': {
    name: formatMetricName('f1'),
    acronym: formatMetricName('f1'),
    description:
      'Harmonic average of the precision and recall, with best value of 1 (perfect precision and recall) and worst at 0.',
    minWidth: '8rem',
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
  const { models, parameters, modelsLoading, pipelineRun, pipelineRunLoading } =
    useAutomlResultsContext();
  // FYI default taskType to timeseries since it is the only task which will not have
  // this as an actual parameter passed to the pipeline
  const taskType = parameters?.task_type ?? 'timeseries';

  // Sorting state
  const [activeSortId, setActiveSortId] = React.useState<string>('rank');
  const [activeSortDirection, setActiveSortDirection] = React.useState<'asc' | 'desc'>('asc');

  // Check if pipeline is still running
  const pipelineRunning = isRunInProgress(pipelineRun?.state);

  // Determine the optimized metric
  const optimizedMetric = getOptimizedMetricForTask(taskType);

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

  // Column definitions — source of truth for column IDs, labels, and visibility
  const columnDefs = React.useMemo<{ id: string; label: string; isAlwaysVisible?: boolean }[]>(
    () => [
      { id: 'rank', label: 'Rank', isAlwaysVisible: true },
      { id: 'model', label: 'Model name', isAlwaysVisible: true },
      {
        id: 'optimized-metric',
        label: `${formatMetricName(optimizedMetric)} (optimized)`,
        isAlwaysVisible: true,
      },
      ...nonOptimizedMetricKeys.map((key) => ({
        id: `metric:${key}`,
        label: getColumnName(`metric:${key}`, formatMetricName(key)),
      })),
    ],
    [nonOptimizedMetricKeys, optimizedMetric],
  );

  // Column visibility state
  const [hiddenColumnIds, setHiddenColumnIds] = React.useState<Set<string>>(new Set());
  const [isManageColumnsOpen, setIsManageColumnsOpen] = React.useState(false);

  // Bridge to PF ColumnManagementModal format
  const managedColumns: ColumnManagementModalColumn[] = React.useMemo(
    () =>
      columnDefs.map((col) => ({
        key: col.id,
        title: col.label,
        isShownByDefault: true,
        isShown: !hiddenColumnIds.has(col.id),
        isUntoggleable: 'isAlwaysVisible' in col ? Boolean(col.isAlwaysVisible) : undefined,
      })),
    [columnDefs, hiddenColumnIds],
  );

  const handleApplyColumns = React.useCallback((newColumns: ColumnManagementModalColumn[]) => {
    const newHiddenIds = new Set<string>();
    newColumns.forEach((col) => {
      if (!col.isShown) {
        newHiddenIds.add(col.key);
      }
    });
    setHiddenColumnIds(newHiddenIds);

    // Reset sort to default if the currently sorted column is being hidden
    setActiveSortId((currentId) => {
      if (newHiddenIds.has(currentId)) {
        setActiveSortDirection('asc');
        return 'rank';
      }
      return currentId;
    });
  }, []);

  // Column IDs in render order (visible only) — bridges PF's numeric sort index API
  const sortableColumnIds = React.useMemo(
    () => columnDefs.filter((col) => !hiddenColumnIds.has(col.id)).map((col) => col.id),
    [columnDefs, hiddenColumnIds],
  );

  // Visible non-optimized metric keys for header/body rendering
  const visibleNonOptimizedMetricKeys = React.useMemo(
    () => nonOptimizedMetricKeys.filter((key) => !hiddenColumnIds.has(`metric:${key}`)),
    [nonOptimizedMetricKeys, hiddenColumnIds],
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

    // Initial ranking by optimized metric value (higher is better).
    // AutoGluon negates error/loss metrics so all metrics are uniformly "higher is better".
    const sortedByMetric = entries.toSorted((a, b) => {
      const aVal = a.optimizedMetricValue;
      const bVal = b.optimizedMetricValue;

      // N/A always sorts last
      if (aVal === 'N/A' && bVal === 'N/A') {
        return 0;
      }
      if (aVal === 'N/A') {
        return 1;
      }
      if (bVal === 'N/A') {
        return -1;
      }

      // Both are numbers — descending (higher is better)
      const aNum = typeof aVal === 'number' ? aVal : 0;
      const bNum = typeof bVal === 'number' ? bVal : 0;
      return bNum - aNum;
    });

    // Assign initial rank
    const rankedEntries = sortedByMetric.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    // Apply user-selected sorting
    if (activeSortId === 'rank') {
      return rankedEntries.toSorted((a, b) =>
        activeSortDirection === 'asc' ? a.rank - b.rank : b.rank - a.rank,
      );
    }
    if (activeSortId === 'model') {
      return rankedEntries.toSorted((a, b) => {
        const comparison = a.displayName.localeCompare(b.displayName);
        return activeSortDirection === 'asc' ? comparison : -comparison;
      });
    }

    // Sort by metric column (optimized or non-optimized)
    if (activeSortId === 'optimized-metric' || activeSortId.startsWith('metric:')) {
      const metricKey =
        activeSortId === 'optimized-metric' ? null : activeSortId.slice('metric:'.length);
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
        return activeSortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return rankedEntries;
  }, [models, metricKeys, optimizedMetric, activeSortId, activeSortDirection]);

  // Memoized sort callback - stable reference shared by all columns
  const handleSort = React.useCallback(
    (_event: React.MouseEvent, index: number, direction: 'asc' | 'desc') => {
      const columnId = sortableColumnIds[index];
      if (columnId) {
        setActiveSortId(columnId);
      }
      setActiveSortDirection(direction);
    },
    [sortableColumnIds],
  );

  // Helper function to get sort params for a column
  const getSortParams = React.useCallback(
    (columnId: string): ThProps['sort'] => {
      const activeSortIndex = sortableColumnIds.indexOf(activeSortId);
      return {
        sortBy: {
          index: activeSortIndex >= 0 ? activeSortIndex : 0,
          direction: activeSortDirection,
        },
        onSort: handleSort,
        columnIndex: sortableColumnIds.indexOf(columnId),
      };
    },
    [sortableColumnIds, activeSortId, activeSortDirection, handleSort],
  );

  // Handler for viewing model details
  const handleViewDetails = (modelName: string, rank: number) => {
    if (onViewDetails) {
      onViewDetails(modelName, rank);
    }
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
    <>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem align={{ default: 'alignEnd' }}>
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
              <Th
                sort={getSortParams('rank')}
                info={getColumnInfoProps('rank')}
                data-testid="rank-header"
                className="automl-leaderboard__rank-cell"
                isStickyColumn
                stickyMinWidth="140px"
                stickyLeftOffset="0"
              >
                {getColumnHeader('rank')}
              </Th>
              <Th
                sort={getSortParams('model')}
                info={getColumnInfoProps('model')}
                data-testid="model-name-header"
                isStickyColumn
                stickyMinWidth="150px"
                stickyLeftOffset="140px"
              >
                {getColumnHeader('model')}
              </Th>
              <Th
                sort={getSortParams('optimized-metric')}
                info={(() => {
                  const metricName =
                    getColumnMeta(`metric:${optimizedMetric}`)?.name ??
                    formatMetricName(optimizedMetric);
                  const hasBrackets = metricName.includes('(');
                  return getColumnInfoProps(
                    `metric:${optimizedMetric}`,
                    `${metricName} ${hasBrackets ? '[optimized]' : '(optimized)'}`,
                    'AutoML prioritized performance of this metric and used it to rank models.',
                  );
                })()}
                data-testid={`metric-header-${optimizedMetric}`}
                isStickyColumn
                hasRightBorder
                stickyMinWidth="150px"
                stickyLeftOffset="290px"
                style={
                  getColumnMeta(`metric:${optimizedMetric}`)?.minWidth
                    ? { minWidth: getColumnMeta(`metric:${optimizedMetric}`)?.minWidth }
                    : undefined
                }
              >
                {getColumnHeader(`metric:${optimizedMetric}`, formatMetricName(optimizedMetric))}{' '}
                <span
                  data-testid="optimized-indicator"
                  className="automl-leaderboard__optimized-indicator"
                >
                  (optimized)
                </span>
              </Th>
              {visibleNonOptimizedMetricKeys.map((metricKey) => {
                const colMeta = getColumnMeta(`metric:${metricKey}`);
                return (
                  <Th
                    key={metricKey}
                    sort={getSortParams(`metric:${metricKey}`)}
                    info={getColumnInfoProps(`metric:${metricKey}`)}
                    data-testid={`metric-header-${metricKey}`}
                    style={colMeta?.minWidth ? { minWidth: colMeta.minWidth } : undefined}
                  >
                    {getColumnHeader(`metric:${metricKey}`, formatMetricName(metricKey))}
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
                <Td
                  dataLabel="Rank"
                  data-testid={`rank-${entry.rank}`}
                  className="automl-leaderboard__rank-cell"
                  isStickyColumn
                  stickyMinWidth="140px"
                  stickyLeftOffset="0"
                >
                  {entry.rank === 1 ? (
                    <Label color="teal" icon={<StarIcon />} data-testid="top-rank-label">
                      {entry.rank}
                    </Label>
                  ) : (
                    entry.rank
                  )}
                </Td>
                <Td
                  dataLabel="Model"
                  data-testid={`model-name-${entry.rank}`}
                  isStickyColumn
                  stickyMinWidth="150px"
                  stickyLeftOffset="140px"
                >
                  <Button
                    variant="link"
                    isInline
                    onClick={() => handleViewDetails(entry.modelKey, entry.rank)}
                    data-testid={`model-link-${entry.rank}`}
                  >
                    {entry.displayName}
                  </Button>
                </Td>
                <Td
                  dataLabel={formatMetricName(optimizedMetric)}
                  data-testid={`metric-${optimizedMetric}-${entry.rank}`}
                  isStickyColumn
                  hasRightBorder
                  stickyMinWidth="150px"
                  stickyLeftOffset="290px"
                >
                  <MetricCell value={entry.optimizedMetricValue} />
                </Td>
                {visibleNonOptimizedMetricKeys.map((metricKey) => (
                  <Td
                    key={metricKey}
                    dataLabel={formatMetricName(metricKey)}
                    data-testid={`metric-${metricKey}-${entry.rank}`}
                  >
                    <MetricCell value={entry.metrics[metricKey]} />
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
      <ColumnManagementModal
        isOpen={isManageColumnsOpen}
        onClose={() => setIsManageColumnsOpen(false)}
        appliedColumns={managedColumns}
        applyColumns={handleApplyColumns}
      />
    </>
  );
}

export default AutomlLeaderboard;
