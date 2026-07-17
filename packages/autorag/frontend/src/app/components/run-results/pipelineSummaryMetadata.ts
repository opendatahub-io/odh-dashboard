import type { AutoragPattern } from '~/app/types/autoragPattern';
import type { ComponentStageMap, ComponentStageMapStage } from '~/app/hooks/useComponentStageMap';
import type { PipelineRun } from '~/app/types';
import { dedupePreservingOrder } from '~/app/topology/stageMapConstants';
import type { StepDetail } from '~/app/topology/tree-view/stepMetadata';
import {
  formatDurationBetween,
  formatMetricName,
  getOptimizedMetricForRAG,
} from '~/app/utilities/utils';

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

function resolveEvaluationMetricDisplay(pipelineRun?: PipelineRun): string {
  return formatMetricName(getOptimizedMetricForRAG(pipelineRun));
}

function resolveTotalRunTime(pipelineRun?: PipelineRun): string | undefined {
  if (!pipelineRun) {
    return undefined;
  }
  return formatDurationBetween(pipelineRun.created_at, pipelineRun.finished_at);
}

/**
 * Resolves the display name for the winning pattern. Per decision 1A, the winner is always
 * the client-side rank-1 pattern (`bestPatternKey`, derived from `computePatternRankMap`) —
 * there is no backend `best_model`-equivalent field for AutoRAG patterns.
 */
function resolveWinningPatternDisplay(
  patterns: Record<string, AutoragPattern>,
  bestPatternKey?: string,
): string | undefined {
  if (!bestPatternKey || !Object.hasOwn(patterns, bestPatternKey)) {
    return undefined;
  }
  return patterns[bestPatternKey].name || bestPatternKey;
}

/** Pipeline-level summary shown in the step drawer when no node is selected. */
export function getPipelineSummaryDetails(
  pipelineRun: PipelineRun | undefined,
  componentStageMap: ComponentStageMap | undefined,
  patterns: Record<string, AutoragPattern>,
  bestPatternKey?: string,
): StepDetail[] {
  return [
    { label: 'Total run time', value: resolveTotalRunTime(pipelineRun) ?? '—' },
    {
      label: 'Patterns evaluated',
      value: resolvePatternsEvaluated(componentStageMap, patterns)?.toString() ?? '—',
    },
    {
      label: 'Winning pattern',
      value: resolveWinningPatternDisplay(patterns, bestPatternKey) ?? '—',
    },
    {
      label: 'Evaluation metric',
      value: resolveEvaluationMetricDisplay(pipelineRun),
    },
  ];
}
