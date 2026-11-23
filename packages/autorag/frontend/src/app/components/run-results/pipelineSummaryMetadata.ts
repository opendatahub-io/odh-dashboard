import type { AutoragPattern, MetricReference } from '~/app/types/autoragPattern';
import type { ComponentStageMap, ComponentStageMapStage } from '~/app/hooks/useComponentStageMap';
import type { PipelineRun } from '~/app/types';
import { dedupePreservingOrder } from '~/app/topology/stageMapConstants';
import type { StepDetail } from '~/app/topology/tree-view/stepMetadata';
import { formatDurationBetween, formatPatternName } from '~/app/utilities/utils';
import { DEFAULT_OPTIMIZATION_METRIC } from '~/app/utilities/const';
import {
  computePatternRankMap,
  getBestPatternFromStageMap,
  getCompletePatternRankMap,
  metricLabel,
} from '~/app/utilities/metricUtils';

/**
 * Matches `BRANCHING_STAGE_ID` in `~/app/topology/stageMapStatus`. Duplicated as a local
 * constant (rather than imported) to avoid pulling `@patternfly/react-topology` (and its
 * `d3` ESM dependency) into this module's import graph, which breaks Jest for consumers that
 * don't otherwise mock topology rendering.
 */
const BRANCHING_STAGE_ID = 'optimize_templates';

function isStageNestedRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isComponentStageMapStage(value: unknown): value is ComponentStageMapStage {
  return (
    isStageNestedRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.description === 'string'
  );
}

function findStageInMap(
  componentStageMap: ComponentStageMap | undefined,
  stageId: string,
): ComponentStageMapStage | undefined {
  if (!componentStageMap) {
    return undefined;
  }

  const components = Array.isArray(componentStageMap.components)
    ? componentStageMap.components.filter(isStageNestedRecord)
    : [];

  for (const component of components) {
    const stages = Array.isArray(component.stages)
      ? component.stages.filter(isComponentStageMapStage)
      : [];
    const stage = stages.find((entry) => entry.id === stageId);
    if (stage) {
      return stage;
    }
  }
  return undefined;
}

function resolvePatternsEvaluated(
  componentStageMap: ComponentStageMap | undefined,
  patterns: Record<string, AutoragPattern>,
): number | undefined {
  const patternSelection = findStageInMap(componentStageMap, BRANCHING_STAGE_ID);
  const selectedPatterns = patternSelection?.selected_patterns;
  if (Array.isArray(selectedPatterns)) {
    const uniqueValidPatterns = dedupePreservingOrder(
      selectedPatterns.filter(
        (item): item is string =>
          typeof item === 'string' && item.length > 0 && Object.hasOwn(patterns, item),
      ),
    );
    if (uniqueValidPatterns.length > 0) {
      return uniqueValidPatterns.length;
    }
  }

  const patternCount = Object.keys(patterns).length;
  if (patternCount > 0) {
    return patternCount;
  }

  return undefined;
}

function resolveEvaluationMetricDisplay(optimizationMetric: MetricReference): string {
  return metricLabel(optimizationMetric);
}

function resolveTotalRunTime(pipelineRun?: PipelineRun): string | undefined {
  if (!pipelineRun) {
    return undefined;
  }
  return formatDurationBetween(pipelineRun.created_at, pipelineRun.finished_at);
}

const resolvePatternKey = (
  patterns: Record<string, AutoragPattern>,
  identifier?: string,
): string | undefined => {
  if (!identifier) {
    return undefined;
  }
  if (Object.hasOwn(patterns, identifier)) {
    return identifier;
  }
  const matches = Object.entries(patterns)
    .filter(([, pattern]) => pattern.name === identifier)
    .map(([key]) => key);
  return matches.length === 1 ? matches[0] : undefined;
};

function resolveWinningPatternDisplay(
  patterns: Record<string, AutoragPattern>,
  componentStageMap?: ComponentStageMap,
  rankOnePatternKey?: string,
  optimizationMetric: MetricReference = { name: DEFAULT_OPTIMIZATION_METRIC },
  patternRankMap?: Record<string, number>,
): string | undefined {
  const backendRanks = getCompletePatternRankMap(patterns);
  const fallbackWinner =
    backendRanks === undefined
      ? // Legacy summaries are winner-only surfaces; contextual surfaces use the
        // deterministic rank map below.
        resolvePatternKey(patterns, getBestPatternFromStageMap(componentStageMap))
      : undefined;
  const rankMap =
    patternRankMap ?? backendRanks ?? computePatternRankMap(patterns, optimizationMetric);
  const selectedKey =
    fallbackWinner ?? rankOnePatternKey ?? Object.keys(rankMap).find((key) => rankMap[key] === 1);
  if (!selectedKey || !Object.hasOwn(patterns, selectedKey)) {
    return undefined;
  }
  return formatPatternName(patterns[selectedKey].name || selectedKey);
}

/** Pipeline-level summary shown in the step drawer when no node is selected. */
export function getPipelineSummaryDetails(
  pipelineRun: PipelineRun | undefined,
  componentStageMap: ComponentStageMap | undefined,
  patterns: Record<string, AutoragPattern>,
  rankOnePatternKey?: string,
  optimizationMetric: MetricReference = { name: DEFAULT_OPTIMIZATION_METRIC },
  patternRankMap?: Record<string, number>,
): StepDetail[] {
  return [
    { label: 'Total run time', value: resolveTotalRunTime(pipelineRun) ?? '—' },
    {
      label: 'Patterns evaluated',
      value: resolvePatternsEvaluated(componentStageMap, patterns)?.toString() ?? '—',
      help: {
        header: 'Pattern',
        body: 'A specific combination of chunking, embedding, retrieval, and generation settings being tested.',
      },
    },
    {
      label: 'Winning pattern',
      value:
        resolveWinningPatternDisplay(
          patterns,
          componentStageMap,
          rankOnePatternKey,
          optimizationMetric,
          patternRankMap,
        ) ?? '—',
      help: {
        header: 'Winning pattern',
        body: 'The configuration that achieved the highest evaluation score during optimization.',
      },
    },
    {
      label: 'Evaluation metric',
      value: resolveEvaluationMetricDisplay(optimizationMetric),
    },
  ];
}
