import { DEFAULT_SPACER_NODE_TYPE, RunStatus } from '@patternfly/react-topology';
import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import type { RunDetailsKF } from '~/app/types/pipeline';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
import { resolveModelDisplayName } from '~/app/utilities/utils';
import { resolveStageLabel, resolveStepLabel } from './stageMapLabels';
import {
  BRANCHING_STAGE_ID,
  getSelectedModels,
  createActiveIconVariantResolver,
  hasPreBranchInlineFailure,
  isStageFinished,
  isStageTerminalFailure,
  isInlineStageFailure,
  resolveBranchPhaseStatus,
  hasExplicitComponentFailureEvidence,
  resolveComponentStatus,
  resolveSequentialStageRunStatuses,
  promoteWaitingFrontierToInProgress,
  SKIP_COMPONENT_IDS,
} from './stageMapStatus';
import { capModelSelectionSteps } from './stageMapConstants';
import { createNode } from './utils';

export const buildStageMapTopology = (
  componentStageMap: ComponentStageMap,
  runDetails?: RunDetailsKF,
  runState?: string,
  topN?: number,
  leaderboardModelNames?: string[],
  modelRecords?: Record<string, { name?: string }>,
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

  const hasExplicitFailureInPipeline = hasExplicitComponentFailureEvidence(
    componentStageMap.components,
    runDetails,
  );

  for (const component of componentStageMap.components) {
    if (SKIP_COMPONENT_IDS.has(component.id)) {
      continue;
    }

    const componentStatus = pipelineState.blocked
      ? undefined
      : resolveComponentStatus(component, runDetails, runState, hasExplicitFailureInPipeline);
    const hasBranchingStages = component.stages.some((s) => s.id === BRANCHING_STAGE_ID);

    if (!hasBranchingStages) {
      const stageStatuses = pipelineState.blocked
        ? new Map(component.stages.map((stage) => [stage.id, RunStatus.Pending]))
        : resolveSequentialStageRunStatuses(
            component.stages,
            componentStatus,
            runState,
            hasExplicitFailureInPipeline,
          );

      for (const stage of component.stages) {
        const nodeId = `${component.id}__${stage.id}`;
        const label = resolveStageLabel(stage.id);
        const runStatus = stageStatuses.get(stage.id);
        const activeIconVariant = resolveActiveIconVariant(runStatus);

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
      : resolveSequentialStageRunStatuses(
          preBranchStages,
          componentStatus,
          runState,
          hasExplicitFailureInPipeline,
        );
    const modelSelectionRunStatus = preBranchStatuses.get(BRANCHING_STAGE_ID);
    const modelSelectionHasInlineStatus = modelSelectionStage?.status != null;
    const preBranchInlineFailure = hasPreBranchInlineFailure(preBranchStages);
    const branchPhaseStatus =
      pipelineState.blocked || preBranchInlineFailure
        ? RunStatus.Pending
        : resolveBranchPhaseStatus(modelSelectionRunStatus, modelSelectionStage);

    // Emit pre-branch stages linearly (load_data, model_selection)
    for (const stage of preBranchStages) {
      const nodeId = `${component.id}__${stage.id}`;
      const label = resolveStageLabel(stage.id);
      const runStatus = preBranchStatuses.get(stage.id);
      const activeIconVariant = resolveActiveIconVariant(runStatus);

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

    const steps = capModelSelectionSteps(modelSelectionStage?.steps ?? []);

    // Branch children share branchPhaseStatus. The pipeline-wide resolver assigns
    // sync to the first in-progress node and pulse to every subsequent one.
    for (let modelIdx = 0; modelIdx < models.length; modelIdx++) {
      const modelId = models[modelIdx];
      const modelLabel = isPlaceholder
        ? `Model ${modelIdx + 1}`
        : (resolveModelDisplayName(modelRecords ?? {}, modelId) ?? modelId);
      const branchKey = `branch-${modelIdx}`;

      // Emit step nodes first in each branch (e.g. feature_engineering → model_training → …)
      let branchPreviousNodeId = branchSourceNodeId;
      for (const stepId of steps) {
        const stepNodeId = `${component.id}__step__${stepId}__${branchKey}`;
        const stepLabel = resolveStepLabel(stepId);
        const stepStatus = branchPhaseStatus;
        const activeIconVariant = resolveActiveIconVariant(stepStatus);

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
      const modelActiveIconVariant = resolveActiveIconVariant(branchStatus);
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

    const componentEndedWithoutInlineBranchFailure =
      (componentStatus === RunStatus.Failed || componentStatus === RunStatus.Cancelled) &&
      !isInlineStageFailure(modelSelectionStage);
    const shouldKeepPostBranchPending =
      preBranchInlineFailure ||
      (modelSelectionRunStatus === RunStatus.Failed && isInlineStageFailure(modelSelectionStage)) ||
      // Keep post-branch pending until model selection finishes, even while the component
      // task is already RUNNING, but only when model selection itself has explicit stage status.
      (!isStageFinished(modelSelectionRunStatus) &&
        modelSelectionHasInlineStatus &&
        !componentEndedWithoutInlineBranchFailure);
    const postBranchStatuses = shouldKeepPostBranchPending
      ? new Map(postBranchStages.map((stage) => [stage.id, RunStatus.Pending]))
      : resolveSequentialStageRunStatuses(
          postBranchStages,
          componentStatus,
          runState,
          hasExplicitFailureInPipeline,
        );

    for (const stage of postBranchStages) {
      const nodeId = `${component.id}__${stage.id}`;
      const label = resolveStageLabel(stage.id);
      const runStatus = postBranchStatuses.get(stage.id);
      const activeIconVariant = resolveActiveIconVariant(runStatus);

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

  return promoteWaitingFrontierToInProgress(nodes, runState);
};
