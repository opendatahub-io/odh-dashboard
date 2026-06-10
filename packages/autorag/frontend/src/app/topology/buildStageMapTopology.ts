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

const DEFAULT_MAX_PATTERNS = 3;

/* eslint-disable camelcase -- keys match backend stage IDs */
const STAGE_DISPLAY_NAMES: Record<string, string> = {
  validate_inputs: 'Validate inputs',
  download_and_sample: 'Download and sample',
  write_output: 'Write output',
  list_and_sample: 'List and sample',
  write_descriptor: 'Write descriptor',
  load_descriptor: 'Load descriptor',
  extract_documents: 'Extract documents',
  prepare_search_space: 'Prepare search space',
  write_report: 'Write report',
  pattern_selection: 'Pattern selection',
  run_optimization: 'Run optimization',
  write_patterns: 'Write patterns',
  build_requests: 'Build requests',
  write_artifacts: 'Write artifacts',
  build_leaderboard: 'Build leaderboard',
};

const BRANCHING_STAGE_ID = 'pattern_selection';
const BRANCH_STAGE_IDS = new Set(['run_optimization', 'write_patterns']);

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

const BRANCH_STAGE_LABELS: Record<string, string> = {
  run_optimization: 'Run optimization',
  write_patterns: 'Write patterns',
};
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

type SelectedPatternsResult = {
  patterns: string[];
  isPlaceholder: boolean;
};

const getSelectedPatterns = (
  stages: ComponentStageMapStage[],
  maxPatterns?: number,
): SelectedPatternsResult => {
  const patternSelectionStage = stages.find((s) => s.id === BRANCHING_STAGE_ID);
  const selectedPatterns = patternSelectionStage?.selected_patterns;

  if (
    Array.isArray(selectedPatterns) &&
    selectedPatterns.length > 0 &&
    selectedPatterns.every((p): p is string => typeof p === 'string')
  ) {
    return { patterns: selectedPatterns, isPlaceholder: false };
  }

  const count = maxPatterns ?? DEFAULT_MAX_PATTERNS;
  return {
    patterns: Array.from({ length: count }, (_, i) => `placeholder_${i}`),
    isPlaceholder: true,
  };
};

export const buildStageMapTopology = (
  componentStageMap: ComponentStageMap,
  runDetails?: RunDetailsKF,
  runState?: string,
  maxPatterns?: number,
): PipelineNodeModelExpanded[] => {
  const terminalFallback =
    runState && isRunInTerminalState(runState) ? translateStatusForNode(runState) : undefined;

  const nodes: PipelineNodeModelExpanded[] = [];
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
    const branchStages = component.stages.filter((s) => BRANCH_STAGE_IDS.has(s.id));
    const postBranchStages = component.stages.filter(
      (s) => !BRANCH_STAGE_IDS.has(s.id) && component.stages.indexOf(s) > branchIndex,
    );

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

    // Fan out: N branches from pattern_selection
    const branchSourceNodeId = pendingRunAfter[0];
    const { patterns, isPlaceholder } = getSelectedPatterns(component.stages, maxPatterns);
    const branchTailNodeIds: string[] = [];

    for (let patternIdx = 0; patternIdx < patterns.length; patternIdx++) {
      const patternId = patterns[patternIdx];
      const patternLabel = isPlaceholder ? `Pattern ${patternIdx + 1}` : patternId;
      const branchKey = `branch-${patternIdx}`;

      const patternSelectionStage = component.stages.find((s) => s.id === BRANCHING_STAGE_ID);
      const branchStatus = isPlaceholder
        ? componentStatus === RunStatus.Succeeded
          ? RunStatus.InProgress
          : componentStatus
        : resolveStageRunStatus(
            patternSelectionStage ?? { id: BRANCHING_STAGE_ID, description: '' },
            componentStatus,
            terminalFallback,
          );
      const patternNodeId = `${component.id}__pattern__${branchKey}`;
      nodes.push(
        createNode(
          patternNodeId,
          patternLabel,
          { type: 'task', name: patternLabel },
          [branchSourceNodeId],
          branchStatus,
        ),
      );

      let branchPreviousNodeId = patternNodeId;

      for (const stage of branchStages) {
        const nodeId = `${component.id}__${stage.id}__${branchKey}`;
        const label = BRANCH_STAGE_LABELS[stage.id] ?? resolveStageLabel(stage.id);
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
            [branchPreviousNodeId],
            runStatus,
          ),
        );

        branchPreviousNodeId = nodeId;
      }

      branchTailNodeIds.push(branchPreviousNodeId);
    }

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
