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
import AutoragRunInProgress from '~/app/components/empty-states/AutoragRunInProgress';
import { useAutoragResultsContext } from '~/app/context/AutoragResultsContext';
import type { AutoragPattern } from '~/app/types/autoragPattern';
import { RuntimeStateKF } from '~/app/types/pipeline';
import {
  formatMetricName,
  formatMetricValue,
  getOptimizedMetricForRAG,
} from '~/app/utilities/utils';
import './AutoragLeaderboard.scss';

type LeaderboardEntry = {
  rank: number;
  pattern: string;
  metrics: Record<string, { mean: number | string }>;
  optimizedMetricValue: number | string;
  chunkingMethod: string;
  chunkingChunkSize: number | string;
  chunkingChunkOverlap: number | string;
  embeddingsModelId: string;
  retrievalMethod: string;
  retrievalNumberOfChunks: number | string;
  retrievalSearchMode: string;
  retrievalRankerStrategy: string;
  generationModelId: string;
};

// Helper function to extract the last segment of a model ID
const getModelIdShortName = (modelId: string): string => {
  // Don't try to extract a short name from N/A or other non-model-ID values
  if (modelId === 'N/A' || !modelId.includes('/')) {
    return modelId;
  }
  const segments = modelId.split('/');
  return segments[segments.length - 1] || modelId;
};

type AutoragLeaderboardProps = {
  onViewDetails?: (patternName: string) => void;
  onSaveNotebook?: (patternName: string, notebookType: 'indexing' | 'inference') => void;
};

function AutoragLeaderboard({
  onViewDetails,
  onSaveNotebook,
}: AutoragLeaderboardProps): React.JSX.Element | null {
  const { namespace, runId } = useParams<{ namespace: string; runId: string }>();
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
      // Defensive check: verify scores is a non-null plain object (not array)
      const scores =
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        pattern.scores && typeof pattern.scores === 'object' && !Array.isArray(pattern.scores)
          ? pattern.scores
          : {};
      Object.keys(scores).forEach((key) => {
        keysSet.add(key);
      });
    });
    return Array.from(keysSet).toSorted();
  }, [patterns]);

  // Transform patterns into LeaderboardEntry array
  const data: LeaderboardEntry[] = React.useMemo(() => {
    const entries = Object.entries(patterns).map(
      ([patternName, pattern]: [string, AutoragPattern]) => {
        // Helper to get metric object from scores
        const getMetricObject = (metricName: string) => {
          // Defensive check: verify scores is a non-null plain object (not array)
          const scores =
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            pattern.scores && typeof pattern.scores === 'object' && !Array.isArray(pattern.scores)
              ? pattern.scores
              : {};
          const metricData = scores[metricName];
          const meanValue = metricData?.mean;
          // Only return numeric mean if it's a finite number
          const isValidNumber = typeof meanValue === 'number' && Number.isFinite(meanValue);
          return {
            mean: isValidNumber ? meanValue : 'N/A',
          };
        };

        // Build metrics object with all available metrics
        const metrics: Record<string, { mean: number | string }> = {};
        metricKeys.forEach((key) => {
          metrics[key] = getMetricObject(key);
        });

        const optimizedMetricValue = getMetricObject(optimizedMetric).mean;

        return {
          rank: 0, // Will be assigned after sorting by optimized metric initially
          pattern: pattern.name || patternName,
          metrics,
          optimizedMetricValue,
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          chunkingMethod: pattern.settings?.chunking?.method || 'N/A',
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing -- 0 is a valid value, must use ?? not ||
          chunkingChunkSize: pattern.settings?.chunking?.chunk_size ?? 'N/A',
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing -- 0 is a valid value, must use ?? not ||
          chunkingChunkOverlap: pattern.settings?.chunking?.chunk_overlap ?? 'N/A',
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          embeddingsModelId: pattern.settings?.embedding?.model_id || 'N/A',
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          retrievalMethod: pattern.settings?.retrieval?.method || 'N/A',
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing -- 0 is a valid value, must use ?? not ||
          retrievalNumberOfChunks: pattern.settings?.retrieval?.number_of_chunks ?? 'N/A',
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          retrievalSearchMode: pattern.settings?.retrieval?.search_mode || 'N/A',
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          retrievalRankerStrategy: pattern.settings?.retrieval?.ranker_strategy || 'N/A',
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          generationModelId: pattern.settings?.generation?.model_id || 'N/A',
        };
      },
    );

    // Initial ranking by optimized metric value
    // All RAG metrics: higher is better (descending sort)
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

      // Both are numbers, higher is better
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

    // Check if sorting by metric column (indices 2 through 2 + metricKeys.length - 1)
    const metricStartIndex = 2;
    const metricEndIndex = metricStartIndex + metricKeys.length - 1;
    if (activeSortIndex >= metricStartIndex && activeSortIndex <= metricEndIndex) {
      const metricIndex = activeSortIndex - metricStartIndex;
      const metricKey = metricKeys[metricIndex];
      if (metricKey) {
        return rankedEntries.toSorted((a, b) => {
          const aVal = a.metrics[metricKey].mean;
          const bVal = b.metrics[metricKey].mean;

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
    }

    // Settings columns start after metrics
    const settingsStartIndex = metricStartIndex + metricKeys.length;
    const settingsColumnIndex = activeSortIndex - settingsStartIndex;

    // Map column index to sorting field
    const settingsFields = [
      'chunkingMethod',
      'chunkingChunkSize',
      'chunkingChunkOverlap',
      'embeddingsModelId',
      'retrievalMethod',
      'retrievalNumberOfChunks',
      'retrievalSearchMode',
      'retrievalRankerStrategy',
      'generationModelId',
    ] as const;

    if (settingsColumnIndex >= 0 && settingsColumnIndex < settingsFields.length) {
      const sortField = settingsFields[settingsColumnIndex];
      return rankedEntries.toSorted((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];

        // N/A always sorts last regardless of type or direction
        if (aVal === 'N/A' && bVal === 'N/A') {
          return 0;
        }
        if (aVal === 'N/A') {
          return 1;
        }
        if (bVal === 'N/A') {
          return -1;
        }

        // Handle string sorting
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const comparison = aVal.localeCompare(bVal);
          return activeSortDirection === 'asc' ? comparison : -comparison;
        }

        // Handle number sorting
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          const comparison = aVal - bVal;
          return activeSortDirection === 'asc' ? comparison : -comparison;
        }

        return 0;
      });
    }

    return rankedEntries;
  }, [patterns, metricKeys, optimizedMetric, activeSortIndex, activeSortDirection]);

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

  const handleViewDetails = (patternName: string) => {
    onViewDetails?.(patternName);
  };

  // Show empty state when pipeline is still running
  if (pipelineRunning) {
    if (!namespace) {
      return null;
    }
    return <AutoragRunInProgress namespace={namespace} />;
  }

  // Show loading state with 5 rows and 14 columns
  if (pipelineRunLoading || patternsLoading) {
    return (
      <Table
        aria-label="AutoRAG Pattern Leaderboard"
        variant="compact"
        data-testid="leaderboard-loading"
      >
        <Thead>
          <Tr>
            {Array.from({ length: 14 }).map((__, colIndex) => (
              <Th key={colIndex}>
                <Skeleton />
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {Array.from({ length: 5 }).map((__, rowIndex) => (
            <Tr key={rowIndex}>
              {Array.from({ length: 14 }).map((_, colIndex) => (
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

  // Show empty state when no patterns were produced
  if (Object.keys(patterns).length === 0) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          titleText="No patterns produced"
          variant={EmptyStateVariant.sm}
          data-testid="leaderboard-empty"
        >
          <EmptyStateBody>
            <span>
              The pipeline run completed but did not generate any patterns. Please check the&nbsp;
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
        aria-label="AutoRAG Pattern Leaderboard"
        variant="compact"
        data-testid="leaderboard-table"
        className="autorag-leaderboard"
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
              data-testid="pattern-name-header"
              isStickyColumn
              hasRightBorder
              stickyMinWidth="150px"
              stickyLeftOffset="80px"
            >
              Pattern name
            </Th>
            {metricKeys.map((metricKey, index) => (
              <Th
                key={metricKey}
                sort={getSortParams(index + 2)}
                data-testid={`metric-header-${metricKey}`}
              >
                Mean {formatMetricName(metricKey)}
                {metricKey === optimizedMetric ? (
                  <span data-testid="optimized-indicator">&nbsp;(optimized)</span>
                ) : (
                  ''
                )}
              </Th>
            ))}
            <Th sort={getSortParams(2 + metricKeys.length)} data-testid="chunking-method-header">
              Chunking method
            </Th>
            <Th
              sort={getSortParams(3 + metricKeys.length)}
              data-testid="chunking-chunk-size-header"
            >
              Chunking chunk size
            </Th>
            <Th
              sort={getSortParams(4 + metricKeys.length)}
              data-testid="chunking-chunk-overlap-header"
            >
              Chunking chunk overlap
            </Th>
            <Th
              sort={getSortParams(5 + metricKeys.length)}
              data-testid="embeddings-model-id-header"
            >
              Embeddings model ID
            </Th>
            <Th sort={getSortParams(6 + metricKeys.length)} data-testid="retrieval-method-header">
              Retrieval method
            </Th>
            <Th
              sort={getSortParams(7 + metricKeys.length)}
              data-testid="retrieval-number-of-chunks-header"
            >
              Retrieval number of chunks
            </Th>
            <Th
              sort={getSortParams(8 + metricKeys.length)}
              data-testid="retrieval-search-mode-header"
            >
              Retrieval search mode
            </Th>
            <Th
              sort={getSortParams(9 + metricKeys.length)}
              data-testid="retrieval-ranker-strategy-header"
            >
              Retrieval ranker strategy
            </Th>
            <Th
              sort={getSortParams(10 + metricKeys.length)}
              data-testid="generation-model-id-header"
            >
              Generation model ID
            </Th>
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
                dataLabel="Pattern"
                data-testid={`pattern-name-${entry.rank}`}
                isStickyColumn
                hasRightBorder
                stickyMinWidth="150px"
                stickyLeftOffset="80px"
              >
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
                <Td
                  key={metricKey}
                  dataLabel={`Mean ${formatMetricName(metricKey)}`}
                  data-testid={`metric-${metricKey}-${entry.rank}`}
                >
                  <Tooltip content={String(entry.metrics[metricKey].mean)}>
                    <span>{formatMetricValue(entry.metrics[metricKey].mean)}</span>
                  </Tooltip>
                </Td>
              ))}
              <Td dataLabel="Chunking method" data-testid={`chunking-method-${entry.rank}`}>
                {entry.chunkingMethod}
              </Td>
              <Td dataLabel="Chunking chunk size" data-testid={`chunking-chunk-size-${entry.rank}`}>
                {entry.chunkingChunkSize}
              </Td>
              <Td
                dataLabel="Chunking chunk overlap"
                data-testid={`chunking-chunk-overlap-${entry.rank}`}
              >
                {entry.chunkingChunkOverlap}
              </Td>
              <Td dataLabel="Embeddings model ID" data-testid={`embeddings-model-id-${entry.rank}`}>
                <Tooltip content={entry.embeddingsModelId}>
                  <span>{getModelIdShortName(entry.embeddingsModelId)}</span>
                </Tooltip>
              </Td>
              <Td dataLabel="Retrieval method" data-testid={`retrieval-method-${entry.rank}`}>
                {entry.retrievalMethod}
              </Td>
              <Td
                dataLabel="Retrieval number of chunks"
                data-testid={`retrieval-number-of-chunks-${entry.rank}`}
              >
                {entry.retrievalNumberOfChunks}
              </Td>
              <Td
                dataLabel="Retrieval search mode"
                data-testid={`retrieval-search-mode-${entry.rank}`}
              >
                {entry.retrievalSearchMode}
              </Td>
              <Td
                dataLabel="Retrieval ranker strategy"
                data-testid={`retrieval-ranker-strategy-${entry.rank}`}
              >
                {entry.retrievalRankerStrategy}
              </Td>
              <Td dataLabel="Generation model ID" data-testid={`generation-model-id-${entry.rank}`}>
                <Tooltip content={entry.generationModelId}>
                  <span>{getModelIdShortName(entry.generationModelId)}</span>
                </Tooltip>
              </Td>
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
                      onClick: () => handleViewDetails(entry.pattern),
                    },
                    {
                      title: 'Save as indexing notebook',
                      onClick: () => onSaveNotebook?.(entry.pattern, 'indexing'),
                    },
                    {
                      title: 'Save as inference notebook',
                      onClick: () => onSaveNotebook?.(entry.pattern, 'inference'),
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

export default AutoragLeaderboard;
