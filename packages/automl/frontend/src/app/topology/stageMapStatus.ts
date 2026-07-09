import { RunStatus } from '@patternfly/react-topology';
import type {
  ComponentStageMapComponent,
  ComponentStageMapStage,
} from '~/app/hooks/useComponentStageMap';
import type { RunDetailsKF } from '~/app/types/pipeline';
import { isRunInTerminalState } from '~/app/utilities/utils';
import { findComponentTaskInRunDetails } from '~/app/hooks/useComponentStatuses';
import { translateStatusForNode } from './parseUtils';

export const DEFAULT_TOP_N = 3;

export const BRANCHING_STAGE_ID = 'model_selection';

export const SKIP_COMPONENT_IDS = new Set(['publish_component_stage_map']);

export const translateStageStatus = (status?: string): RunStatus | undefined => {
  switch (status) {
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
  const task = findComponentTaskInRunDetails(runDetails?.task_details ?? [], component.id);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- task may be undefined from find()
  if (task?.state) {
    return translateStatusForNode(task.state);
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
  inlineStatus: RunStatus | undefined,
) => ActiveIconVariant | undefined;

/** First in-progress mapped stage uses sync; subsequent ones use pulse. */
export const createActiveIconVariantResolver = (): ActiveIconVariantResolver => {
  let primaryAssigned = false;

  return (
    runStatus: RunStatus | undefined,
    inlineStatus: RunStatus | undefined,
  ): ActiveIconVariant | undefined => {
    if (runStatus !== RunStatus.InProgress) {
      return undefined;
    }
    if (inlineStatus === RunStatus.InProgress || !primaryAssigned) {
      primaryAssigned = true;
      return 'sync';
    }
    return 'pulse';
  };
};

export const resolveStageRunStatus = (
  stage: ComponentStageMapStage,
  componentStatus: RunStatus | undefined,
): RunStatus | undefined => {
  const inlineStatus = translateStageStatus(stage.status);
  if (inlineStatus) {
    return inlineStatus;
  }

  if (componentStatus === RunStatus.InProgress) {
    return RunStatus.InProgress;
  }

  if (componentStatus === RunStatus.Succeeded) {
    return RunStatus.Succeeded;
  }

  return RunStatus.Pending;
};

export const isStageTerminalFailure = (status: RunStatus | undefined): boolean =>
  status === RunStatus.Failed || status === RunStatus.Cancelled;

/** Branch fan-out steps are not run when model selection fails — keep them pending. */
export const resolveBranchPhaseStatus = (
  modelSelectionStatus: RunStatus | undefined,
): RunStatus | undefined =>
  modelSelectionStatus === RunStatus.Failed ? RunStatus.Pending : modelSelectionStatus;

export const isStageFinished = (status: RunStatus | undefined): boolean =>
  status === RunStatus.Succeeded || status === RunStatus.Skipped;

/** True when the backend reported this stage actually started or finished. */
export const hasStageExecutionEvidence = (stage: ComponentStageMapStage): boolean =>
  stage.timestamp != null ||
  stage.status === 'started' ||
  stage.status === 'completed' ||
  stage.status === 'failed';

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
): Map<string, RunStatus | undefined> => {
  const statusById = new Map<string, RunStatus | undefined>();
  let blockSubsequent = false;

  for (const stage of stages) {
    const inlineStatus = translateStageStatus(stage.status);

    if (inlineStatus != null) {
      const resolved = resolveStageRunStatus(stage, componentStatus);
      statusById.set(stage.id, resolved);
      if (isStageTerminalFailure(inlineStatus) || isStageFinished(inlineStatus)) {
        blockSubsequent = true;
      }
      continue;
    }

    if (blockSubsequent) {
      if (componentStatus === RunStatus.InProgress) {
        statusById.set(stage.id, RunStatus.InProgress);
        blockSubsequent = false;
      } else if (componentStatus === RunStatus.Failed) {
        statusById.set(stage.id, RunStatus.Failed);
      } else {
        statusById.set(stage.id, RunStatus.Pending);
      }
      continue;
    }

    if (componentStatus === RunStatus.InProgress) {
      statusById.set(stage.id, RunStatus.InProgress);
      continue;
    }

    if (componentStatus === RunStatus.Failed) {
      statusById.set(stage.id, RunStatus.Failed);
      blockSubsequent = true;
      continue;
    }

    statusById.set(stage.id, resolveStageRunStatus(stage, componentStatus));
  }

  return statusById;
};

export type SelectedModelsResult = {
  models: string[];
  isPlaceholder: boolean;
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
    return { models: selectedModels, isPlaceholder: false };
  }

  if (leaderboardModelNames && leaderboardModelNames.length > 0) {
    return { models: leaderboardModelNames, isPlaceholder: false };
  }

  const count = topN ?? DEFAULT_TOP_N;
  return {
    models: Array.from({ length: count }, (_, i) => `placeholder_${i}`),
    isPlaceholder: true,
  };
};

export const getRunTerminalFallback = (runState?: string): RunStatus | undefined =>
  runState && isRunInTerminalState(runState) ? translateStatusForNode(runState) : undefined;
