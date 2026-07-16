import { RunStatus } from '@patternfly/react-topology';
import type {
  ComponentStageMapComponent,
  ComponentStageMapStage,
} from '~/app/hooks/useComponentStageMap';
import type { RunDetailsKF } from '~/app/types/pipeline';
import { isRunInTerminalState } from '~/app/utilities/utils';
import { MAX_RAG_PATTERNS, MIN_RAG_PATTERNS } from '~/app/utilities/const';
import { componentIdToTaskId } from '~/app/hooks/useComponentStatuses';
import { dedupePreservingOrder } from './stageMapConstants';
import { translateStatusForNode } from './parseUtils';

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
  const task = runDetails?.task_details.find(
    (td) => td.display_name === taskId || td.task_id === taskId,
  );
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- task may be undefined from find()
  if (task?.state) {
    const translatedStatus = translateStatusForNode(task.state);
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

/**
 * Resolves per-stage statuses in pipeline order.
 *
 * Stages with inline status use that status. When the component is in progress,
 * stages without inline status also show in progress (avoids stepping one-by-one
 * as status files arrive). After an inline completed/failed stage, only the
 * next unresolved stage without inline status gets the sequential slot when the
 * component is no longer uniformly in progress; failures still block later stages.
 */
export const resolveSequentialStageRunStatuses = (
  stages: ComponentStageMapStage[],
  componentStatus: RunStatus | undefined,
  runState?: string,
  hasExplicitFailureInPipeline = false,
): Map<string, RunStatus | undefined> => {
  const statusById = new Map<string, RunStatus | undefined>();
  let blockSubsequent = false;
  let blockedByInlineFailure = false;

  for (const stage of stages) {
    const inlineStatus = translateStageStatus(stage.status);

    if (inlineStatus != null) {
      const resolved = resolveStageRunStatus(
        stage,
        componentStatus,
        runState,
        hasExplicitFailureInPipeline,
      );
      statusById.set(stage.id, resolved);
      if (isStageTerminalFailure(inlineStatus)) {
        blockSubsequent = true;
        blockedByInlineFailure = true;
      } else if (isStageFinished(inlineStatus)) {
        blockSubsequent = true;
        blockedByInlineFailure = false;
      }
      continue;
    }

    if (blockSubsequent) {
      if (blockedByInlineFailure) {
        statusById.set(stage.id, RunStatus.Pending);
        continue;
      }
      if (componentStatus === RunStatus.InProgress) {
        statusById.set(
          stage.id,
          resolveStageRunStatus(stage, componentStatus, runState, hasExplicitFailureInPipeline),
        );
        blockSubsequent = false;
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
      statusById.set(
        stage.id,
        resolveStageRunStatus(stage, componentStatus, runState, hasExplicitFailureInPipeline),
      );
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

    statusById.set(
      stage.id,
      resolveStageRunStatus(stage, componentStatus, runState, hasExplicitFailureInPipeline),
    );
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
