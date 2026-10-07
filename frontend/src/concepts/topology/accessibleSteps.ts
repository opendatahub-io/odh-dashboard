import { DEFAULT_SPACER_NODE_TYPE, RunStatus } from '@patternfly/react-topology';
import { PipelineNodeModelExpanded } from './types';
import { getExecutionStateLabel, getRunStatusLabel } from './utils';

export type AccessibleStep = {
  id: string;
  label: string;
  status: RunStatus;
  statusLabel: string;
  sortIndex: number;
};

/** Normalize equivalent statuses so they collapse into one group. */
export const normalizeRunStatus = (status: RunStatus): RunStatus => {
  if (status === RunStatus.FailedToStart) {
    return RunStatus.Failed;
  }
  if (status === RunStatus.InProgress) {
    return RunStatus.Running;
  }
  if (status === RunStatus.Idle) {
    return RunStatus.Pending;
  }
  return status;
};

export const isActionableFailureStatus = (status: RunStatus): boolean =>
  status === RunStatus.Failed || status === RunStatus.Cancelled;

export const getStepStatusLabel = (node: PipelineNodeModelExpanded): string => {
  const state = node.data?.pipelineTask.status?.state;
  const executionLabel = getExecutionStateLabel(state);
  if (executionLabel) {
    return executionLabel;
  }
  const runStatusLabel = getRunStatusLabel(node.data?.runStatus);
  return runStatusLabel || 'Unknown';
};

const computeTopologicalRank = (
  nodeId: string,
  nodesById: Map<string, PipelineNodeModelExpanded>,
  memo: Map<string, number>,
  visiting: Set<string>,
): number => {
  const cached = memo.get(nodeId);
  if (cached !== undefined) {
    return cached;
  }
  if (visiting.has(nodeId)) {
    return 0;
  }
  visiting.add(nodeId);

  const node = nodesById.get(nodeId);
  const dependencies = node?.runAfterTasks ?? [];
  const rank =
    dependencies.length === 0
      ? 0
      : Math.max(
          ...dependencies.map((depId) => computeTopologicalRank(depId, nodesById, memo, visiting)),
        ) + 1;

  memo.set(nodeId, rank);
  visiting.delete(nodeId);
  return rank;
};

/**
 * Builds a flat, topologically sorted list of pipeline run steps for accessible HTML navigation.
 * Includes leaf tasks and artifact nodes with a run status; excludes groups and spacer nodes.
 */
export const buildAccessibleStepList = (nodes: PipelineNodeModelExpanded[]): AccessibleStep[] => {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const rankMemo = new Map<string, number>();

  const steps: AccessibleStep[] = nodes.flatMap((node) => {
    if (node.group || node.type === DEFAULT_SPACER_NODE_TYPE) {
      return [];
    }
    const runStatus = node.data?.runStatus;
    if (runStatus == null) {
      return [];
    }

    return [
      {
        id: node.id,
        label: node.label ?? node.id,
        status: normalizeRunStatus(runStatus),
        statusLabel: getStepStatusLabel(node),
        sortIndex: computeTopologicalRank(node.id, nodesById, rankMemo, new Set()),
      },
    ];
  });

  return steps.toSorted((a, b) => {
    if (a.sortIndex !== b.sortIndex) {
      return a.sortIndex - b.sortIndex;
    }
    return a.label.localeCompare(b.label);
  });
};

export const hasFailedOrCancelledSteps = (steps: AccessibleStep[]): boolean =>
  steps.some((step) => isActionableFailureStatus(step.status));

/** Concise counts for the step navigation toggle, including cancellations. */
export const formatFailureSummary = (steps: AccessibleStep[]): string => {
  const failed = steps.filter((step) => step.status === RunStatus.Failed).length;
  const cancelled = steps.filter((step) => step.status === RunStatus.Cancelled).length;
  return [failed > 0 ? `${failed} failed` : null, cancelled > 0 ? `${cancelled} canceled` : null]
    .filter(Boolean)
    .join(', ');
};

/** Human-readable summary for aria-live announcements. */
export const buildStatusAnnouncement = (steps: AccessibleStep[]): string => {
  const failed = steps.filter((step) => step.status === RunStatus.Failed);
  const cancelled = steps.filter((step) => step.status === RunStatus.Cancelled);

  if (failed.length === 0 && cancelled.length === 0) {
    return '';
  }

  const parts: string[] = [];
  if (failed.length > 0) {
    const names = failed.map((step) => step.label).join(', ');
    parts.push(`${failed.length} failed step${failed.length === 1 ? '' : 's'}: ${names}`);
  }
  if (cancelled.length > 0) {
    const names = cancelled.map((step) => step.label).join(', ');
    parts.push(`${cancelled.length} canceled step${cancelled.length === 1 ? '' : 's'}: ${names}`);
  }
  return parts.join('. ');
};
