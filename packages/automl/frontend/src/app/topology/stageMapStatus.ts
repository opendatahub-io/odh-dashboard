import { DEFAULT_SPACER_NODE_TYPE, RunStatus } from '@patternfly/react-topology';
import type {
  ComponentStageMapComponent,
  ComponentStageMapStage,
} from '~/app/hooks/useComponentStageMap';
import type { RunDetailsKF } from '~/app/types/pipeline';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
import { isRunInTerminalState, normalizePipelineRunState } from '~/app/utilities/utils';
import { MAX_TOP_N_TABULAR, MAX_TOP_N_TIMESERIES, MIN_TOP_N } from '~/app/utilities/const';
import { findComponentTaskInRunDetails } from '~/app/hooks/useComponentStatuses';
import { dedupePreservingOrder } from './stageMapConstants';
import { translateStatusForNode } from './parseUtils';

const MAX_CONFIGURE_TOP_N = Math.max(MAX_TOP_N_TABULAR, MAX_TOP_N_TIMESERIES);

export { MAX_CONFIGURE_TOP_N };

export const DEFAULT_TOP_N = 3;

export const BRANCHING_STAGE_ID = 'model_selection';

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
      // Stage-map "skipped" means never ran due to upstream failure — show as pending in UI.
      return RunStatus.Pending;
    default:
      return undefined;
  }
};

export const getComponentRunStatus = (
  component: ComponentStageMapComponent,
  runDetails?: RunDetailsKF,
): RunStatus | undefined => {
  const task = findComponentTaskInRunDetails(runDetails?.task_details ?? [], component.id);
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

/** Branch fan-out dots always pulse together while the branch phase is running. */
export const resolveBranchStepActiveIconVariant = (
  runStatus: RunStatus | undefined,
): ActiveIconVariant | undefined => (runStatus === RunStatus.InProgress ? 'pulse' : undefined);

/** Select models keeps the sync badge while its branch section runs. */
export const resolveModelSelectionActiveIconVariant = (
  runStatus: RunStatus | undefined,
): ActiveIconVariant | undefined => (runStatus === RunStatus.InProgress ? 'sync' : undefined);

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
    return RunStatus.Pending;
  }

  return RunStatus.Pending;
};

export const isStageTerminalFailure = (status: RunStatus | undefined): boolean =>
  status === RunStatus.Failed || status === RunStatus.Cancelled;

/** True when the backend reported this stage failed (not inferred from component-level status). */
export const isInlineStageFailure = (stage?: ComponentStageMapStage): boolean =>
  translateStageStatus(stage?.status) === RunStatus.Failed;

/** True when the stage map marks a stage skipped (never ran due to upstream barrier). */
export const isInlineStageSkipped = (stage?: ComponentStageMapStage): boolean =>
  stage?.status?.trim().toLowerCase() === 'skipped';

/** True when a pre-branch stage (before model_selection) failed inline. */
export const hasPreBranchInlineFailure = (preBranchStages: ComponentStageMapStage[]): boolean =>
  preBranchStages.some((stage) => stage.id !== BRANCHING_STAGE_ID && isInlineStageFailure(stage));

/**
 * Branch fan-out inherits model_selection status. When model selection fails, the whole
 * section (select models, branch steps, and model winner nodes) fails together.
 */
export const resolveBranchPhaseStatus = (
  modelSelectionStatus: RunStatus | undefined,
): RunStatus | undefined => modelSelectionStatus;

export const isStageFinished = (status: RunStatus | undefined): boolean =>
  status === RunStatus.Succeeded || status === RunStatus.Skipped;

const hasAnyInlineStageStatus = (stages: ComponentStageMapStage[]): boolean =>
  stages.some((stage) => translateStageStatus(stage.status) != null);

/** True when model selection published selected models via a status merge. */
const hasBranchingStatusEvidence = (stage: ComponentStageMapStage): boolean =>
  stage.id === BRANCHING_STAGE_ID &&
  Array.isArray(stage.selected_models) &&
  stage.selected_models.length > 0 &&
  translateStageStatus(stage.status) != null;

/**
 * Index of the latest stage that published inline progress. Used to backfill earlier
 * coarse InProgress stages once a later stage has started/completed.
 */
export const findLatestInlineActivityIndex = (stages: ComponentStageMapStage[]): number => {
  let latest = -1;
  stages.forEach((stage, index) => {
    if (translateStageStatus(stage.status) != null) {
      latest = index;
      return;
    }
    if (hasBranchingStatusEvidence(stage)) {
      latest = index;
    }
  });
  return latest;
};

const shouldBackfillEarlierStageAsSucceeded = (
  stageIndex: number,
  latestActivityIndex: number,
  inlineStatus: RunStatus | undefined,
  resolved: RunStatus | undefined,
  stage?: ComponentStageMapStage,
): boolean => {
  if (isInlineStageSkipped(stage)) {
    return false;
  }
  if (latestActivityIndex < 0 || stageIndex >= latestActivityIndex) {
    return false;
  }
  if (inlineStatus === RunStatus.Failed || inlineStatus === RunStatus.Cancelled) {
    return false;
  }
  if (resolved === RunStatus.Failed || resolved === RunStatus.Cancelled) {
    return false;
  }
  return true;
};

const applyEarlierStageBackfill = (
  stageIndex: number,
  latestActivityIndex: number,
  inlineStatus: RunStatus | undefined,
  resolved: RunStatus | undefined,
  stage?: ComponentStageMapStage,
): RunStatus | undefined =>
  shouldBackfillEarlierStageAsSucceeded(
    stageIndex,
    latestActivityIndex,
    inlineStatus,
    resolved,
    stage,
  )
    ? RunStatus.Succeeded
    : resolved;

/**
 * Resolves per-stage statuses in pipeline order.
 *
 * Stages with inline status use that status. When the component is in progress,
 * unresolved stages without inline status all show InProgress together (less jarring
 * than a single-stage frontier between polls). Failures still block later stages.
 */
export const resolveSequentialStageRunStatuses = (
  stages: ComponentStageMapStage[],
  componentStatus: RunStatus | undefined,
  runState?: string,
  hasExplicitFailureInPipeline = false,
): Map<string, RunStatus | undefined> => {
  const statusById = new Map<string, RunStatus | undefined>();
  const hasInlineStatuses = hasAnyInlineStageStatus(stages);
  const latestActivityIndex = findLatestInlineActivityIndex(stages);
  let blockSubsequent = false;
  let blockedByInlineFailure = false;
  let propagatedTerminal: RunStatus | undefined;
  let coarseTerminalAssigned = false;

  const resolveUnresolved = (stage: ComponentStageMapStage): RunStatus | undefined =>
    resolveStageRunStatus(stage, componentStatus, runState, hasExplicitFailureInPipeline);

  const branchingStageIndex = stages.findIndex((stage) => stage.id === BRANCHING_STAGE_ID);

  // Training components publish component_status only when stages finish. Until then the
  // coarse resolver would pin load_data as InProgress for the entire model-selection
  // window. Fast pre-branch stages are treated as done; model_selection carries running.
  if (componentStatus === RunStatus.InProgress && !hasInlineStatuses && branchingStageIndex > 0) {
    for (let stageIndex = 0; stageIndex < stages.length; stageIndex++) {
      const stage = stages[stageIndex];
      if (stageIndex < branchingStageIndex) {
        statusById.set(stage.id, RunStatus.Succeeded);
      } else if (stageIndex === branchingStageIndex) {
        statusById.set(stage.id, RunStatus.InProgress);
      } else {
        statusById.set(stage.id, RunStatus.Pending);
      }
    }
    return statusById;
  }

  for (let stageIndex = 0; stageIndex < stages.length; stageIndex++) {
    const stage = stages[stageIndex];
    const inlineStatus = translateStageStatus(stage.status);

    if (inlineStatus != null) {
      let resolved = applyEarlierStageBackfill(
        stageIndex,
        latestActivityIndex,
        inlineStatus,
        resolveUnresolved(stage),
        stage,
      );
      if (isInlineStageSkipped(stage)) {
        resolved = RunStatus.Pending;
      }
      if (
        blockSubsequent &&
        (blockedByInlineFailure || propagatedTerminal != null || coarseTerminalAssigned)
      ) {
        resolved = RunStatus.Pending;
      }
      statusById.set(stage.id, resolved);
      if (isInlineStageSkipped(stage)) {
        blockSubsequent = true;
        blockedByInlineFailure = true;
        propagatedTerminal = undefined;
      } else if (isStageTerminalFailure(inlineStatus) || isStageTerminalFailure(resolved)) {
        blockSubsequent = true;
        blockedByInlineFailure = isInlineStageFailure(stage);
        if (isStageTerminalFailure(resolved) && !blockedByInlineFailure) {
          propagatedTerminal = resolved;
        }
      } else if (isStageFinished(inlineStatus) || isStageFinished(resolved)) {
        blockSubsequent = true;
        blockedByInlineFailure = false;
        propagatedTerminal = undefined;
      } else if (resolved === RunStatus.InProgress) {
        blockSubsequent = true;
        blockedByInlineFailure = false;
        propagatedTerminal = undefined;
      }
      continue;
    }

    if (blockSubsequent) {
      if (propagatedTerminal != null) {
        statusById.set(stage.id, RunStatus.Pending);
        continue;
      }
      if (blockedByInlineFailure) {
        statusById.set(stage.id, RunStatus.Pending);
        continue;
      }
      if (componentStatus === RunStatus.InProgress) {
        const resolved = applyEarlierStageBackfill(
          stageIndex,
          latestActivityIndex,
          inlineStatus,
          resolveUnresolved(stage),
          stage,
        );
        if (isStageFinished(resolved)) {
          statusById.set(stage.id, resolved);
        } else if (isStageTerminalFailure(resolved)) {
          statusById.set(stage.id, resolved);
          propagatedTerminal = resolved;
        } else {
          statusById.set(stage.id, RunStatus.InProgress);
        }
        continue;
      }
      if (componentStatus === RunStatus.Failed) {
        if (!coarseTerminalAssigned) {
          statusById.set(stage.id, RunStatus.Failed);
          coarseTerminalAssigned = true;
        } else {
          statusById.set(stage.id, RunStatus.Pending);
        }
      } else if (componentStatus === RunStatus.Cancelled) {
        if (!coarseTerminalAssigned) {
          statusById.set(stage.id, RunStatus.Cancelled);
          coarseTerminalAssigned = true;
        } else {
          statusById.set(stage.id, RunStatus.Pending);
        }
      } else if (componentStatus === RunStatus.Succeeded) {
        statusById.set(stage.id, RunStatus.Succeeded);
      } else if (componentStatus === RunStatus.Skipped) {
        statusById.set(stage.id, RunStatus.Pending);
      } else {
        statusById.set(stage.id, RunStatus.Pending);
      }
      continue;
    }

    if (componentStatus === RunStatus.InProgress) {
      if (!hasInlineStatuses) {
        if (coarseTerminalAssigned) {
          statusById.set(stage.id, RunStatus.Pending);
          continue;
        }
        const resolved = applyEarlierStageBackfill(
          stageIndex,
          latestActivityIndex,
          inlineStatus,
          resolveUnresolved(stage),
          stage,
        );
        if (isStageFinished(resolved)) {
          statusById.set(stage.id, resolved);
        } else if (isStageTerminalFailure(resolved)) {
          statusById.set(stage.id, resolved);
          coarseTerminalAssigned = true;
        } else {
          statusById.set(stage.id, RunStatus.InProgress);
        }
        continue;
      }
      const resolved = applyEarlierStageBackfill(
        stageIndex,
        latestActivityIndex,
        inlineStatus,
        resolveUnresolved(stage),
        stage,
      );
      if (isStageFinished(resolved)) {
        statusById.set(stage.id, resolved);
      } else if (isStageTerminalFailure(resolved)) {
        statusById.set(stage.id, resolved);
        blockSubsequent = true;
        propagatedTerminal = resolved;
      } else {
        statusById.set(stage.id, RunStatus.InProgress);
      }
      blockSubsequent = true;
      continue;
    }

    if (componentStatus === RunStatus.Failed) {
      statusById.set(stage.id, RunStatus.Failed);
      blockSubsequent = true;
      coarseTerminalAssigned = true;
      continue;
    }

    if (componentStatus === RunStatus.Cancelled) {
      statusById.set(stage.id, RunStatus.Cancelled);
      blockSubsequent = true;
      coarseTerminalAssigned = true;
      continue;
    }

    if (componentStatus === RunStatus.Skipped) {
      statusById.set(stage.id, RunStatus.Pending);
      blockSubsequent = true;
      coarseTerminalAssigned = true;
      continue;
    }

    statusById.set(stage.id, resolveUnresolved(stage));
  }

  return statusById;
};

export type SelectedModelsResult = {
  models: string[];
  isPlaceholder: boolean;
};

/** Coerce topN to a safe placeholder count for branch topology before real models load. */
export const resolvePlaceholderModelCount = (topN?: number): number => {
  if (topN == null || !Number.isFinite(topN)) {
    return DEFAULT_TOP_N;
  }
  const rounded = Math.trunc(topN);
  if (rounded <= 0) {
    return MIN_TOP_N;
  }
  return Math.min(MAX_CONFIGURE_TOP_N, rounded);
};

export const getSelectedModels = (
  stages: ComponentStageMapStage[],
  topN?: number,
  leaderboardModelNames?: string[],
): SelectedModelsResult => {
  const modelSelectionStage = stages.find((s) => s.id === BRANCHING_STAGE_ID);
  const selectedModels = modelSelectionStage?.selected_models;

  if (
    Array.isArray(selectedModels) &&
    selectedModels.length > 0 &&
    selectedModels.every((m): m is string => typeof m === 'string')
  ) {
    return {
      models: dedupePreservingOrder(selectedModels).slice(0, MAX_CONFIGURE_TOP_N),
      isPlaceholder: false,
    };
  }

  if (leaderboardModelNames && leaderboardModelNames.length > 0) {
    return {
      models: dedupePreservingOrder(leaderboardModelNames).slice(0, MAX_CONFIGURE_TOP_N),
      isPlaceholder: false,
    };
  }

  const count = resolvePlaceholderModelCount(topN);
  return {
    models: Array.from({ length: count }, (_, i) => `placeholder_${i}`),
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
      const promotedNode = nodeById.get(depId);
      return promotedNode != null && isStageFinished(promotedNode.data?.runStatus);
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
    const activeIconVariant = node.id.includes('__step__')
      ? resolveBranchStepActiveIconVariant(runStatus)
      : node.id.endsWith(`__${BRANCHING_STAGE_ID}`)
        ? resolveModelSelectionActiveIconVariant(runStatus)
        : node.id.includes('__model__')
          ? undefined
          : resolveActiveIconVariant(runStatus);
    return {
      ...node,
      data: {
        ...node.data,
        runStatus,
        activeIconVariant,
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
