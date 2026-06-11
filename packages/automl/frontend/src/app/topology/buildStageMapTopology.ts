import { DEFAULT_SPACER_NODE_TYPE, RunStatus } from '@patternfly/react-topology';
import type {
  ComponentStageMap,
  ComponentStageMapComponent,
  ComponentStageMapStage,
} from '~/app/hooks/useComponentStageMap';
import type { RunDetailsKF } from '~/app/types/pipeline';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
import { isRunInTerminalState } from '~/app/utilities/utils';
import { componentIdToTaskId } from '~/app/hooks/useComponentStatuses';
import { createNode } from './utils';
import { translateStatusForNode } from './parseUtils';

const DEFAULT_TOP_N = 3;

/* eslint-disable camelcase -- keys match backend stage IDs */
const STAGE_DISPLAY_NAMES: Record<string, string> = {
  validate_inputs: 'Validate inputs',
  read_and_sample: 'Read and sample data',
  cleanse: 'Cleanse data',
  split: 'Split data',
  write_outputs: 'Write outputs',
  load_data: 'Load data',
  model_selection: 'Model selection',
  refit_full: 'Refit models',
  evaluate_models: 'Evaluate models',
  build_leaderboard: 'Build leaderboard',
};

const BRANCHING_STAGE_ID = 'model_selection';

const SKIP_COMPONENT_IDS = new Set(['publish_component_stage_map']);

const fallbackStageLabel = (stageId: string): string => {
  const spaced = stageId.replace(/[-_]+/g, ' ').trim();
  if (!spaced) {
    return stageId;
  }
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const resolveStageLabel = (stageId: string): string =>
  STAGE_DISPLAY_NAMES[stageId] ?? fallbackStageLabel(stageId);

const STEP_DISPLAY_NAMES: Record<string, string> = {
  feature_engineering: 'Feature engineering',
  model_training: 'Model training',
  stacking: 'Stacking',
  model_evaluation: 'Model evaluation',
};

const resolveStepLabel = (stepId: string): string =>
  STEP_DISPLAY_NAMES[stepId] ?? fallbackStageLabel(stepId);

/* eslint-enable camelcase */

const translateStageStatus = (status?: string): RunStatus | undefined => {
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

const getComponentRunStatus = (
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

const resolveStageRunStatus = (
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

type SelectedModelsResult = {
  models: string[];
  isPlaceholder: boolean;
};

const getSelectedModels = (
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

export const buildStageMapTopology = (
  componentStageMap: ComponentStageMap,
  runDetails?: RunDetailsKF,
  runState?: string,
  topN?: number,
): PipelineNodeModelExpanded[] => {
  const terminalFallback =
    runState && isRunInTerminalState(runState) ? translateStatusForNode(runState) : undefined;

  const nodes: PipelineNodeModelExpanded[] = [];
  // Tracks the node(s) that the next node should follow.
  // Multiple entries when branches need to converge.
  let pendingRunAfter: string[] = [];

  for (const component of componentStageMap.components) {
    if (SKIP_COMPONENT_IDS.has(component.id)) {
      continue;
    }

    const componentStatus = getComponentRunStatus(component, runDetails);
    const hasBranchingStages = component.stages.some((s) => s.id === BRANCHING_STAGE_ID);

    if (!hasBranchingStages) {
      for (const stage of component.stages) {
        const nodeId = `${component.id}__${stage.id}`;
        const label = resolveStageLabel(stage.id);
        const runStatus = resolveStageRunStatus(stage, componentStatus, terminalFallback);

        nodes.push(
          createNode(
            nodeId,
            label,
            {
              type: 'task',
              name: label,
              status: stage.timestamp ? { startTime: stage.timestamp } : undefined,
            },
            pendingRunAfter,
            runStatus,
          ),
        );

        pendingRunAfter = [nodeId];
      }
      continue;
    }

    // Component has branching: split into pre-branch, branch, and post-branch stages
    const branchIndex = component.stages.findIndex((s) => s.id === BRANCHING_STAGE_ID);
    const preBranchStages = component.stages.slice(0, branchIndex + 1);
    const postBranchStages = component.stages.slice(branchIndex + 1);

    // Emit pre-branch stages linearly (load_data, model_selection)
    for (const stage of preBranchStages) {
      const nodeId = `${component.id}__${stage.id}`;
      const label = resolveStageLabel(stage.id);
      const runStatus = resolveStageRunStatus(stage, componentStatus, terminalFallback);

      nodes.push(
        createNode(
          nodeId,
          label,
          {
            type: 'task',
            name: label,
            status: stage.timestamp ? { startTime: stage.timestamp } : undefined,
          },
          pendingRunAfter,
          runStatus,
        ),
      );

      pendingRunAfter = [nodeId];
    }

    // Fan out: N branches from model_selection
    const branchSourceNodeId = pendingRunAfter[0];
    const { models, isPlaceholder } = getSelectedModels(component.stages, topN);
    const branchTailNodeIds: string[] = [];

    const modelSelectionStage = component.stages.find((s) => s.id === BRANCHING_STAGE_ID);
    const steps = modelSelectionStage?.steps ?? [];

    for (let modelIdx = 0; modelIdx < models.length; modelIdx++) {
      const modelId = models[modelIdx];
      const modelLabel = isPlaceholder ? `Model ${modelIdx + 1}` : modelId;
      const branchKey = `branch-${modelIdx}`;

      // Emit step nodes first in each branch (e.g. feature_engineering → model_training → …)
      let branchPreviousNodeId = branchSourceNodeId;
      for (const stepId of steps) {
        const stepNodeId = `${component.id}__step__${stepId}__${branchKey}`;
        const stepLabel = resolveStepLabel(stepId);
        const stepStatus = resolveStageRunStatus(
          modelSelectionStage ?? { id: BRANCHING_STAGE_ID, description: '' },
          componentStatus,
          terminalFallback,
        );

        nodes.push(
          createNode(
            stepNodeId,
            stepLabel,
            { type: 'task', name: stepLabel },
            [branchPreviousNodeId],
            stepStatus,
          ),
        );

        branchPreviousNodeId = stepNodeId;
      }

      // Model name node follows the step chain
      const branchStatus = isPlaceholder
        ? componentStatus === RunStatus.Succeeded
          ? RunStatus.InProgress
          : componentStatus
        : resolveStageRunStatus(
            modelSelectionStage ?? { id: BRANCHING_STAGE_ID, description: '' },
            componentStatus,
            terminalFallback,
          );
      const modelNodeId = `${component.id}__model__${branchKey}`;
      nodes.push(
        createNode(
          modelNodeId,
          modelLabel,
          { type: 'task', name: modelLabel },
          [branchPreviousNodeId],
          branchStatus,
        ),
      );

      branchTailNodeIds.push(modelNodeId);
    }

    // Insert a convergence spacer so the fan-in renders as a single merge point.
    // addSpacerNodes only creates spacers for fan-out (multiple nodes sharing the
    // same runAfterTasks); fan-in (one node with multiple parents) needs a manual spacer.
    if (branchTailNodeIds.length > 1) {
      const spacerId = branchTailNodeIds.join('|');
      nodes.push({
        id: spacerId,
        type: DEFAULT_SPACER_NODE_TYPE,
        width: 1,
        height: 1,
        runAfterTasks: branchTailNodeIds,
      });
      pendingRunAfter = [spacerId];
    } else {
      pendingRunAfter = branchTailNodeIds;
    }

    for (const stage of postBranchStages) {
      const nodeId = `${component.id}__${stage.id}`;
      const label = resolveStageLabel(stage.id);
      const runStatus = resolveStageRunStatus(stage, componentStatus, terminalFallback);

      nodes.push(
        createNode(
          nodeId,
          label,
          {
            type: 'task',
            name: label,
            status: stage.timestamp ? { startTime: stage.timestamp } : undefined,
          },
          pendingRunAfter,
          runStatus,
        ),
      );

      pendingRunAfter = [nodeId];
    }
  }

  return nodes;
};
