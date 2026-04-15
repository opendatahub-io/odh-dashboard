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
 */
type ColumnMeta = { name: string; description?: string; acronym?: string };
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
  'metric:roc_auc': {
    name: 'Receiver Operating Characteristic (Area Under Curve)',
    acronym: formatMetricName('roc_auc'),
    // description: 'Receiver Operating Characteristic (Area Under Curve)',
  },
  'metric:mcc': {
    name: 'Matthews correlation coefficient (MCC)',
    acronym: formatMetricName('mcc'),
    // description: 'Matthews correlation coefficient (MCC)',
  },
  'metric:f1': {
    name: formatMetricName('f1'),
    acronym: formatMetricName('f1'),
    // description: formatMetricName('f1'),
  },
  'metric:r2': {
    name: formatMetricName('r2'),
    acronym: formatMetricName('r2'),
    // description: formatMetricName('r2'),
  },
  'metric:mae': {
    name: 'Mean Absolute Error (MAE)',
    acronym: formatMetricName('mae'),
    // description: 'Mean Absolute Error (MAE)',
  },
  'metric:mse': {
    name: 'Mean Squared Error (MSE)',
    acronym: formatMetricName('mse'),
    // description: 'Mean Squared Error (MSE)',
  },
  'metric:rmse': {
    name: 'Root Mean Square Error (RMSE)',
    acronym: formatMetricName('rmse'),
    // description: 'Root Mean Square Error (RMSE)',
  },
  'metric:mape': {
    name: 'Mean Absolute Percentage Error (MAPE)',
    acronym: formatMetricName('mape'),
    // description: 'Mean Absolute Percentage Error (MAPE)',
  },
  'metric:mase': {
    name: 'Mean Absolute Scaled Error (MASE)',
    acronym: formatMetricName('mase'),
    // description: 'Mean Absolute Scaled Error (MASE)',
  },
  'metric:rmsle': {
    name: 'Root Mean Squared Logarithmic Error (RMSLE)',
    acronym: formatMetricName('rmsle'),
    // description: 'Root Mean Squared Logarithmic Error (RMSLE)',
  },
  'metric:rmsse': {
    name: 'Root Mean Squared Scaled Error (RMSSE)',
    acronym: formatMetricName('rmsse'),
    // description: 'Root Mean Squared Scaled Error (RMSSE)',
  },
  'metric:smape': {
    name: 'Symmetric Mean Absolute Percentage Error (SMAPE)',
    acronym: formatMetricName('smape'),
    // description: 'Symmetric Mean Absolute Percentage Error (SMAPE)',
  },
  'metric:sql': {
    name: 'Scaled Quantile Loss (SQL)',
    acronym: formatMetricName('sql'),
    // description: 'Scaled Quantile Loss (SQL)',
  },
  'metric:wape': {
    name: 'Weighted Absolute Percentage Error (WAPE)',
    acronym: formatMetricName('wape'),
    // description: 'Weighted Absolute Percentage Error (WAPE)',
  },
  'metric:wql': {
    name: 'Weighted Quantile Loss (WQL)',
    acronym: formatMetricName('wql'),
    // description: 'Weighted Quantile Loss (WQL)',
  },
};

// Safe accessor — COLUMN_META is typed as Record<string, …> so TS believes every
// key returns a value, but at runtime dynamic metric keys may be absent.
const getColumnMeta = (id: string): ColumnMeta | undefined => {
  if (id in COLUMN_META) {
    return COLUMN_META[id];
  }
  // Metric keys from the API may differ in case (e.g. "metric:MASE" vs "metric:mase")
  const lowerId = id.toLowerCase();
  if (lowerId in COLUMN_META) {
    return COLUMN_META[lowerId];
  }
  return undefined;
};

const ColumnHeaderContent: React.FC<{
  columnId: string;
  tooltipName?: string;
  children: React.ReactNode;
}> = ({ columnId, tooltipName, children }) => {
  const meta = getColumnMeta(columnId);
  const name = tooltipName ?? meta?.name ?? children;
  const description = meta?.description;
  return (
    <Tooltip
      content={
        <div>
          <div className="pf-v6-u-font-weight-bold">{name}</div>
          {description && <div className="pf-v6-u-font-size-xs pf-v6-u-mt-xs">{description}</div>}
        </div>
      }
    >
      <span>{children}</span>
    </Tooltip>
  );
};

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
  const pipelineRunning =
    pipelineRun?.state === RuntimeStateKF.PENDING ||
    pipelineRun?.state === RuntimeStateKF.RUNNING ||
    pipelineRun?.state === RuntimeStateKF.CANCELING;

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
        keysSet.add(key);
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
        label: formatMetricName(key),
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
        isUntoggleable: col.isAlwaysVisible,
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
      // Helper to get metric value from test_data
      const getMetricValue = (metricName: string): number | string => {
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

        // Case-insensitive metric lookup
        const metricKey = Object.keys(testData).find(
          (key) => key.toLowerCase() === metricName.toLowerCase(),
        );
        const value = metricKey ? testData[metricKey] : undefined;

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
                data-testid="rank-header"
                className="automl-leaderboard__rank-cell"
                isStickyColumn
                stickyMinWidth="120px"
                stickyLeftOffset="0"
              >
                <ColumnHeaderContent columnId="rank">Rank</ColumnHeaderContent>
              </Th>
              <Th
                sort={getSortParams('model')}
                data-testid="model-name-header"
                isStickyColumn
                stickyMinWidth="150px"
                stickyLeftOffset="120px"
              >
                <ColumnHeaderContent columnId="model">Model name</ColumnHeaderContent>
              </Th>
              <Th
                sort={getSortParams('optimized-metric')}
                data-testid={`metric-header-${optimizedMetric}`}
                isStickyColumn
                hasRightBorder
                stickyMinWidth="150px"
                stickyLeftOffset="270px"
              >
                <ColumnHeaderContent
                  columnId={`metric:${optimizedMetric}`}
                  tooltipName={`${
                    getColumnMeta(`metric:${optimizedMetric}`)?.name ??
                    formatMetricName(optimizedMetric)
                  } (optimized)`}
                >
                  {getColumnMeta(`metric:${optimizedMetric}`)?.acronym ??
                    formatMetricName(optimizedMetric)}
                  <div
                    data-testid="optimized-indicator"
                    className="automl-leaderboard__optimized-indicator"
                  >
                    (optimized)
                  </div>
                </ColumnHeaderContent>
              </Th>
              {visibleNonOptimizedMetricKeys.map((metricKey) => (
                <Th
                  key={metricKey}
                  sort={getSortParams(`metric:${metricKey}`)}
                  data-testid={`metric-header-${metricKey}`}
                >
                  <ColumnHeaderContent columnId={`metric:${metricKey}`}>
                    {getColumnMeta(`metric:${metricKey}`)?.acronym ?? formatMetricName(metricKey)}
                  </ColumnHeaderContent>
                </Th>
              ))}
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
                  stickyMinWidth="120px"
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
                  stickyLeftOffset="120px"
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
                  stickyLeftOffset="270px"
                >
                  <Tooltip content={String(entry.optimizedMetricValue)}>
                    <span>{formatMetricValue(entry.optimizedMetricValue)}</span>
                  </Tooltip>
                </Td>
                {visibleNonOptimizedMetricKeys.map((metricKey) => (
                  <Td
                    key={metricKey}
                    dataLabel={formatMetricName(metricKey)}
                    data-testid={`metric-${metricKey}-${entry.rank}`}
                  >
                    <Tooltip content={String(entry.metrics[metricKey])}>
                      <span>{formatMetricValue(entry.metrics[metricKey])}</span>
                    </Tooltip>
                  </Td>
                ))}
                <Td
                  isActionCell
                  isStickyColumn
                  hasLeftBorder
                  stickyMinWidth="80px"
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
