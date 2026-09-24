import {
  Alert,
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
import AutoragRunInProgress from '~/app/components/empty-states/AutoragRunInProgress';
import { useAutoragResultsContext } from '~/app/context/AutoragResultsContext';
import type { AutoragPattern, MetricReference } from '~/app/types/autoragPattern';
import { RuntimeStateKF } from '~/app/types/pipeline';
import { formatPatternName, isRunInProgress } from '~/app/utilities/utils';
import {
  findMetric,
  formatMetricValue,
  getObjectiveMetric,
  isPatternRankable,
  metricDomId,
  metricKey,
  metricLabel,
  normalizeMetricReference,
  orderPatternsByLeaderboardRank,
} from '~/app/utilities/metricUtils';
import { patternHasIndexingPipelineSpec } from '~/app/utilities/indexingPipeline';
import { METRIC_DESCRIPTIONS } from '~/app/utilities/const';
import { getMetricDescription } from '~/app/utilities/metricDisplay';
import {
  fireAutoragResultsColumnToggled,
  fireAutoragLeaderboardPresetApplied,
  mapOptimizationMetric,
  type ResultsColumnName,
  type LeaderboardPresetType,
} from '~/app/utilities/tracking';
import ManageColumnsModal, { type ColumnPreset } from './ManageColumnsModal';
import './AutoragLeaderboard.scss';

type LeaderboardEntry = {
  rank?: number;
  pattern: string;
  patternKey: string;
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

type MetricColumn = {
  id: string;
  metric: MetricReference;
};

type LeaderboardColumn = {
  id: string;
  label: string;
  metric?: MetricReference;
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

type ColumnMeta = {
  name: string;
  acronym?: string;
  description?: string;
  minWidth?: string;
  priority?: number;
  field?: SettingsField;
  testId?: string;
};

/**
 * Metric metadata for leaderboard headers and tooltips. The metric reference remains the source
 * of identity; this table only supplies optional presentation details by normalized metric name.
 */
const METRIC_COLUMN_META: Record<string, ColumnMeta> = {
  /* eslint-disable camelcase */
  faithfulness: {
    name: metricLabel({ name: 'faithfulness' }),
    description: METRIC_DESCRIPTIONS.faithfulness,
    minWidth: '15rem',
  },
  answer_correctness: {
    name: metricLabel({ name: 'answer_correctness' }),
    description: METRIC_DESCRIPTIONS.answer_correctness,
    minWidth: '15rem',
  },
  context_correctness: {
    name: metricLabel({ name: 'context_correctness' }),
    description: METRIC_DESCRIPTIONS.context_correctness,
    minWidth: '15.5rem',
  },
  overall_score: {
    name: metricLabel({ name: 'overall_score' }),
    description: METRIC_DESCRIPTIONS.overall_score,
  },
  answer_relevance: {
    name: metricLabel({ name: 'answer_relevance' }),
    description: METRIC_DESCRIPTIONS.answer_relevance,
  },
  /* eslint-enable camelcase */
};

/**
 * Column metadata for leaderboard headers and tooltips.
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
 * @property minWidth - Optional CSS min-width value applied to the column header (e.g., `"9rem"`).
 *   Prevents narrow metric columns from collapsing when the table has many columns.
 * @property priority - Sort order for non-sticky columns (ascending). Default: MAX_SAFE_INTEGER.
 * @property field - LeaderboardEntry key for togglable settings columns.
 * @property testId - data-testid prefix for settings column headers and cells.
 */
const COLUMN_META: Record<string, ColumnMeta> = {
  // rank and modelNames are sticky columns — no priority, field, or testId needed
  rank: {
    name: 'Rank',
    description:
      'The rank of the pattern. Ranks are determined by the performance of the optimized metric.',
  },
  pattern: {
    name: 'Pattern name',
    description: 'The name of the generated RAG pattern.',
  },
  modelNames: {
    name: 'Model names',
    description: 'Names of the generation and embedding models used in the pattern.',
  },
  // Chunking group (document processing stage)
  chunkingMethod: {
    name: 'Chunking method',
    description: 'The method used to split documents into chunks.',
    minWidth: '13rem',
    priority: 2,
    field: 'chunkingMethod',
    testId: 'chunking-method',
  },
  chunkingChunkSize: {
    name: 'Chunk size',
    description: 'The size of each document chunk in characters.',
    minWidth: '10rem',
    priority: 3,
    field: 'chunkingChunkSize',
    testId: 'chunking-chunk-size',
  },
  chunkingChunkOverlap: {
    name: 'Chunk overlap',
    description: 'The number of overlapping characters between consecutive chunks.',
    minWidth: '12rem',
    priority: 4,
    field: 'chunkingChunkOverlap',
    testId: 'chunking-chunk-overlap',
  },
  // Retrieval group (search stage)
  retrievalMethod: {
    name: 'Retrieval method',
    description: 'The method used to retrieve relevant chunks from the vector database.',
    priority: 5,
    field: 'retrievalMethod',
    testId: 'retrieval-method',
    minWidth: '13rem',
  },
  retrievalSearchMode: {
    name: 'Retrieval search mode',
    description:
      'The search strategy. Hybrid search combines vector and keyword search and is available only with Milvus.',
    minWidth: '14rem',
    priority: 6,
    field: 'retrievalSearchMode',
    testId: 'retrieval-search-mode',
  },
  retrievalRankerStrategy: {
    name: 'Hybrid strategy',
    description:
      'The ranking algorithm used to combine and reorder results when hybrid retrieval search mode is active. RRF (reciprocal rank fusion) merges rankings from multiple sources into a single list. Weighted ranking assigns different importance levels to each source. Only applicable when retrieval search mode is hybrid.',
    minWidth: '12rem',
    priority: 7,
    field: 'retrievalRankerStrategy',
    testId: 'retrieval-ranker-strategy',
  },
  retrievalNumberOfChunks: {
    name: 'Number of chunks',
    description: 'The number of document chunks retrieved per query.',
    minWidth: '13rem',
    priority: 8,
    field: 'retrievalNumberOfChunks',
    testId: 'retrieval-number-of-chunks',
  },
};

// Safe accessor — both metadata maps are typed as Record<string, …> so TypeScript believes every
// key returns a value, but dynamic settings and metric names may be absent at runtime.
const getColumnMeta = (id: string, metric?: MetricReference): ColumnMeta | undefined => {
  if (metric) {
    const { name } = normalizeMetricReference(metric);
    if (Object.hasOwn(METRIC_COLUMN_META, name)) {
      return METRIC_COLUMN_META[name];
    }
    const description = getMetricDescription(name);
    if (description) {
      return {
        name: metricLabel({ name }),
        description,
        minWidth: '15rem',
      };
    }
    return undefined;
  }
  if (Object.hasOwn(COLUMN_META, id)) {
    return COLUMN_META[id];
  }
  const lowerId = id.toLowerCase();
  if (Object.hasOwn(COLUMN_META, lowerId)) {
    return COLUMN_META[lowerId];
  }
  return undefined;
};

// Helper to resolve priority for any column id (metric columns default to priority 2)
const getColumnPriority = (id: string, metric?: MetricReference): number => {
  if (metric) {
    return 1;
  }
  return getColumnMeta(id)?.priority ?? Number.MAX_SAFE_INTEGER;
};

// Resolve display text for a column header: acronym → name → fallback
const getColumnHeader = (id: string, fallback?: string, metric?: MetricReference): string => {
  const meta = getColumnMeta(id, metric);
  return meta?.acronym ?? (metric ? metricLabel(metric) : meta?.name) ?? fallback ?? id;
};

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

// Explicit allowlist (rather than reusing COLUMN_META's ids directly) so the analytics taxonomy
// doesn't silently grow every time a new settings column is added to COLUMN_META — new ids fall
// back to `'other'` in `getColumnAnalyticsName` until deliberately added here.
const SETTINGS_COLUMN_ANALYTICS_NAMES: Partial<Record<string, ResultsColumnName>> = {
  chunkingMethod: 'chunkingMethod',
  chunkingChunkSize: 'chunkingChunkSize',
  chunkingChunkOverlap: 'chunkingChunkOverlap',
  retrievalMethod: 'retrievalMethod',
  retrievalSearchMode: 'retrievalSearchMode',
  retrievalRankerStrategy: 'retrievalRankerStrategy',
  retrievalNumberOfChunks: 'retrievalNumberOfChunks',
};

/**
 * Maps an internal column id (as used in `columnDefs`/`ColumnManagementModalColumn.key`) to the
 * discrete `ResultsColumnName` analytics taxonomy. `optimizedMetricKey` disambiguates the sticky
 * `'optimized-metric'` column, whose underlying metric varies per run.
 */
const getColumnAnalyticsName = (columnId: string, metric?: MetricReference): ResultsColumnName => {
  if (columnId === 'rank') {
    return 'rank';
  }
  if (columnId === 'pattern') {
    return 'patternName';
  }
  if (columnId === 'modelNames') {
    return 'modelNames';
  }
  if (columnId === 'optimized-metric') {
    return (
      mapOptimizationMetric(metric ? normalizeMetricReference(metric).name : '') ?? 'otherMetric'
    );
  }
  if (metric) {
    return mapOptimizationMetric(normalizeMetricReference(metric).name) ?? 'otherMetric';
  }
  return SETTINGS_COLUMN_ANALYTICS_NAMES[columnId] ?? 'other';
};

// Explicit allowlist mapping each "Manage columns" quick-select preset's display label to its
// discrete analytics identity — mirrors `SETTINGS_COLUMN_ANALYTICS_NAMES` above so a label
// rename doesn't silently break (or leak into) the analytics taxonomy.
const PRESET_ANALYTICS_TYPES: Record<string, LeaderboardPresetType> = {
  'Optimization metrics': 'optimizationMetrics',
  'Optimization metrics and chunking': 'optimizationMetricsAndChunking',
  'Full configuration': 'fullConfiguration',
};

const getPresetAnalyticsType = (presetLabel: string): LeaderboardPresetType =>
  PRESET_ANALYTICS_TYPES[presetLabel] ?? 'other';

const getColumnInfoProps = (
  columnId: string,
  tooltipName?: string,
  suffix?: string,
  metric?: MetricReference,
): ThProps['info'] | undefined => {
  const meta = getColumnMeta(columnId, metric);
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
  onTryPattern?: (patternName: string) => void;
  onViewCode?: (patternName: string) => void;
  onRunIndexingPipeline?: (patternName: string) => void;
};

// Keep the OGX callbacks wired for the upcoming Results reintroduction without exposing actions.
const OGX_ACTIONS_ENABLED = false;

function AutoragLeaderboard({
  onViewDetails,
  onSaveNotebook,
  onTryPattern,
  onViewCode,
  onRunIndexingPipeline,
}: AutoragLeaderboardProps): React.JSX.Element | null {
  const { namespace, runId } = useParams<{ namespace: string; runId: string }>();
  const {
    patterns,
    patternsLoading,
    patternsError,
    onRetryPatterns,
    pipelineRun,
    pipelineRunLoading,
    bestPatternKey,
    optimizationMetric,
  } = useAutoragResultsContext();
  const optimizationMetricKey = metricKey(optimizationMetric);
  const optimizationMetricLabel = metricLabel(optimizationMetric);

  // Sorting state
  const [activeSort, setActiveSort] = React.useState<{
    id: string;
    direction: 'asc' | 'desc';
  }>({ id: 'rank', direction: 'asc' });

  // Check if pipeline is still running
  const pipelineRunning = isRunInProgress(pipelineRun?.state);

  // Extract all unique metric references across all patterns.
  const metricKeys = React.useMemo<MetricColumn[]>(() => {
    const columns = new Map<string, MetricColumn>();
    Object.values(patterns).forEach((pattern: AutoragPattern) => {
      pattern.evaluation.metrics.forEach((m) => {
        const metric = { name: m.name, evaluator: m.evaluator };
        const id = metricKey(metric);
        if (!columns.has(id)) {
          columns.set(id, { id, metric });
        }
      });
    });
    return Array.from(columns.values()).toSorted(
      (a, b) =>
        metricLabel(a.metric).localeCompare(metricLabel(b.metric)) || a.id.localeCompare(b.id),
    );
  }, [patterns]);

  // Metric keys excluding the optimized metric (shown in sticky column)
  const optimizedMetricColumns = metricKeys.filter(
    (metric) =>
      normalizeMetricReference(metric.metric).name ===
      normalizeMetricReference(optimizationMetric).name,
  );
  const nonOptimizedMetricKeys =
    optimizationMetric.evaluator !== undefined
      ? metricKeys.filter((metric) => metric.id !== optimizationMetricKey)
      : optimizedMetricColumns.length === 1
        ? metricKeys.filter((metric) => metric.id !== optimizedMetricColumns[0].id)
        : metricKeys;
  // Column definitions — source of truth for column IDs, labels, and default order.
  // Default order: leading columns first, then remaining sorted by priority / alphabetically.
  const columnDefs = React.useMemo<LeaderboardColumn[]>(() => {
    const leadingColumns: LeaderboardColumn[] = [
      { id: 'rank', label: 'Rank' },
      { id: 'pattern', label: 'Pattern name' },
      { id: 'modelNames', label: 'Model name' },
      {
        id: 'optimized-metric',
        label: `${optimizationMetricLabel} (optimized)`,
        metric: optimizationMetric,
      },
    ];

    const remainingColumns: LeaderboardColumn[] = [
      ...nonOptimizedMetricKeys.map<LeaderboardColumn>((metric) => ({
        id: metric.id,
        label: metricLabel(metric.metric),
        metric: metric.metric,
      })),
      ...SETTINGS_COLUMNS.map<LeaderboardColumn>((col) => ({
        id: col.id,
        label: col.label,
      })),
    ].toSorted((a, b) => {
      const pa = getColumnPriority(a.id, a.metric);
      const pb = getColumnPriority(b.id, b.metric);
      if (pa !== pb) {
        return pa - pb;
      }
      return a.label.localeCompare(b.label);
    });

    return [...leadingColumns, ...remainingColumns];
  }, [nonOptimizedMetricKeys, optimizationMetric, optimizationMetricLabel]);

  // Column visibility and ordering state — whitelist approach so new columns are hidden by default
  const DEFAULT_VISIBLE_IDS = React.useMemo(
    () => new Set(['rank', 'pattern', 'modelNames', 'optimized-metric']),
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

  const handleApplyColumns = React.useCallback(
    (newColumns: ColumnManagementModalColumn[]) => {
      const newVisibleIds = new Set<string>();
      newColumns.forEach((col) => {
        if (col.isShown) {
          newVisibleIds.add(col.key);
        }
      });

      // Track only columns whose visibility actually changed from the prior applied state —
      // a reorder-only save (or a checkbox toggled back to its original state) fires nothing.
      newColumns.forEach((col) => {
        const wasVisible = visibleColumnIds.has(col.key);
        const isShown = col.isShown ?? false;
        if (wasVisible !== isShown) {
          fireAutoragResultsColumnToggled(
            getColumnAnalyticsName(
              col.key,
              columnDefs.find((column) => column.id === col.key)?.metric,
            ),
            isShown,
          );
        }
      });

      setVisibleColumnIds(newVisibleIds);
      setColumnOrder(newColumns.map((col) => col.key));

      // Reset sort to the first visible column if the currently sorted column is being hidden
      const fallbackSortId = newColumns.find((col) => col.isShown)?.key ?? 'rank';
      setActiveSort((prev) =>
        newVisibleIds.has(prev.id) ? prev : { id: fallbackSortId, direction: 'asc' },
      );
    },
    [visibleColumnIds, columnDefs],
  );

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

  // Transform patterns into LeaderboardEntry array
  const data: LeaderboardEntry[] = React.useMemo(() => {
    const entries = Object.entries(patterns).map(
      ([patternName, pattern]: [string, AutoragPattern]) => {
        const getMetricObject = (metric: MetricColumn) => {
          const meanValue = findMetric(pattern, metric.metric)?.scores.mean;
          const isValidNumber = typeof meanValue === 'number' && Number.isFinite(meanValue);
          return {
            mean: isValidNumber ? meanValue : 'N/A',
          };
        };

        // Build metrics object with all available metrics
        const metrics: Record<string, { mean: number | string }> = {};
        metricKeys.forEach((metric) => {
          metrics[metric.id] = getMetricObject(metric);
        });

        const objectiveMean = getObjectiveMetric(pattern, optimizationMetric)?.scores.mean;
        const optimizedMetricValue =
          typeof objectiveMean === 'number' && Number.isFinite(objectiveMean)
            ? objectiveMean
            : 'N/A';

        return {
          rank: undefined, // Assigned only to patterns with a valid objective metric
          patternKey: patternName,
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

    // Initial ranking by optimized metric value, pinning the client-side winning pattern
    // (bestPatternKey, from computePatternRankMap) to rank 1 when it's present.
    const entryByKey = Object.fromEntries(entries.map((entry) => [entry.patternKey, entry]));
    const orderedPatternKeys = orderPatternsByLeaderboardRank(
      entries.map((entry) => entry.patternKey),
      (patternKey) => entryByKey[patternKey].optimizedMetricValue,
      bestPatternKey,
    );

    let nextRank = 1;
    const rankedEntries = orderedPatternKeys.map((patternKey) => {
      const entry = entryByKey[patternKey];
      return {
        ...entry,
        rank:
          typeof entry.optimizedMetricValue === 'number' &&
          Number.isFinite(entry.optimizedMetricValue)
            ? nextRank++
            : undefined,
      };
    });

    // Apply user-selected sorting
    if (activeSort.id === 'rank') {
      return rankedEntries.toSorted((a, b) => {
        if (a.rank === undefined && b.rank === undefined) {
          return 0;
        }
        if (a.rank === undefined) {
          return 1;
        }
        if (b.rank === undefined) {
          return -1;
        }
        return activeSort.direction === 'asc' ? a.rank - b.rank : b.rank - a.rank;
      });
    }
    if (activeSort.id === 'pattern') {
      return rankedEntries.toSorted((a, b) => {
        const comparison = a.pattern.localeCompare(b.pattern);
        return activeSort.direction === 'asc' ? comparison : -comparison;
      });
    }
    if (activeSort.id === 'modelNames') {
      return rankedEntries.toSorted((a, b) => {
        const aDisplay = `${getModelIdShortName(a.generationModelId)} / ${getModelIdShortName(
          a.embeddingsModelId,
        )}`;
        const bDisplay = `${getModelIdShortName(b.generationModelId)} / ${getModelIdShortName(
          b.embeddingsModelId,
        )}`;
        const comparison =
          aDisplay.localeCompare(bDisplay) ||
          a.generationModelId.localeCompare(b.generationModelId) ||
          a.embeddingsModelId.localeCompare(b.embeddingsModelId);
        return activeSort.direction === 'asc' ? comparison : -comparison;
      });
    }

    // Sort by metric column (optimized or non-optimized)
    if (
      activeSort.id === 'optimized-metric' ||
      metricKeys.some((metric) => metric.id === activeSort.id)
    ) {
      const selectedMetricKey = activeSort.id === 'optimized-metric' ? null : activeSort.id;
      return rankedEntries.toSorted((a, b) => {
        const aVal = selectedMetricKey ? a.metrics[selectedMetricKey].mean : a.optimizedMetricValue;
        const bVal = selectedMetricKey ? b.metrics[selectedMetricKey].mean : b.optimizedMetricValue;

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

    // Sort by settings column
    const settingsCol = SETTINGS_COLUMNS.find((col) => col.id === activeSort.id);

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
          return activeSort.direction === 'asc' ? comparison : -comparison;
        }

        // Handle number sorting
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          const comparison = aVal - bVal;
          return activeSort.direction === 'asc' ? comparison : -comparison;
        }

        return 0;
      });
    }

    return rankedEntries;
  }, [patterns, metricKeys, optimizationMetric, activeSort, bestPatternKey]);

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

  // "Organize by" presets for the manage columns modal
  const columnPresets: ColumnPreset[] = React.useMemo(() => {
    const leadingKeys = ['rank', 'pattern', 'modelNames', 'optimized-metric'];
    const metricColumnKeys = nonOptimizedMetricKeys.map((metric) => metric.id);
    const chunkingKeys = ['chunkingMethod', 'chunkingChunkSize', 'chunkingChunkOverlap'];
    const allSettingKeys = SETTINGS_COLUMNS.map((col) => col.id);

    return [
      {
        label: 'Optimization metrics',
        visibleColumnKeys: [...leadingKeys, ...metricColumnKeys],
      },
      {
        label: 'Optimization metrics and chunking',
        visibleColumnKeys: [...leadingKeys, ...metricColumnKeys, ...chunkingKeys],
      },
      {
        label: 'Full configuration',
        visibleColumnKeys: [...leadingKeys, ...metricColumnKeys, ...allSettingKeys],
      },
    ];
  }, [nonOptimizedMetricKeys]);

  const handleViewDetails = (patternKey: string) => {
    onViewDetails?.(patternKey);
  };

  // -- Column render helpers (used in the unified column loop) --

  const getHeaderTestId = (col: LeaderboardColumn): string | undefined => {
    if (col.id === 'rank') {
      return 'rank-header';
    }
    if (col.id === 'pattern') {
      return 'pattern-name-header';
    }
    if (col.id === 'modelNames') {
      return 'model-name-header';
    }
    if (col.id === 'optimized-metric') {
      return metricDomId('metric-header', col.metric!);
    }
    if (col.metric) {
      return metricDomId('metric-header', col.metric);
    }
    const sc = SETTINGS_COLUMNS.find((c) => c.id === col.id);
    return sc ? `${sc.testId}-header` : undefined;
  };

  const getCellTestId = (
    col: LeaderboardColumn,
    rank: number | undefined,
    patternKey: string,
  ): string | undefined => {
    const rowId = rank ?? `unranked-${patternKey}`;
    if (col.id === 'rank') {
      return `rank-${rowId}`;
    }
    if (col.id === 'pattern') {
      return `pattern-name-${rowId}`;
    }
    if (col.id === 'modelNames') {
      return `model-name-${rowId}`;
    }
    if (col.id === 'optimized-metric') {
      return `${metricDomId('metric', col.metric!)}-${rowId}`;
    }
    if (col.metric) {
      return `${metricDomId('metric', col.metric)}-${rowId}`;
    }
    const sc = SETTINGS_COLUMNS.find((c) => c.id === col.id);
    return sc ? `${sc.testId}-${rowId}` : undefined;
  };

  const renderHeaderContent = (col: LeaderboardColumn): React.ReactNode => {
    if (col.id === 'optimized-metric') {
      return (
        <>
          {getColumnHeader(col.id, col.label, col.metric)}{' '}
          <span
            data-testid="optimized-indicator"
            className="autorag-leaderboard__optimized-indicator"
          >
            (optimized)
          </span>
        </>
      );
    }
    return getColumnHeader(col.id, col.label, col.metric);
  };

  const getHeaderInfoProps = (col: LeaderboardColumn): ThProps['info'] | undefined => {
    if (col.id === 'optimized-metric') {
      const metricName = optimizationMetricLabel;
      const hasBrackets = metricName.includes('(');
      return getColumnInfoProps(
        optimizationMetricKey,
        `${metricName} ${hasBrackets ? '[optimized]' : '(optimized)'}`,
        'AutoRAG prioritized performance of this metric and used it to rank patterns.',
        optimizationMetric,
      );
    }
    return getColumnInfoProps(col.id, col.label, undefined, col.metric);
  };

  const renderCellContent = (col: LeaderboardColumn, entry: LeaderboardEntry): React.ReactNode => {
    if (col.id === 'rank') {
      return entry.rank === 1 ? (
        <Label color="teal" icon={<StarIcon />} data-testid="top-rank-label">
          {entry.rank}
        </Label>
      ) : (
        // eslint-disable-next-line prettier/prettier -- preserve the JSX fallback expression format
        (entry.rank ?? 'Unranked')
      );
    }
    if (col.id === 'pattern') {
      return (
        <Button
          variant="link"
          isInline
          onClick={() => handleViewDetails(entry.patternKey)}
          data-testid={`pattern-link-${entry.rank}`}
        >
          {formatPatternName(entry.pattern)}
        </Button>
      );
    }
    if (col.id === 'modelNames') {
      return (
        <>
          <Tooltip content={entry.generationModelId}>
            <span>{getModelIdShortName(entry.generationModelId)}</span>
          </Tooltip>
          <div className="autorag-leaderboard__model-secondary">
            <Tooltip content={entry.embeddingsModelId}>
              <span>{getModelIdShortName(entry.embeddingsModelId)}</span>
            </Tooltip>
          </div>
        </>
      );
    }
    if (col.id === 'optimized-metric') {
      return <MetricCell value={entry.optimizedMetricValue} />;
    }
    if (col.metric) {
      return <MetricCell value={entry.metrics[col.id].mean} />;
    }
    const settingsCol = SETTINGS_COLUMNS.find((c) => c.id === col.id);
    if (settingsCol) {
      const val = entry[settingsCol.field];
      if (SETTINGS_VALUE_TOOLTIPS[String(val)]) {
        return (
          <Tooltip content={SETTINGS_VALUE_TOOLTIPS[String(val)]}>
            <span>{formatSettingsValue(val)}</span>
          </Tooltip>
        );
      }
      return formatSettingsValue(val);
    }
    return null;
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
      <Card>
        <CardBody>
          <Content component={ContentVariants.h3}>Results</Content>
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
        </CardBody>
      </Card>
    );
  }

  // Show error state when pattern fetching failed
  if (patternsError) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="Unable to fetch RAG patterns"
          status="danger"
          variant={EmptyStateVariant.sm}
          data-testid="leaderboard-error"
        >
          <EmptyStateBody>An error occurred while loading pattern results.</EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button variant="link" onClick={onRetryPatterns}>
                Retry
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      </Bullseye>
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
    <Card>
      <CardBody>
        <Content component={ContentVariants.h3}>Results</Content>
        {Object.values(patterns).some(
          (pattern) => !isPatternRankable(pattern, optimizationMetric),
        ) && (
          <Alert
            variant="warning"
            isInline
            title="Some patterns could not be ranked"
            data-testid="invalid-objective-warning"
          >
            Patterns without exactly one finite objective metric are shown as unranked.
          </Alert>
        )}
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
            aria-label="AutoRAG Pattern Leaderboard"
            variant="compact"
            data-testid="leaderboard-table"
            className="autorag-leaderboard"
            isStickyHeader
          >
            <Thead>
              <Tr>
                {visibleColumns.map((col) => {
                  const colMeta = getColumnMeta(col.id, col.metric);
                  return (
                    <Th
                      key={col.id}
                      sort={getSortParams(col.id)}
                      info={getHeaderInfoProps(col)}
                      data-testid={getHeaderTestId(col)}
                      className={col.id === 'rank' ? 'autorag-leaderboard__rank-cell' : undefined}
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
                <Tr
                  key={entry.patternKey}
                  data-testid={`leaderboard-row-${entry.rank ?? `unranked-${entry.patternKey}`}`}
                >
                  {visibleColumns.map((col) => (
                    <Td
                      key={col.id}
                      dataLabel={col.label}
                      data-testid={getCellTestId(col, entry.rank, entry.patternKey)}
                      className={col.id === 'rank' ? 'autorag-leaderboard__rank-cell' : undefined}
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
                    data-testid={`leaderboard-actions-${
                      entry.rank ?? `unranked-${entry.patternKey}`
                    }`}
                  >
                    <ActionsColumn
                      items={[
                        /* eslint-disable @typescript-eslint/no-unnecessary-condition */
                        ...(OGX_ACTIONS_ENABLED &&
                        patterns[entry.patternKey].inference?.responses_template &&
                        onTryPattern
                          ? [
                              {
                                title: 'Try this pattern',
                                onClick: () => onTryPattern(entry.patternKey),
                              },
                            ]
                          : []),
                        /* eslint-enable @typescript-eslint/no-unnecessary-condition */
                        {
                          title: 'View details',
                          onClick: () => handleViewDetails(entry.patternKey),
                        },
                        /* eslint-disable @typescript-eslint/no-unnecessary-condition */
                        ...(OGX_ACTIONS_ENABLED &&
                        patterns[entry.patternKey].inference?.responses_template &&
                        onViewCode
                          ? [
                              {
                                title: 'View code',
                                onClick: () => onViewCode(entry.patternKey),
                              },
                            ]
                          : []),
                        /* eslint-enable @typescript-eslint/no-unnecessary-condition */
                        ...(onRunIndexingPipeline &&
                        patternHasIndexingPipelineSpec(patterns[entry.patternKey])
                          ? [
                              {
                                title: 'Run indexing pipeline',
                                onClick: () => onRunIndexingPipeline(entry.patternKey),
                              },
                            ]
                          : []),
                        {
                          title: 'Save as indexing notebook',
                          onClick: () => onSaveNotebook?.(entry.patternKey, 'indexing'),
                        },
                        {
                          title: 'Save as inference notebook',
                          onClick: () => onSaveNotebook?.(entry.patternKey, 'inference'),
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
        presets={columnPresets}
        onPresetSelect={(presetLabel) =>
          fireAutoragLeaderboardPresetApplied(getPresetAnalyticsType(presetLabel))
        }
      />
    </Card>
  );
}

export default AutoragLeaderboard;
