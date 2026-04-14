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
import AutoragRunInProgress from '~/app/components/empty-states/AutoragRunInProgress';
import { useAutoragResultsContext } from '~/app/context/AutoragResultsContext';
import type { AutoragPattern } from '~/app/types/autoragPattern';
import { RuntimeStateKF } from '~/app/types/pipeline';
import {
  formatMetricName,
  formatMetricValue,
  formatPatternName,
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

// Format a settings cell value: capitalize the first letter, with special cases
const formatSettingsValue = (value: string | number): string | number => {
  if (typeof value !== 'string' || value === 'N/A' || value.length === 0) {
    return value;
  }
  if (value === 'rrf') {
    return 'RRF';
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
};

// Tooltip text for specific settings values
const SETTINGS_VALUE_TOOLTIPS: Record<string, string> = {
  rrf: 'Reciprocal rank fusion',
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

// Settings column fields — keys of LeaderboardEntry usable as togglable settings columns
type SettingsField =
  | 'chunkingMethod'
  | 'chunkingChunkSize'
  | 'chunkingChunkOverlap'
  | 'retrievalMethod'
  | 'retrievalNumberOfChunks'
  | 'retrievalSearchMode'
  | 'retrievalRankerStrategy';

/**
 * Column metadata for leaderboard table headers and tooltips.
 * Sticky columns (rank, pattern name, optimized metric, actions) are not in this map.
 * Columns are displayed in ascending priority order; equal priority sorts alphabetically by name.
 * Columns without an entry here appear after all prioritized columns.
 * Entries with `field` and `testId` are togglable settings columns rendered in the table body.
 *
 * @property name - The full display name shown in the tooltip header.
 * @property acronym - Optional short label rendered in the column header instead of `name`.
 *   When present, the header displays the acronym while the tooltip continues to show the
 *   full `name`. Useful for metric columns where the full name is too long for a header cell.
 * @property description - Optional supplementary text shown below `name` in the tooltip.
 * @property priority - Sort order for non-sticky columns (ascending). Default: MAX_SAFE_INTEGER.
 * @property field - LeaderboardEntry key for togglable settings columns.
 * @property testId - data-testid prefix for settings column headers and cells.
 */
const COLUMN_META: Record<
  string,
  {
    name: string;
    acronym?: string;
    description?: string;
    priority?: number;
    field?: SettingsField;
    testId?: string;
  }
> = {
  // rank and modelNames are sticky columns — no priority, field, or testId needed
  rank: {
    name: 'Rank',
    description:
      'The rank of the pattern. Ranks are determined by the performance of the optimized metric.',
  },
  modelNames: {
    name: 'Model names',
    description: 'Names of the generation and embedding models used in the pattern.',
  },
  // metric columns use the "metric:<key>" id — handled via a fallback with priority 1
  'metric:faithfulness': {
    name: formatMetricName('faithfulness'),
    // description: 'Accuracy of the generated response to the retrieved text.',
  },
  'metric:answer_correctness': {
    name: formatMetricName('answer_correctness'),
    // description:
    //   'Correctness of the generated response including both the relevance of the retrieved context and the quality of the generated response.',
  },
  'metric:context_correctness': {
    name: formatMetricName('context_correctness'),
    // description: 'Relevancy of the generated response to the input.',
  },
  retrievalMethod: {
    name: 'Retrieval method',
    // description:
    //   'Retrieval methods differ in the ways that they filter and rank documents so that they can retrieve relevant data.',
    priority: 2,
    field: 'retrievalMethod',
    testId: 'retrieval-method',
  },
  retrievalRankerStrategy: {
    name: 'Hybrid strategy',
    // description:
    //   'A method that combines multiple retrieval approaches to enhance answer accuracy. RRF (reciprocal rank fusion) merges rankings from various sources into one list, and weighted assigns importance to outputs, prioritizing the most reliable for the final outcome.',
    priority: 3,
    field: 'retrievalRankerStrategy',
    testId: 'retrieval-ranker-strategy',
  },
  retrievalSearchMode: {
    name: 'Retrieval search mode',
    priority: 4,
    field: 'retrievalSearchMode',
    testId: 'retrieval-search-mode',
  },
  chunkingMethod: {
    name: 'Chunk method',
    // description:
    //   'How relevant text is retrieved for each chunk of the input after splitting the input into multiple chunks.',
    priority: 5,
    field: 'chunkingMethod',
    testId: 'chunking-method',
  },
  retrievalNumberOfChunks: {
    name: 'Number of chunks',
    // description: 'The number of chunks that are retrieved from the indexed documents.',
    priority: 6,
    field: 'retrievalNumberOfChunks',
    testId: 'retrieval-number-of-chunks',
  },
  chunkingChunkSize: {
    name: 'Chunk size',
    // description: 'The maximum number of characters that a chunk should contain.',
    priority: 7,
    field: 'chunkingChunkSize',
    testId: 'chunking-chunk-size',
  },
  chunkingChunkOverlap: {
    name: 'Chunk overlap',
    // description: 'The number of characters that overlap between two chunks.',
    priority: 8,
    field: 'chunkingChunkOverlap',
    testId: 'chunking-chunk-overlap',
  },
};

// Safe accessor — COLUMN_META is typed as Record<string, …> so TS believes every
// key returns a value, but at runtime dynamic metric keys may be absent.
const getColumnMeta = (id: string): (typeof COLUMN_META)[string] | undefined => {
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

// Helper to resolve priority for any column id (metric columns default to priority 2)
const getColumnPriority = (id: string): number => {
  if (id.startsWith('metric:')) {
    return 1;
  }
  return getColumnMeta(id)?.priority ?? Number.MAX_SAFE_INTEGER;
};

// Helper to resolve display name for any column id
const getColumnName = (id: string, fallbackLabel: string): string =>
  getColumnMeta(id)?.name ?? fallbackLabel;

// Togglable settings columns for the table body. Derived by filtering COLUMN_META to entries
// with a `field` — only those map to a LeaderboardEntry key and render as data cells.
// Entries without `field` (e.g. modelNames) are sticky columns handled separately.
const SETTINGS_COLUMNS = Object.entries(COLUMN_META)
  .filter(([, meta]) => meta.field != null)
  .map(([id, meta]) => ({
    id,
    label: meta.name,
    field: meta.field!,
    testId: meta.testId!,
  }));

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

const MetricCell: React.FC<{ value: number | string }> = ({ value }) => {
  const numericValue = typeof value === 'number' ? value : null;
  return (
    <Tooltip content={String(value)}>
      <div className="autorag-leaderboard__metric-cell">
        <div className="autorag-leaderboard__metric-bar-track">
          {numericValue != null && (
            <div
              className="autorag-leaderboard__metric-bar-fill"
              style={{ width: `${Math.min(numericValue, 1) * 100}%` }}
            />
          )}
        </div>
        <span className="autorag-leaderboard__metric-value">{formatMetricValue(value)}</span>
      </div>
    </Tooltip>
  );
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
  const [activeSortId, setActiveSortId] = React.useState<string>('rank');
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

  // Metric keys excluding the optimized metric (shown in sticky column)
  const nonOptimizedMetricKeys = React.useMemo(
    () => metricKeys.filter((key) => key !== optimizedMetric),
    [metricKeys, optimizedMetric],
  );

  // Column definitions — source of truth for column IDs, labels, and visibility.
  // Non-sticky columns are sorted by priority (ascending), then alphabetically by name.
  const columnDefs = React.useMemo(() => {
    const stickyColumns = [
      { id: 'rank', label: 'Rank', isAlwaysVisible: true },
      { id: 'pattern', label: 'Pattern name', isAlwaysVisible: true },
      { id: 'modelNames', label: 'Model name', isAlwaysVisible: true },
      {
        id: 'optimized-metric',
        label: `${formatMetricName(optimizedMetric)} (optimized)`,
        isAlwaysVisible: true,
      },
    ];

    const dynamicColumns = [
      ...nonOptimizedMetricKeys.map((key) => ({
        id: `metric:${key}`,
        label: getColumnName(`metric:${key}`, formatMetricName(key)),
      })),
      ...SETTINGS_COLUMNS.map((col) => ({
        id: col.id,
        label: col.label,
      })),
    ].toSorted((a, b) => {
      const pa = getColumnPriority(a.id);
      const pb = getColumnPriority(b.id);
      if (pa !== pb) {
        return pa - pb;
      }
      return a.label.localeCompare(b.label);
    });

    return [...stickyColumns, ...dynamicColumns];
  }, [nonOptimizedMetricKeys, optimizedMetric]);

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

  // Visible dynamic (non-sticky) columns in priority order for header/body rendering
  type DynamicColumn =
    | { kind: 'metric'; metricKey: string; id: string; label: string }
    | { kind: 'setting'; col: (typeof SETTINGS_COLUMNS)[number]; id: string; label: string };

  const visibleDynamicColumns: DynamicColumn[] = React.useMemo(() => {
    const metricCols: DynamicColumn[] = nonOptimizedMetricKeys
      .filter((key) => !hiddenColumnIds.has(`metric:${key}`))
      .map((key) => ({
        kind: 'metric',
        metricKey: key,
        id: `metric:${key}`,
        label: getColumnName(`metric:${key}`, formatMetricName(key)),
      }));

    const settingCols: DynamicColumn[] = SETTINGS_COLUMNS.filter(
      (col) => !hiddenColumnIds.has(col.id),
    ).map((col) => ({
      kind: 'setting',
      col,
      id: col.id,
      label: col.label,
    }));

    return [...metricCols, ...settingCols].toSorted((a, b) => {
      const pa = getColumnPriority(a.id);
      const pb = getColumnPriority(b.id);
      if (pa !== pb) {
        return pa - pb;
      }
      return a.label.localeCompare(b.label);
    });
  }, [nonOptimizedMetricKeys, hiddenColumnIds]);

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
    if (activeSortId === 'rank') {
      return rankedEntries.toSorted((a, b) =>
        activeSortDirection === 'asc' ? a.rank - b.rank : b.rank - a.rank,
      );
    }
    if (activeSortId === 'pattern') {
      return rankedEntries.toSorted((a, b) => {
        const comparison = a.pattern.localeCompare(b.pattern);
        return activeSortDirection === 'asc' ? comparison : -comparison;
      });
    }
    if (activeSortId === 'modelNames') {
      return rankedEntries.toSorted((a, b) => {
        const aDisplay = `${getModelIdShortName(a.generationModelId)} / ${getModelIdShortName(a.embeddingsModelId)}`;
        const bDisplay = `${getModelIdShortName(b.generationModelId)} / ${getModelIdShortName(b.embeddingsModelId)}`;
        const comparison =
          aDisplay.localeCompare(bDisplay) ||
          a.generationModelId.localeCompare(b.generationModelId) ||
          a.embeddingsModelId.localeCompare(b.embeddingsModelId);
        return activeSortDirection === 'asc' ? comparison : -comparison;
      });
    }

    // Sort by metric column (optimized or non-optimized)
    if (activeSortId === 'optimized-metric' || activeSortId.startsWith('metric:')) {
      const metricKey =
        activeSortId === 'optimized-metric' ? null : activeSortId.slice('metric:'.length);
      return rankedEntries.toSorted((a, b) => {
        const aVal = metricKey ? a.metrics[metricKey].mean : a.optimizedMetricValue;
        const bVal = metricKey ? b.metrics[metricKey].mean : b.optimizedMetricValue;

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

    // Sort by settings column
    const settingsCol = SETTINGS_COLUMNS.find((col) => col.id === activeSortId);

    if (settingsCol) {
      return rankedEntries.toSorted((a, b) => {
        const aVal = a[settingsCol.field];
        const bVal = b[settingsCol.field];

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
  }, [patterns, metricKeys, optimizedMetric, activeSortId, activeSortDirection]);

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
        'The pipeline run completed but did not generate any patterns. Please check the',
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
          titleText="No patterns produced"
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
          aria-label="AutoRAG Pattern Leaderboard"
          variant="compact"
          data-testid="leaderboard-table"
          className="autorag-leaderboard"
          isStickyHeader
        >
          <Thead>
            <Tr>
              <Th
                sort={getSortParams('rank')}
                data-testid="rank-header"
                className="autorag-leaderboard__rank-cell"
                isStickyColumn
                stickyMinWidth="120px"
                stickyLeftOffset="0"
              >
                <ColumnHeaderContent columnId="rank">Rank</ColumnHeaderContent>
              </Th>
              <Th
                sort={getSortParams('pattern')}
                data-testid="pattern-name-header"
                isStickyColumn
                stickyMinWidth="150px"
                stickyLeftOffset="120px"
              >
                <ColumnHeaderContent columnId="pattern">Pattern name</ColumnHeaderContent>
              </Th>
              <Th
                sort={getSortParams('modelNames')}
                data-testid="model-name-header"
                isStickyColumn
                stickyMinWidth="200px"
                stickyLeftOffset="270px"
              >
                <ColumnHeaderContent columnId="modelNames">Model names</ColumnHeaderContent>
              </Th>
              <Th
                sort={getSortParams('optimized-metric')}
                data-testid={`metric-header-${optimizedMetric}`}
                isStickyColumn
                hasRightBorder
                stickyMinWidth="150px"
                stickyLeftOffset="470px"
              >
                <ColumnHeaderContent
                  columnId={`metric:${optimizedMetric}`}
                  tooltipName={`${getColumnMeta(`metric:${optimizedMetric}`)?.name ?? formatMetricName(optimizedMetric)} (optimized)`}
                >
                  {getColumnMeta(`metric:${optimizedMetric}`)?.acronym ??
                    formatMetricName(optimizedMetric)}
                  <div
                    data-testid="optimized-indicator"
                    className="autorag-leaderboard__optimized-indicator"
                  >
                    (optimized)
                  </div>
                </ColumnHeaderContent>
              </Th>
              {visibleDynamicColumns.map((dc) => (
                <Th
                  key={dc.id}
                  sort={getSortParams(dc.id)}
                  data-testid={
                    dc.kind === 'metric'
                      ? `metric-header-${dc.metricKey}`
                      : `${dc.col.testId}-header`
                  }
                >
                  <ColumnHeaderContent columnId={dc.id}>
                    {getColumnMeta(dc.id)?.acronym ?? dc.label}
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
                  className="autorag-leaderboard__rank-cell"
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
                  stickyMinWidth="150px"
                  stickyLeftOffset="120px"
                >
                  <Button
                    variant="link"
                    isInline
                    onClick={() => handleViewDetails(entry.pattern)}
                    data-testid={`pattern-link-${entry.rank}`}
                  >
                    {formatPatternName(entry.pattern)}
                  </Button>
                </Td>
                <Td
                  dataLabel="Model name"
                  data-testid={`model-name-${entry.rank}`}
                  isStickyColumn
                  stickyMinWidth="200px"
                  stickyLeftOffset="270px"
                >
                  <Tooltip content={entry.generationModelId}>
                    <span>{getModelIdShortName(entry.generationModelId)}</span>
                  </Tooltip>
                  <div className="autorag-leaderboard__model-secondary">
                    <Tooltip content={entry.embeddingsModelId}>
                      <span>{getModelIdShortName(entry.embeddingsModelId)}</span>
                    </Tooltip>
                  </div>
                </Td>
                <Td
                  dataLabel={formatMetricName(optimizedMetric)}
                  data-testid={`metric-${optimizedMetric}-${entry.rank}`}
                  isStickyColumn
                  hasRightBorder
                  stickyMinWidth="150px"
                  stickyLeftOffset="470px"
                >
                  <MetricCell value={entry.optimizedMetricValue} />
                </Td>
                {visibleDynamicColumns.map((dc) => (
                  <Td
                    key={dc.id}
                    dataLabel={dc.label}
                    data-testid={
                      dc.kind === 'metric'
                        ? `metric-${dc.metricKey}-${entry.rank}`
                        : `${dc.col.testId}-${entry.rank}`
                    }
                  >
                    {dc.kind === 'metric' ? (
                      <MetricCell value={entry.metrics[dc.metricKey].mean} />
                    ) : SETTINGS_VALUE_TOOLTIPS[String(entry[dc.col.field])] ? (
                      <Tooltip content={SETTINGS_VALUE_TOOLTIPS[String(entry[dc.col.field])]}>
                        <span>{formatSettingsValue(entry[dc.col.field])}</span>
                      </Tooltip>
                    ) : (
                      formatSettingsValue(entry[dc.col.field])
                    )}
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
      <ColumnManagementModal
        isOpen={isManageColumnsOpen}
        onClose={() => setIsManageColumnsOpen(false)}
        appliedColumns={managedColumns}
        applyColumns={handleApplyColumns}
      />
    </>
  );
}

export default AutoragLeaderboard;
