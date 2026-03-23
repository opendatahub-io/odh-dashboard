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
import { useAutoragResultsContext, type AutoragPattern } from '~/app/context/AutoragResultsContext';
import { getOptimizedMetricForRAG } from '~/app/utilities/utils';
import { RuntimeStateKF } from '~/app/types/pipeline';
import AutoragRunInProgress from '~/app/components/empty-states/AutoragRunInProgress';

type LeaderboardEntry = {
  rank: number;
  pattern: string;
  metrics: Record<string, { mean: number; ci_high: number; ci_low: number }>;
  optimizedMetricValue: number;
};

// Helper function to format metric names for display
const formatMetricName = (metricKey: string): string => {
  // Special cases for RAG metrics
  /* eslint-disable camelcase */
  const specialCases: Record<string, string> = {
    faithfulness: 'Faithfulness',
    answer_correctness: 'Answer Correctness',
    context_correctness: 'Context Correctness',
    answer_relevancy: 'Answer Relevancy',
    context_precision: 'Context Precision',
    context_recall: 'Context Recall',
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
const formatMetricValue = (value: number): string => {
  // If the value would round to 0.000, use scientific notation
  const fixed = value.toFixed(3);
  if (fixed === '0.000' || fixed === '-0.000') {
    return value.toExponential(3);
  }
  return fixed;
};

function AutoragLeaderboard(): React.JSX.Element {
  const { namespace } = useParams<{ namespace: string }>();
  const { patterns, patternsLoading, pipelineRun, pipelineRunLoading } = useAutoragResultsContext();
  const optimizedMetric = getOptimizedMetricForRAG(pipelineRun);

  // Sorting state
  const [activeSortIndex, setActiveSortIndex] = React.useState<number>(0); // 0 = rank column
  const [activeSortDirection, setActiveSortDirection] = React.useState<'asc' | 'desc'>('asc');

  // Check if pipeline is still running
  const pipelineRunning =
    pipelineRun?.state === RuntimeStateKF.PENDING ||
    pipelineRun?.state === RuntimeStateKF.RUNNING ||
    pipelineRun?.state === RuntimeStateKF.CANCELING;

  // Extract all unique metric keys across all patterns
  const metricKeys = React.useMemo(() => {
    const keysSet = new Set<string>();
    Object.values(patterns).forEach((pattern: AutoragPattern) => {
      Object.keys(pattern.scoring).forEach((key) => {
        keysSet.add(key);
      });
    });
    return Array.from(keysSet).toSorted();
  }, [patterns]);

  // Transform patterns into LeaderboardEntry array
  const data: LeaderboardEntry[] = React.useMemo(() => {
    const entries = Object.entries(patterns).map(
      ([patternName, pattern]: [string, AutoragPattern]) => {
        // Helper to get metric object from scoring
        const getMetricObject = (metricName: string) => {
          const metricData = pattern.scoring[metricName];
          return {
            mean: metricData?.mean ?? 0,
            // eslint-disable-next-line camelcase
            ci_high: metricData?.ci_high ?? 0,
            // eslint-disable-next-line camelcase
            ci_low: metricData?.ci_low ?? 0,
          };
        };

        // Build metrics object with all available metrics
        const metrics: Record<string, { mean: number; ci_high: number; ci_low: number }> = {};
        metricKeys.forEach((key) => {
          metrics[key] = getMetricObject(key);
        });

        const optimizedMetricValue = getMetricObject(optimizedMetric).mean;

        return {
          rank: 0, // Will be assigned after sorting by optimized metric initially
          pattern: pattern.name || patternName,
          metrics,
          optimizedMetricValue,
        };
      },
    );

    // Initial ranking by optimized metric value
    // All RAG metrics: higher is better (descending sort)
    const sortedByMetric = entries.toSorted(
      (a, b) => b.optimizedMetricValue - a.optimizedMetricValue,
    );

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
      // Sort by pattern name
      return rankedEntries.toSorted((a, b) => {
        const comparison = a.pattern.localeCompare(b.pattern);
        return activeSortDirection === 'asc' ? comparison : -comparison;
      });
    }
    // Sort by metric column (index 2+ maps to metricKeys)
    const metricIndex = activeSortIndex - 2;
    const metricKey = metricKeys[metricIndex];
    if (metricKey) {
      return rankedEntries.toSorted((a, b) => {
        const comparison = a.metrics[metricKey].mean - b.metrics[metricKey].mean;
        return activeSortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return rankedEntries;
  }, [patterns, metricKeys, optimizedMetric, activeSortIndex, activeSortDirection]);

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

  // Handler for viewing pattern details
  const handleViewDetails = (patternName: string) => {
    // TODO: Implement view details
    // eslint-disable-next-line no-console
    console.log('View details for pattern:', patternName);
  };

  // Show empty state when pipeline is still running
  if (pipelineRunning) {
    return <AutoragRunInProgress namespace={namespace!} />;
  }

  // Show loading state with 5 rows and 8 columns
  const hasNoPatterns = Object.keys(patterns).length === 0;
  if (pipelineRunLoading || patternsLoading || hasNoPatterns) {
    return (
      <Table
        aria-label="AutoRAG Pattern Leaderboard"
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

  return (
    <Table
      aria-label="AutoRAG Pattern Leaderboard"
      variant="compact"
      data-testid="leaderboard-table"
    >
      <Thead>
        <Tr>
          <Th sort={getSortParams(0)} data-testid="rank-header">
            Rank
          </Th>
          <Th sort={getSortParams(1)} data-testid="pattern-name-header">
            Pattern name
          </Th>
          {metricKeys.map((metricKey, index) => (
            <React.Fragment key={metricKey}>
              <Th sort={getSortParams(index + 2)} data-testid={`metric-header-${metricKey}-mean`}>
                {formatMetricName(metricKey)} (mean)
                {metricKey === optimizedMetric ? (
                  <span data-testid="optimized-indicator"> (optimized)</span>
                ) : (
                  ''
                )}
              </Th>
              <Th data-testid={`metric-header-${metricKey}-ci_high`}>
                {formatMetricName(metricKey)} (CI high)
              </Th>
              <Th data-testid={`metric-header-${metricKey}-ci_low`}>
                {formatMetricName(metricKey)} (CI low)
              </Th>
            </React.Fragment>
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
            <Td dataLabel="Pattern" data-testid={`pattern-name-${entry.rank}`}>
              <Button
                variant="link"
                isInline
                onClick={() => handleViewDetails(entry.pattern)}
                data-testid={`pattern-link-${entry.rank}`}
              >
                {entry.pattern}
              </Button>
            </Td>
            {metricKeys.map((metricKey) => (
              <React.Fragment key={metricKey}>
                <Td
                  dataLabel={`${formatMetricName(metricKey)} (mean)`}
                  data-testid={`metric-${metricKey}-mean-${entry.rank}`}
                >
                  <Tooltip content={String(entry.metrics[metricKey].mean)}>
                    <span>{formatMetricValue(entry.metrics[metricKey].mean)}</span>
                  </Tooltip>
                </Td>
                <Td
                  dataLabel={`${formatMetricName(metricKey)} (CI high)`}
                  data-testid={`metric-${metricKey}-ci_high-${entry.rank}`}
                >
                  <Tooltip content={String(entry.metrics[metricKey].ci_high)}>
                    <span>{formatMetricValue(entry.metrics[metricKey].ci_high)}</span>
                  </Tooltip>
                </Td>
                <Td
                  dataLabel={`${formatMetricName(metricKey)} (CI low)`}
                  data-testid={`metric-${metricKey}-ci_low-${entry.rank}`}
                >
                  <Tooltip content={String(entry.metrics[metricKey].ci_low)}>
                    <span>{formatMetricValue(entry.metrics[metricKey].ci_low)}</span>
                  </Tooltip>
                </Td>
              </React.Fragment>
            ))}
            <Td isActionCell>
              <ActionsColumn
                items={[
                  {
                    title: 'View details',
                    onClick: () => handleViewDetails(entry.pattern),
                  },
                  {
                    title: 'Register pattern',
                    onClick: () => {
                      // TODO: Implement register pattern
                    },
                  },
                  {
                    title: 'Save notebook',
                    onClick: () => {
                      // TODO: Implement save notebook
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

export default AutoragLeaderboard;
