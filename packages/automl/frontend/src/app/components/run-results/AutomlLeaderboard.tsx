import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Label,
  Skeleton,
  Tooltip,
} from '@patternfly/react-core';
import { StarIcon } from '@patternfly/react-icons';
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
  const [activeSortIndex, setActiveSortIndex] = React.useState<number>(0); // 0 = rank column
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

    // Initial ranking by optimized metric value
    // Error metrics (mase, mse, mae, etc.) where lower is better
    const errorMetrics = ['mase', 'mse', 'mae', 'rmse', 'mape'];
    const isErrorMetric = errorMetrics.includes(optimizedMetric.toLowerCase());

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

      // Both are numbers
      const aNum = typeof aVal === 'number' ? aVal : 0;
      const bNum = typeof bVal === 'number' ? bVal : 0;
      return isErrorMetric
        ? aNum - bNum // Lower is better
        : bNum - aNum; // Higher is better
    });

    // Assign initial rank
    const rankedEntries = sortedByMetric.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    // Apply user-selected sorting
    if (activeSortIndex === 0) {
      // Sort by rank
      return rankedEntries.toSorted((a, b) =>
        activeSortDirection === 'asc' ? a.rank - b.rank : b.rank - a.rank,
      );
    }
    if (activeSortIndex === 1) {
      // Sort by model name
      return rankedEntries.toSorted((a, b) => {
        const comparison = a.displayName.localeCompare(b.displayName);
        return activeSortDirection === 'asc' ? comparison : -comparison;
      });
    }
    // Sort by metric column (index 2+ maps to metricKeys)
    const metricIndex = activeSortIndex - 2;
    const metricKey = metricKeys[metricIndex];
    if (metricKey) {
      return rankedEntries.toSorted((a, b) => {
        const aVal = a.metrics[metricKey];
        const bVal = b.metrics[metricKey];

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

        // Both are numbers
        const aNum = typeof aVal === 'number' ? aVal : 0;
        const bNum = typeof bVal === 'number' ? bVal : 0;
        const comparison = aNum - bNum;
        return activeSortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return rankedEntries;
  }, [models, metricKeys, optimizedMetric, activeSortIndex, activeSortDirection]);

  // Memoized sort callback - stable reference shared by all columns
  const handleSort = React.useCallback(
    (_event: React.MouseEvent, index: number, direction: 'asc' | 'desc') => {
      setActiveSortIndex(index);
      setActiveSortDirection(direction);
    },
    [],
  );

  // Helper function to get sort params for a column
  const getSortParams = React.useCallback(
    (columnIndex: number): ThProps['sort'] => ({
      sortBy: {
        index: activeSortIndex,
        direction: activeSortDirection,
      },
      onSort: handleSort,
      columnIndex,
    }),
    [activeSortIndex, activeSortDirection, handleSort],
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
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          titleText="No models produced"
          variant={EmptyStateVariant.sm}
          data-testid="leaderboard-empty"
        >
          <EmptyStateBody>
            <span>
              The pipeline run completed but did not generate any models. Please check the&nbsp;
            </span>
            <Button
              variant="link"
              isInline
              component={(props) => (
                <Link {...props} to={`/develop-train/pipelines/runs/${namespace}/runs/${runId}`} />
              )}
            >
              pipeline configuration and logs
            </Button>
            <span>.</span>
          </EmptyStateBody>
        </EmptyState>
      </Bullseye>
    );
  }

  return (
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
              sort={getSortParams(0)}
              data-testid="rank-header"
              isStickyColumn
              stickyMinWidth="80px"
              stickyLeftOffset="0"
            >
              Rank
            </Th>
            <Th
              sort={getSortParams(1)}
              data-testid="model-name-header"
              isStickyColumn
              hasRightBorder
              stickyMinWidth="150px"
              stickyLeftOffset="80px"
            >
              Model name
            </Th>
            {metricKeys.map((metricKey, index) => (
              <Th
                key={metricKey}
                sort={getSortParams(index + 2)}
                data-testid={`metric-header-${metricKey}`}
              >
                {formatMetricName(metricKey)}
                {metricKey.toLowerCase() === optimizedMetric.toLowerCase() ? (
                  <span data-testid="optimized-indicator"> (optimized)</span>
                ) : (
                  ''
                )}
              </Th>
            ))}
            <Th
              screenReaderText="Actions"
              isStickyColumn
              hasLeftBorder
              stickyMinWidth="80px"
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
                isStickyColumn
                stickyMinWidth="80px"
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
                hasRightBorder
                stickyMinWidth="150px"
                stickyLeftOffset="80px"
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
              {metricKeys.map((metricKey) => (
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
  );
}

export default AutomlLeaderboard;
