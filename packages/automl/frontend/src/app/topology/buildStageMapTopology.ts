import { DEFAULT_SPACER_NODE_TYPE, RunStatus } from '@patternfly/react-topology';
import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import type { RunDetailsKF } from '~/app/types/pipeline';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
import { resolveStageLabel, resolveStepLabel } from './stageMapLabels';
import {
  BRANCHING_STAGE_ID,
  getComponentRunStatus,
  getRunTerminalFallback,
  getSelectedModels,
  resolveStageRunStatus,
  SKIP_COMPONENT_IDS,
} from './stageMapStatus';
import { createNode } from './utils';

export const buildStageMapTopology = (
  componentStageMap: ComponentStageMap,
  runDetails?: RunDetailsKF,
  runState?: string,
  topN?: number,
): PipelineNodeModelExpanded[] => {
  const terminalFallback = getRunTerminalFallback(runState);

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
