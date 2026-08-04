import { DEFAULT_SPACER_NODE_TYPE, RunStatus } from '@patternfly/react-topology';
import type {
  ComponentStageMapComponent,
  ComponentStageMapStage,
} from '~/app/hooks/useComponentStageMap';
import type { RunDetailsKF } from '~/app/types/pipeline';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
import { isRunInTerminalState, normalizePipelineRunState } from '~/app/utilities/utils';
import { MAX_RAG_PATTERNS, MIN_RAG_PATTERNS } from '~/app/utilities/const';
import { componentIdToTaskId } from '~/app/hooks/useComponentStatuses';
import { dedupePreservingOrder } from './stageMapConstants';
import { parseRuntimeInfoFromRunDetails, translateStatusForNode } from './parseUtils';

/** Ceiling for configure-UI-derived pattern counts (matches the max RAG patterns field). */
export const MAX_CONFIGURE_MAX_PATTERNS = MAX_RAG_PATTERNS;

export const DEFAULT_MAX_PATTERNS = 3;

export const BRANCHING_STAGE_ID = 'optimize_templates';

export const SKIP_COMPONENT_IDS = new Set(['publish_component_stage_map']);

export const translateStageStatus = (status?: string): RunStatus | undefined => {
  const normalized = status?.trim().toLowerCase();
  switch (normalized) {
    case 'completed':
      return RunStatus.Succeeded;
    case 'started':
      return RunStatus.InProgress;
    case 'failed':
      return RunStatus.Failed;
    case 'skipped':
      return RunStatus.Skipped;
    default:
      return undefined;
  }
};

export const getComponentRunStatus = (
  component: ComponentStageMapComponent,
  runDetails?: RunDetailsKF,
): RunStatus | undefined => {
  const taskId = componentIdToTaskId(component.id);
  const runtime = parseRuntimeInfoFromRunDetails(taskId, runDetails);
  if (runtime?.state) {
    const translatedStatus = translateStatusForNode(runtime.state);
    if (translatedStatus !== undefined) {
      return translatedStatus;
    }
  }
  if (component.completed_at) {
    return RunStatus.Succeeded;
  }
  if (component.started_at) {
    return RunStatus.InProgress;
  }
  return undefined;
};

export type ActiveIconVariant = 'sync' | 'pulse';

export type ActiveIconVariantResolver = (
  runStatus: RunStatus | undefined,
) => ActiveIconVariant | undefined;

/** First in-progress mapped stage uses sync; subsequent ones use pulse. */
export const createActiveIconVariantResolver = (): ActiveIconVariantResolver => {
  let primaryAssigned = false;

  return (runStatus: RunStatus | undefined): ActiveIconVariant | undefined => {
    if (runStatus !== RunStatus.InProgress) {
      return undefined;
    }
    if (!primaryAssigned) {
      primaryAssigned = true;
      return 'sync';
    }
    return 'pulse';
  };
};

const getTerminalRunFailureStatus = (
  runState?: string,
  hasExplicitFailureInPipeline = false,
): RunStatus | undefined => {
  if (hasExplicitFailureInPipeline) {
    return undefined;
  }
  if (runState == null || !isRunInTerminalState(runState)) {
    return undefined;
  }
  const translated = translateStatusForNode(runState);
  if (translated === RunStatus.Failed || translated === RunStatus.Cancelled) {
    return translated;
  }
  return undefined;
};

export const resolveStageRunStatus = (
  stage: ComponentStageMapStage,
  componentStatus: RunStatus | undefined,
  runState?: string,
  hasExplicitFailureInPipeline = false,
): RunStatus | undefined => {
  const terminalRunFailure = getTerminalRunFailureStatus(runState, hasExplicitFailureInPipeline);
  const inlineStatus = translateStageStatus(stage.status);
  if (inlineStatus != null) {
    if (terminalRunFailure != null && inlineStatus === RunStatus.InProgress) {
      return terminalRunFailure;
    }
    return inlineStatus;
  }

  if (componentStatus === RunStatus.InProgress) {
    return terminalRunFailure ?? RunStatus.InProgress;
  }

  if (componentStatus === RunStatus.Succeeded) {
    return RunStatus.Succeeded;
  }

  if (componentStatus === RunStatus.Failed) {
    return RunStatus.Failed;
  }

  if (componentStatus === RunStatus.Cancelled) {
    return RunStatus.Cancelled;
  }

  if (componentStatus === RunStatus.Skipped) {
    return RunStatus.Skipped;
  }

  return RunStatus.Pending;
};

export const isStageTerminalFailure = (status: RunStatus | undefined): boolean =>
  status === RunStatus.Failed || status === RunStatus.Cancelled;

/** True when the backend reported this stage failed (not inferred from component-level status). */
export const isInlineStageFailure = (stage?: ComponentStageMapStage): boolean =>
  translateStageStatus(stage?.status) === RunStatus.Failed;

/** True when a pre-branch stage (before optimize_templates) failed inline. */
export const hasPreBranchInlineFailure = (preBranchStages: ComponentStageMapStage[]): boolean =>
  preBranchStages.some((stage) => stage.id !== BRANCHING_STAGE_ID && isInlineStageFailure(stage));

/**
 * Branch fan-out steps are not run when pattern optimization explicitly failed inline — keep
 * them pending. When the component failed without granular stage status, branches inherit
 * Failed.
 */
export const resolveBranchPhaseStatus = (
  patternSelectionStatus: RunStatus | undefined,
  patternSelectionStage?: ComponentStageMapStage,
): RunStatus | undefined =>
  patternSelectionStatus === RunStatus.Failed && isInlineStageFailure(patternSelectionStage)
    ? RunStatus.Pending
    : patternSelectionStatus;

export const isStageFinished = (status: RunStatus | undefined): boolean =>
  status === RunStatus.Succeeded || status === RunStatus.Skipped;

const hasAnyInlineStageStatus = (stages: ComponentStageMapStage[]): boolean =>
  stages.some((stage) => translateStageStatus(stage.status) != null);

/**
 * Resolves per-stage statuses in pipeline order.
 *
 * Stages with inline status use that status. When the component is in progress,
 * only the next unresolved stage gets InProgress — later stages stay pending so
 * the tree advances one frontier at a time between status polls. Failures still
 * block later stages (pending after inline failure; terminal run failure propagates).
 */
export const resolveSequentialStageRunStatuses = (
  stages: ComponentStageMapStage[],
  componentStatus: RunStatus | undefined,
  runState?: string,
  hasExplicitFailureInPipeline = false,
): Map<string, RunStatus | undefined> => {
  const statusById = new Map<string, RunStatus | undefined>();
  const hasInlineStatuses = hasAnyInlineStageStatus(stages);
  let blockSubsequent = false;
  let blockedByInlineFailure = false;
  let assignedActiveSlot = false;
  let propagatedTerminal: RunStatus | undefined;

  const resolveUnresolved = (stage: ComponentStageMapStage): RunStatus | undefined =>
    resolveStageRunStatus(stage, componentStatus, runState, hasExplicitFailureInPipeline);

  for (const stage of stages) {
    const inlineStatus = translateStageStatus(stage.status);

    if (inlineStatus != null) {
      const resolved = resolveUnresolved(stage);
      statusById.set(stage.id, resolved);
      if (isStageTerminalFailure(inlineStatus) || isStageTerminalFailure(resolved)) {
        blockSubsequent = true;
        blockedByInlineFailure = isInlineStageFailure(stage);
        if (isStageTerminalFailure(resolved) && !blockedByInlineFailure) {
          propagatedTerminal = resolved;
        }
      } else if (isStageFinished(inlineStatus)) {
        blockSubsequent = true;
        blockedByInlineFailure = false;
        propagatedTerminal = undefined;
      } else if (inlineStatus === RunStatus.InProgress || resolved === RunStatus.InProgress) {
        assignedActiveSlot = true;
        blockSubsequent = true;
        blockedByInlineFailure = false;
        propagatedTerminal = undefined;
      }
      continue;
    }

    if (blockSubsequent) {
      if (propagatedTerminal != null) {
        statusById.set(stage.id, propagatedTerminal);
        continue;
      }
      if (blockedByInlineFailure) {
        statusById.set(stage.id, RunStatus.Pending);
        continue;
      }
      if (componentStatus === RunStatus.InProgress && !assignedActiveSlot) {
        const resolved = resolveUnresolved(stage);
        statusById.set(stage.id, resolved);
        if (isStageTerminalFailure(resolved)) {
          propagatedTerminal = resolved;
        } else {
          assignedActiveSlot = true;
        }
        // Keep blockSubsequent so later unresolved stages stay pending / terminal.
      } else if (componentStatus === RunStatus.Failed) {
        statusById.set(stage.id, RunStatus.Failed);
      } else if (componentStatus === RunStatus.Cancelled) {
        statusById.set(stage.id, RunStatus.Cancelled);
      } else if (componentStatus === RunStatus.Succeeded) {
        statusById.set(stage.id, RunStatus.Succeeded);
      } else if (componentStatus === RunStatus.Skipped) {
        statusById.set(stage.id, RunStatus.Skipped);
      } else {
        statusById.set(stage.id, RunStatus.Pending);
      }
      continue;
    }

    if (componentStatus === RunStatus.InProgress) {
      if (!hasInlineStatuses) {
        statusById.set(stage.id, resolveUnresolved(stage));
        continue;
      }
      if (!assignedActiveSlot) {
        const resolved = resolveUnresolved(stage);
        statusById.set(stage.id, resolved);
        blockSubsequent = true;
        if (isStageTerminalFailure(resolved)) {
          propagatedTerminal = resolved;
        } else {
          assignedActiveSlot = true;
        }
      } else {
        statusById.set(stage.id, RunStatus.Pending);
      }
      continue;
    }

    if (componentStatus === RunStatus.Failed) {
      statusById.set(stage.id, RunStatus.Failed);
      blockSubsequent = true;
      continue;
    }

    if (componentStatus === RunStatus.Cancelled) {
      statusById.set(stage.id, RunStatus.Cancelled);
      blockSubsequent = true;
      continue;
    }

    if (componentStatus === RunStatus.Skipped) {
      statusById.set(stage.id, RunStatus.Skipped);
      blockSubsequent = true;
      continue;
    }

    statusById.set(stage.id, resolveUnresolved(stage));
  }

  return statusById;
};

export type SelectedPatternsResult = {
  patterns: string[];
  isPlaceholder: boolean;
};

/** Coerce maxPatterns to a safe placeholder count for branch topology before real patterns load. */
export const resolvePlaceholderPatternCount = (maxPatterns?: number): number => {
  if (maxPatterns == null || !Number.isFinite(maxPatterns)) {
    return DEFAULT_MAX_PATTERNS;
  }
  const rounded = Math.trunc(maxPatterns);
  if (rounded <= 0) {
    return MIN_RAG_PATTERNS;
  }
  return Math.min(MAX_CONFIGURE_MAX_PATTERNS, rounded);
};

export const getSelectedPatterns = (
  stages: ComponentStageMapStage[],
  maxPatterns?: number,
  leaderboardPatternNames?: string[],
): SelectedPatternsResult => {
  const patternSelectionStage = stages.find((s) => s.id === BRANCHING_STAGE_ID);
  const selectedPatterns = patternSelectionStage?.selected_patterns;

  if (
    Array.isArray(selectedPatterns) &&
    selectedPatterns.length > 0 &&
    selectedPatterns.every((p): p is string => typeof p === 'string')
  ) {
    return {
      patterns: dedupePreservingOrder(selectedPatterns).slice(0, MAX_CONFIGURE_MAX_PATTERNS),
      isPlaceholder: false,
    };
  }

  if (leaderboardPatternNames && leaderboardPatternNames.length > 0) {
    return {
      patterns: dedupePreservingOrder(leaderboardPatternNames).slice(0, MAX_CONFIGURE_MAX_PATTERNS),
      isPlaceholder: false,
    };
  }

  const count = resolvePlaceholderPatternCount(maxPatterns);
  return {
    patterns: Array.from({ length: count }, (_, i) => `placeholder_${i}`),
    isPlaceholder: true,
  };
};

export const getRunTerminalFallback = (runState?: string): RunStatus | undefined =>
  runState && isRunInTerminalState(runState) ? translateStatusForNode(runState) : undefined;

const isWaitingStatus = (status: RunStatus | undefined): boolean =>
  status === RunStatus.Pending || status === undefined;

const isRunStillActive = (runState?: string): boolean => {
  const normalized = normalizePipelineRunState(runState);
  return normalized != null && !isRunInTerminalState(normalized);
};

/**
 * When a predecessor has finished but the next stage has not published status yet,
 * the UI would otherwise show an hourglass while the run is still active. Promote the
 * entire waiting component frontier to InProgress so the between-pod waiting state
 * matches the coarse component-level running state used when stage statuses are absent.
 */
export const promoteWaitingFrontierToInProgress = (
  nodes: PipelineNodeModelExpanded[],
  runState?: string,
): PipelineNodeModelExpanded[] => {
  if (!isRunStillActive(runState)) {
    return nodes;
  }

  const hasInProgress = nodes.some((node) => node.data?.runStatus === RunStatus.InProgress);
  if (hasInProgress) {
    return nodes;
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const isDependencySatisfied = (
    depId: string,
    promoted: Set<string>,
    visiting: Set<string> = new Set(),
  ): boolean => {
    if (promoted.has(depId)) {
      return true;
    }
    if (visiting.has(depId)) {
      return false;
    }
    visiting.add(depId);

    const dep = nodeById.get(depId);
    if (!dep) {
      return false;
    }

    if (dep.type === DEFAULT_SPACER_NODE_TYPE) {
      const parents = dep.runAfterTasks ?? [];
      return (
        parents.length > 0 &&
        parents.every((parentId) => isDependencySatisfied(parentId, promoted, visiting))
      );
    }

    return isStageFinished(dep.data?.runStatus);
  };

  const waitingNodes = nodes.filter(
    (node) => node.type !== DEFAULT_SPACER_NODE_TYPE && isWaitingStatus(node.data?.runStatus),
  );

  const componentIdOf = (nodeId: string): string => nodeId.split('__')[0] ?? nodeId;

  // Seed with nodes whose predecessors are already finished (cross-component / next-pod gap).
  const promoteIds = new Set(
    waitingNodes
      .filter((node) => {
        const deps = node.runAfterTasks ?? [];
        return deps.length > 0 && deps.every((depId) => isDependencySatisfied(depId, new Set()));
      })
      .map((node) => node.id),
  );

  // Only expand within the seeded component(s). That way the between-pod waiting state for
  // the next component matches its coarse all-running state, without lighting later ones.
  const frontierComponentIds = new Set([...promoteIds].map(componentIdOf));

  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const node of waitingNodes) {
      if (promoteIds.has(node.id) || !frontierComponentIds.has(componentIdOf(node.id))) {
        continue;
      }
      const deps = node.runAfterTasks ?? [];
      if (deps.length === 0) {
        continue;
      }
      if (deps.every((depId) => isDependencySatisfied(depId, promoteIds))) {
        promoteIds.add(node.id);
        expanded = true;
      }
    }
  }

  if (promoteIds.size === 0) {
    return nodes;
  }

  const resolveActiveIconVariant = createActiveIconVariantResolver();
  return nodes.map((node) => {
    if (!promoteIds.has(node.id) || !node.data) {
      return node;
    }
    const runStatus = RunStatus.InProgress;
    return {
      ...node,
      data: {
        ...node.data,
        runStatus,
        activeIconVariant: resolveActiveIconVariant(runStatus),
      },
    };
  });
};

/** True when every stage has a recognized inline status (no unresolved gaps). */
const hasCompleteInlineStageStatus = (component: ComponentStageMapComponent): boolean =>
  component.stages.length > 0 &&
  component.stages.every((stage) => translateStageStatus(stage.status) != null);

/** True when any mapped component has explicit task or inline stage failure evidence. */
export const hasExplicitComponentFailureEvidence = (
  components: ComponentStageMapComponent[],
  runDetails?: RunDetailsKF,
): boolean =>
  components.some((component) => {
    if (SKIP_COMPONENT_IDS.has(component.id)) {
      return false;
    }
    const fromTask = getComponentRunStatus(component, runDetails);
    if (fromTask === RunStatus.Failed || fromTask === RunStatus.Cancelled) {
      return true;
    }
    return component.stages.some((stage) => isInlineStageFailure(stage));
  });

/** Component KFP status from run details, or terminal run fallback when the task is unknown. */
export const resolveComponentStatus = (
  component: ComponentStageMapComponent,
  runDetails?: RunDetailsKF,
  runState?: string,
  hasExplicitFailureInPipeline = false,
): RunStatus | undefined => {
  const fromTask = getComponentRunStatus(component, runDetails);
  if (fromTask != null) {
    return fromTask;
  }
  // Suppress terminal fallback only when every stage already has recognized inline status.
  // Partial maps (e.g. completed then unresolved) still need Failed/Cancelled for gaps.
  if (hasCompleteInlineStageStatus(component)) {
    return undefined;
  }
  if (hasExplicitFailureInPipeline) {
    return undefined;
  }
  const terminalFallback = getRunTerminalFallback(runState);
  if (terminalFallback === RunStatus.Failed || terminalFallback === RunStatus.Cancelled) {
    return terminalFallback;
  }
  return undefined;
};
