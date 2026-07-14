import { DEFAULT_SPACER_NODE_TYPE, RunStatus } from '@patternfly/react-topology';
import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import type { RunDetailsKF } from '~/app/types/pipeline';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
import { resolveStageLabel, resolveStepLabel } from './stageMapLabels';
import {
  BRANCHING_STAGE_ID,
  getSelectedModels,
  createActiveIconVariantResolver,
  isStageFinished,
  isStageTerminalFailure,
  isInlineStageFailure,
  resolveBranchPhaseStatus,
  resolveComponentStatus,
  resolveSequentialStageRunStatuses,
  SKIP_COMPONENT_IDS,
  translateStageStatus,
} from './stageMapStatus';
import { createNode } from './utils';

export const buildStageMapTopology = (
  componentStageMap: ComponentStageMap,
  runDetails?: RunDetailsKF,
  runState?: string,
  topN?: number,
  leaderboardModelNames?: string[],
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
      : resolveComponentStatus(component, runDetails, runState);
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
          createNode({
            id: nodeId,
            label,
            pipelineTask: {
              type: 'task',
              name: label,
              status: stage.timestamp ? { startTime: stage.timestamp } : undefined,
            },
            runAfterTasks: pendingRunAfter,
            runStatus,
            activeIconVariant,
          }),
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
      : resolveBranchPhaseStatus(modelSelectionRunStatus, modelSelectionStage);

    // Emit pre-branch stages linearly (load_data, model_selection)
    for (const stage of preBranchStages) {
      const nodeId = `${component.id}__${stage.id}`;
      const label = resolveStageLabel(stage.id);
      const inlineStatus = translateStageStatus(stage.status);
      const runStatus = preBranchStatuses.get(stage.id);
      const activeIconVariant = resolveActiveIconVariant(runStatus, inlineStatus);

      nodes.push(
        createNode({
          id: nodeId,
          label,
          pipelineTask: {
            type: 'task',
            name: label,
            status: stage.timestamp ? { startTime: stage.timestamp } : undefined,
          },
          runAfterTasks: pendingRunAfter,
          runStatus,
          activeIconVariant,
        }),
      );

      markPipelineBlockedIfFailed(runStatus);
      pendingRunAfter = [nodeId];
    }

    // Fan out: N branches from model_selection
    const branchSourceNodeId = pendingRunAfter[0];
    const { models, isPlaceholder } = getSelectedModels(
      component.stages,
      topN,
      leaderboardModelNames,
    );
    const branchTailNodeIds: string[] = [];

    const steps = modelSelectionStage?.steps ?? [];

    // Branch children share branchPhaseStatus but are not themselves inline "started"
    // stages. Pass no inline status so the pipeline-wide resolver keeps a single sync
    // (first in-progress child) and pulses every subsequent step and model node.
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
        const activeIconVariant = resolveActiveIconVariant(stepStatus, undefined);

        nodes.push(
          createNode({
            id: stepNodeId,
            label: stepLabel,
            pipelineTask: { type: 'task', name: stepLabel },
            runAfterTasks: [branchPreviousNodeId],
            runStatus: stepStatus,
            activeIconVariant,
          }),
        );

        markPipelineBlockedIfFailed(stepStatus);
        branchPreviousNodeId = stepNodeId;
      }

      // Model name nodes mirror model_selection — they label the branch terminus, not
      // downstream refit/evaluate work still in flight on the component.
      const branchStatus = branchPhaseStatus;
      const modelActiveIconVariant = resolveActiveIconVariant(branchStatus, undefined);
      const modelNodeId = `${component.id}__model__${branchKey}`;
      nodes.push(
        createNode({
          id: modelNodeId,
          label: modelLabel,
          pipelineTask: { type: 'task', name: modelLabel },
          runAfterTasks: [branchPreviousNodeId],
          runStatus: branchStatus,
          activeIconVariant: modelActiveIconVariant,
        }),
      );

      markPipelineBlockedIfFailed(branchStatus);
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

    const shouldKeepPostBranchPending =
      !isStageFinished(modelSelectionRunStatus) &&
      componentStatus !== RunStatus.InProgress &&
      !(componentStatus === RunStatus.Failed && !isInlineStageFailure(modelSelectionStage));
    const postBranchStatuses = shouldKeepPostBranchPending
      ? new Map(postBranchStages.map((stage) => [stage.id, RunStatus.Pending]))
      : resolveSequentialStageRunStatuses(postBranchStages, componentStatus);

    for (const stage of postBranchStages) {
      const nodeId = `${component.id}__${stage.id}`;
      const label = resolveStageLabel(stage.id);
      const inlineStatus = translateStageStatus(stage.status);
      const runStatus = postBranchStatuses.get(stage.id);
      const activeIconVariant = resolveActiveIconVariant(runStatus, inlineStatus);

      nodes.push(
        createNode({
          id: nodeId,
          label,
          pipelineTask: {
            type: 'task',
            name: label,
            status: stage.timestamp ? { startTime: stage.timestamp } : undefined,
          },
          runAfterTasks: pendingRunAfter,
          runStatus,
          activeIconVariant,
        }),
      );

      markPipelineBlockedIfFailed(runStatus);
      pendingRunAfter = [nodeId];
    }
  }

  return nodes;
};
