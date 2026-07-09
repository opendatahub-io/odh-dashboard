import { DEFAULT_SPACER_NODE_TYPE, RunStatus } from '@patternfly/react-topology';
import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import type { RunDetailsKF } from '~/app/types/pipeline';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
import { resolveStageLabel, resolveStepLabel } from './stageMapLabels';
import {
  BRANCHING_STAGE_ID,
  getComponentRunStatus,
  getSelectedModels,
  createActiveIconVariantResolver,
  isStageFinished,
  isStageTerminalFailure,
  resolveBranchPhaseStatus,
  resolveSequentialStageRunStatuses,
  SKIP_COMPONENT_IDS,
  translateStageStatus,
} from './stageMapStatus';
import { createNode } from './utils';

export const buildStageMapTopology = (
  componentStageMap: ComponentStageMap,
  runDetails?: RunDetailsKF,
  _runState?: string,
  topN?: number,
): PipelineNodeModelExpanded[] => {
  const nodes: PipelineNodeModelExpanded[] = [];
  // Tracks the node(s) that the next node should follow.
  // Multiple entries when branches need to converge.
  let pendingRunAfter: string[] = [];
  const pipelineState = { blocked: false };
  // Only the first in-progress mapped stage in the entire pipeline uses sync.
  const resolveActiveIconVariant = createActiveIconVariantResolver();

  const markPipelineBlockedIfFailed = (runStatus: RunStatus | undefined): void => {
    if (isStageTerminalFailure(runStatus)) {
      pipelineState.blocked = true;
    }
  };

  for (const component of componentStageMap.components) {
    if (SKIP_COMPONENT_IDS.has(component.id)) {
      continue;
    }

    const componentStatus = pipelineState.blocked
      ? undefined
      : getComponentRunStatus(component, runDetails);
    const hasBranchingStages = component.stages.some((s) => s.id === BRANCHING_STAGE_ID);

    if (!hasBranchingStages) {
      const stageStatuses = pipelineState.blocked
        ? new Map(component.stages.map((stage) => [stage.id, RunStatus.Pending]))
        : resolveSequentialStageRunStatuses(component.stages, componentStatus);

      for (const stage of component.stages) {
        const nodeId = `${component.id}__${stage.id}`;
        const label = resolveStageLabel(stage.id);
        const inlineStatus = translateStageStatus(stage.status);
        const runStatus = stageStatuses.get(stage.id);
        const activeIconVariant = resolveActiveIconVariant(runStatus, inlineStatus);

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
            undefined,
            activeIconVariant,
          ),
        );

        markPipelineBlockedIfFailed(runStatus);
        pendingRunAfter = [nodeId];
      }
      continue;
    }

    // Component has branching: split into pre-branch, branch, and post-branch stages
    const branchIndex = component.stages.findIndex((s) => s.id === BRANCHING_STAGE_ID);
    const preBranchStages = component.stages.slice(0, branchIndex + 1);
    const postBranchStages = component.stages.slice(branchIndex + 1);
    const modelSelectionStage = component.stages.find((s) => s.id === BRANCHING_STAGE_ID);

    const preBranchStatuses = pipelineState.blocked
      ? new Map(preBranchStages.map((stage) => [stage.id, RunStatus.Pending]))
      : resolveSequentialStageRunStatuses(preBranchStages, componentStatus);
    const modelSelectionRunStatus = preBranchStatuses.get(BRANCHING_STAGE_ID);
    const branchPhaseStatus = pipelineState.blocked
      ? RunStatus.Pending
      : resolveBranchPhaseStatus(modelSelectionRunStatus);
    const modelSelectionInlineStatus = translateStageStatus(modelSelectionStage?.status);

    // Emit pre-branch stages linearly (load_data, model_selection)
    for (const stage of preBranchStages) {
      const nodeId = `${component.id}__${stage.id}`;
      const label = resolveStageLabel(stage.id);
      const inlineStatus = translateStageStatus(stage.status);
      const runStatus = preBranchStatuses.get(stage.id);
      const activeIconVariant = resolveActiveIconVariant(runStatus, inlineStatus);

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
          undefined,
          activeIconVariant,
        ),
      );

      markPipelineBlockedIfFailed(runStatus);
      pendingRunAfter = [nodeId];
    }

    // Fan out: N branches from model_selection
    const branchSourceNodeId = pendingRunAfter[0];
    const { models, isPlaceholder } = getSelectedModels(component.stages, topN);
    const branchTailNodeIds: string[] = [];

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
        const stepStatus = branchPhaseStatus;
        const activeIconVariant = resolveActiveIconVariant(stepStatus, modelSelectionInlineStatus);

        nodes.push(
          createNode(
            stepNodeId,
            stepLabel,
            { type: 'task', name: stepLabel },
            [branchPreviousNodeId],
            stepStatus,
            undefined,
            activeIconVariant,
          ),
        );

        branchPreviousNodeId = stepNodeId;
      }

      // Model name nodes mirror model_selection — they label the branch terminus, not
      // downstream refit/evaluate work still in flight on the component.
      const branchStatus = branchPhaseStatus;
      const modelActiveIconVariant = resolveActiveIconVariant(
        branchStatus,
        modelSelectionInlineStatus,
      );
      const modelNodeId = `${component.id}__model__${branchKey}`;
      nodes.push(
        createNode(
          modelNodeId,
          modelLabel,
          { type: 'task', name: modelLabel },
          [branchPreviousNodeId],
          branchStatus,
          undefined,
          modelActiveIconVariant,
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

    const postBranchStatuses = pipelineState.blocked
      ? new Map(postBranchStages.map((stage) => [stage.id, RunStatus.Pending]))
      : !isStageFinished(modelSelectionRunStatus) && componentStatus !== RunStatus.InProgress
        ? new Map(postBranchStages.map((stage) => [stage.id, RunStatus.Pending]))
        : resolveSequentialStageRunStatuses(postBranchStages, componentStatus);

    for (const stage of postBranchStages) {
      const nodeId = `${component.id}__${stage.id}`;
      const label = resolveStageLabel(stage.id);
      const inlineStatus = translateStageStatus(stage.status);
      const runStatus = postBranchStatuses.get(stage.id);
      const activeIconVariant = resolveActiveIconVariant(runStatus, inlineStatus);

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
          undefined,
          activeIconVariant,
        ),
      );

      markPipelineBlockedIfFailed(runStatus);
      pendingRunAfter = [nodeId];
    }
  }

  return nodes;
};
