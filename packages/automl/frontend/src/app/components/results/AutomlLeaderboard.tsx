import {
  ActionsColumn,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  type ThProps,
} from '@patternfly/react-table';
import { StarIcon } from '@patternfly/react-icons';
import { Button, Label, Skeleton, Tooltip } from '@patternfly/react-core';
import React from 'react';
import { useParams } from 'react-router';
import { useAutomlResultsContext, type AutomlModel } from '~/app/context/AutomlResultsContext';
import { getOptimizedMetricForTask } from '~/app/utilities/utils';
import { RuntimeStateKF } from '~/app/types/pipeline';
import AutomlRunInProgress from '~/app/components/empty-states/AutomlRunInProgress';

type LeaderboardEntry = {
  rank: number;
  model: string;
  metrics: Record<string, number | string>;
  optimizedMetricValue: number | string;
};

// Helper function to format metric names for display
const formatMetricName = (metricKey: string): string => {
  // Special cases for common acronyms
  /* eslint-disable camelcase */
  const specialCases: Record<string, string> = {
    roc_auc: 'ROC AUC',
    mcc: 'MCC',
    f1: 'F1',
    r2: 'R²',
    mae: 'MAE',
    mse: 'MSE',
    rmse: 'RMSE',
    mape: 'MAPE',
    smape: 'SMAPE',
  };
  /* eslint-enable camelcase */

  if (specialCases[metricKey]) {
    return specialCases[metricKey];
  }

  // Convert snake_case to Title Case
  return metricKey
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper function to format metric values for display
const formatMetricValue = (value: number | string): string => {
  if (typeof value === 'string') {
    return value;
  }
  // If the value would round to 0.000, use scientific notation
  const fixed = value.toFixed(3);
  if (fixed === '0.000' || fixed === '-0.000') {
    return value.toExponential(3);
  }
  return fixed;
};

type AutomlLeaderboardProps = {
  onViewDetails?: (modelName: string, rank: number) => void;
  onClickSaveNotebook?: (modelName: string) => void;
};

function AutomlLeaderboard({
  onViewDetails,
  onClickSaveNotebook,
}: AutomlLeaderboardProps): React.JSX.Element {
  const { namespace } = useParams<{ namespace: string }>();
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
  const optimizedMetric = React.useMemo(
    () => getOptimizedMetricForTask(taskType) ?? 'accuracy',
    [taskType],
  );

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
        const value = testData[metricName];
        if (typeof value === 'number' && Number.isFinite(value)) {
          return value;
        }
        if (typeof value === 'string') {
          // Trim whitespace and treat empty strings as invalid
          const trimmed = value.trim();
          if (trimmed === '') {
            return 'N/A';
          }
          // Strict validation: ensure the entire string is a valid number
          const parsed = Number(trimmed);
          return Number.isFinite(parsed) ? parsed : 'N/A';
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
        model: model.display_name || modelName,
        metrics,
        optimizedMetricValue,
      };
    });

    // Initial ranking by optimized metric value
    // Error metrics (smape, mse, mae, etc.) where lower is better
    const errorMetrics = ['smape', 'mse', 'mae', 'rmse', 'mape'];
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
        const comparison = a.model.localeCompare(b.model);
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

  // Helper function to get sort params for a column
  const getSortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy: {
      index: activeSortIndex,
      direction: activeSortDirection,
    },
    onSort: (_event, index, direction) => {
      setActiveSortIndex(index);
      setActiveSortDirection(direction);
    },
    columnIndex,
  });

  // Handler for viewing model details
  const handleViewDetails = (modelName: string, rank: number) => {
    if (onViewDetails) {
      onViewDetails(modelName, rank);
    }
  };

  // Show empty state when pipeline is still running
  if (pipelineRunning) {
    return <AutomlRunInProgress namespace={namespace!} />;
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
      <Table
        aria-label="AutoML Model Leaderboard"
        variant="compact"
        data-testid="leaderboard-empty"
      >
        <Thead>
          <Tr>
            <Th>No models produced</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>
              The pipeline run completed but did not generate any models. Please check the pipeline
              configuration and logs.
            </Td>
          </Tr>
        </Tbody>
      </Table>
    );
  }

  return (
    <Table aria-label="AutoML Model Leaderboard" variant="compact" data-testid="leaderboard-table">
      <Thead>
        <Tr>
          <Th sort={getSortParams(0)} data-testid="rank-header">
            Rank
          </Th>
          <Th sort={getSortParams(1)} data-testid="model-name-header">
            Model name
          </Th>
          {metricKeys.map((metricKey, index) => (
            <Th
              key={metricKey}
              sort={getSortParams(index + 2)}
              data-testid={`metric-header-${metricKey}`}
            >
              {formatMetricName(metricKey)}
              {metricKey === optimizedMetric ? (
                <span data-testid="optimized-indicator"> (optimized)</span>
              ) : (
                ''
              )}
            </Th>
          ))}
          <Th screenReaderText="Actions" />
        </Tr>
      </Thead>
      <Tbody>
        {data.map((entry) => (
          <Tr key={entry.rank} data-testid={`leaderboard-row-${entry.rank}`}>
            <Td dataLabel="Rank" data-testid={`rank-${entry.rank}`}>
              {entry.rank === 1 ? (
                <Label color="teal" icon={<StarIcon />} data-testid="top-rank-label">
                  {entry.rank}
                </Label>
              ) : (
                entry.rank
              )}
            </Td>
            <Td dataLabel="Model" data-testid={`model-name-${entry.rank}`}>
              <Button
                variant="link"
                isInline
                onClick={() => handleViewDetails(entry.model, entry.rank)}
                data-testid={`model-link-${entry.rank}`}
              >
                {entry.model}
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
            <Td isActionCell>
              <ActionsColumn
                items={[
                  {
                    title: 'View details',
                    onClick: () => handleViewDetails(entry.model, entry.rank),
                  },
                  {
                    title: 'Register model',
                    onClick: () => {
                      // TODO: Implement register model
                    },
                  },
                  {
                    title: 'Save notebook',
                    onClick: () => {
                      if (onClickSaveNotebook) {
                        onClickSaveNotebook(entry.model);
                      }
                    },
                  },
                ]}
              />
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

export default AutomlLeaderboard;
