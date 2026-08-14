import type { PipelineNodeModelExpanded } from '~/app/types/topology';

/** Mirrors stageMapStatus.BRANCHING_STAGE_ID without importing PF topology. */
const BRANCHING_STAGE_ID = 'model_selection';

export type BranchExpandOptions = {
  /** When false (default), show shared spine + winner branch only. */
  modelsExpanded: boolean;
  /**
   * Succeeded run with a known best model — show model name + "Winner" subtitle + star.
   * Otherwise model terminus uses "Model" + Winner badge (no star).
   */
  winnerResolved: boolean;
  winnerModelLabel?: string;
  winnerModelKey?: string;
};

const BRANCH_STARTED_STATUSES = new Set(['InProgress', 'Succeeded', 'Failed', 'Cancelled']);

const normalizeMatchKey = (value: string): string => value.replace(/\s+/g, '').toLowerCase();

/** Avoid short prefix false-positives (e.g. "lightgbm" vs "lightgbmxt_…"). */
const MIN_PREFIX_MATCH_LEN = 12;

/**
 * Exact match, or longer name starts with shorter (leaderboard keys often add
 * suffixes like `_FULL` that topology branch labels omit).
 */
const valuesLooselyMatch = (left: string, right: string): boolean => {
  if (left === right) {
    return true;
  }
  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left];
  if (shorter.length < MIN_PREFIX_MATCH_LEN) {
    return false;
  }
  if (!longer.startsWith(shorter)) {
    return false;
  }
  if (shorter.length === longer.length) {
    return true;
  }
  const next = longer[shorter.length];
  const prev = shorter[shorter.length - 1];
  // Reject alphanumeric continuation (e.g. lightgbm vs lightgbmxt_FULL); allow delimiter suffixes (_v2).
  if (/[a-z0-9]/i.test(next) && /[a-z0-9]/i.test(prev)) {
    return false;
  }
  return true;
};

const isModelTerminusId = (nodeId: string): boolean => /__model__branch-\d+$/.test(nodeId);

const isAnyBranchNodeId = (nodeId: string): boolean =>
  /__step__.+__branch-\d+$/.test(nodeId) ||
  /__branch-\d+__step__/.test(nodeId) ||
  isModelTerminusId(nodeId);

const getModelTerminus = (
  branchNodes: PipelineNodeModelExpanded[],
): PipelineNodeModelExpanded | undefined => branchNodes.find((node) => isModelTerminusId(node.id));

/** True when the topology has multiple branches and the branch phase has started. */
export const canShowModelsExpandToggle = (
  topologyNodes: PipelineNodeModelExpanded[] | undefined,
): boolean => {
  if (!topologyNodes?.length) {
    return false;
  }
  const modelTermini = topologyNodes.filter((node) => isModelTerminusId(node.id));
  if (modelTermini.length < 2) {
    return false;
  }
  return topologyNodes.some((node) => {
    if (!isAnyBranchNodeId(node.id)) {
      return false;
    }
    const status = node.data?.runStatus;
    return typeof status === 'string' && BRANCH_STARTED_STATUSES.has(status);
  });
};

export const isBranchingStageNodeId = (nodeId: string): boolean =>
  nodeId.endsWith(`__${BRANCHING_STAGE_ID}`);

export const matchesWinnerModel = (
  modelNode: PipelineNodeModelExpanded,
  options: Pick<BranchExpandOptions, 'winnerModelLabel' | 'winnerModelKey'>,
): boolean => {
  const nodeValues = [modelNode.label, modelNode.id].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
  const candidates = [options.winnerModelLabel, options.winnerModelKey].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
  if (nodeValues.length === 0 || candidates.length === 0) {
    return false;
  }
  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeMatchKey(candidate);
    return nodeValues.some((value) =>
      valuesLooselyMatch(normalizeMatchKey(value), normalizedCandidate),
    );
  });
};

export const resolveWinnerBranchIndex = (
  branches: Map<number, PipelineNodeModelExpanded[]>,
  branchIndices: number[],
  options: Pick<BranchExpandOptions, 'winnerModelLabel' | 'winnerModelKey'>,
): number | undefined => {
  for (const index of branchIndices) {
    const modelNode = getModelTerminus(branches.get(index) ?? []);
    if (modelNode && matchesWinnerModel(modelNode, options)) {
      return index;
    }
  }
  return undefined;
};

/** Branch indices to lay out: all when expanded, else winner (or first) spine. */
export const resolveVisibleBranchIndices = (
  branchIndices: number[],
  branches: Map<number, PipelineNodeModelExpanded[]>,
  options: BranchExpandOptions,
): number[] => {
  if (options.modelsExpanded || branchIndices.length <= 1) {
    return branchIndices;
  }
  const winnerIndex = resolveWinnerBranchIndex(branches, branchIndices, options);
  if (winnerIndex !== undefined) {
    return [winnerIndex];
  }
  return branchIndices.slice(0, 1);
};
