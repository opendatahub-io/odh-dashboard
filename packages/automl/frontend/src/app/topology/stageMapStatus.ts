import { RunStatus } from '@patternfly/react-topology';
import type {
  ComponentStageMapComponent,
  ComponentStageMapStage,
} from '~/app/hooks/useComponentStageMap';
import type { RunDetailsKF } from '~/app/types/pipeline';
import { isRunInTerminalState } from '~/app/utilities/utils';
import { componentIdToTaskId } from '~/app/hooks/useComponentStatuses';
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
  const taskId = componentIdToTaskId(component.id);
  const task = runDetails?.task_details.find(
    (td) => td.display_name === taskId || td.task_id === taskId,
  );
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

export const resolveStageRunStatus = (
  stage: ComponentStageMapStage,
  componentStatus: RunStatus | undefined,
  runTerminalFallback: RunStatus | undefined,
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

  if (componentStatus === RunStatus.Failed) {
    return RunStatus.Failed;
  }

  return runTerminalFallback;
};

export type SelectedModelsResult = {
  models: string[];
  isPlaceholder: boolean;
};

export const getSelectedModels = (
  stages: ComponentStageMapStage[],
  topN?: number,
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

  const count = topN ?? DEFAULT_TOP_N;
  return {
    models: Array.from({ length: count }, (_, i) => `placeholder_${i}`),
    isPlaceholder: true,
  };
};

export const getRunTerminalFallback = (runState?: string): RunStatus | undefined =>
  runState && isRunInTerminalState(runState) ? translateStatusForNode(runState) : undefined;
