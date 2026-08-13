import type { PipelineNodeModelExpanded } from '~/app/types/topology';

/** Mirrors stageMapStatus.BRANCHING_STAGE_ID without importing PF topology. */
const BRANCHING_STAGE_ID = 'optimize_templates';

export type BranchExpandOptions = {
  /** When false (default), show shared spine + winner branch only. */
  patternsExpanded: boolean;
  /**
   * Succeeded run with a known best pattern — show pattern name + "winner" subtitle + star.
   * Otherwise pattern terminus uses "Pattern" + winner badge (no star).
   */
  winnerResolved: boolean;
  winnerPatternLabel?: string;
  winnerPatternKey?: string;
};

const BRANCH_STARTED_STATUSES = new Set(['InProgress', 'Succeeded', 'Failed', 'Cancelled']);

const normalizeMatchKey = (value: string): string => value.replace(/\s+/g, '').toLowerCase();

/** Avoid short prefix false-positives (e.g. "pattern" vs "patternhyde"). */
const MIN_PREFIX_MATCH_LEN = 12;

/**
 * Exact match, or longer name starts with shorter (leaderboard / display names
 * often add suffixes that topology branch labels omit).
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
  // Reject alphanumeric continuation (e.g. branch-1 vs branch-11); allow delimiter suffixes (_v2).
  if (/[a-z0-9]/i.test(next) && /[a-z0-9]/i.test(prev)) {
    return false;
  }
  return true;
};

const isPatternTerminusId = (nodeId: string): boolean => /__pattern__branch-\d+$/.test(nodeId);

const isAnyBranchNodeId = (nodeId: string): boolean =>
  /__step__.+__branch-\d+$/.test(nodeId) ||
  /__branch-\d+__step__/.test(nodeId) ||
  isPatternTerminusId(nodeId);

const getPatternTerminus = (
  branchNodes: PipelineNodeModelExpanded[],
): PipelineNodeModelExpanded | undefined =>
  branchNodes.find((node) => isPatternTerminusId(node.id));

/** True when the topology has multiple branches and the branch phase has started. */
export const canShowPatternsExpandToggle = (
  topologyNodes: PipelineNodeModelExpanded[] | undefined,
): boolean => {
  if (!topologyNodes?.length) {
    return false;
  }
  const patternTermini = topologyNodes.filter((node) => isPatternTerminusId(node.id));
  if (patternTermini.length < 2) {
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

export const matchesWinnerPattern = (
  patternNode: PipelineNodeModelExpanded,
  options: Pick<BranchExpandOptions, 'winnerPatternLabel' | 'winnerPatternKey'>,
): boolean => {
  const nodeValues = [patternNode.label, patternNode.id].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
  const candidates = [options.winnerPatternLabel, options.winnerPatternKey].filter(
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
  options: Pick<BranchExpandOptions, 'winnerPatternLabel' | 'winnerPatternKey'>,
): number | undefined => {
  for (const index of branchIndices) {
    const patternNode = getPatternTerminus(branches.get(index) ?? []);
    if (patternNode && matchesWinnerPattern(patternNode, options)) {
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
  if (options.patternsExpanded || branchIndices.length <= 1) {
    return branchIndices;
  }
  const winnerIndex = resolveWinnerBranchIndex(branches, branchIndices, options);
  if (winnerIndex !== undefined) {
    return [winnerIndex];
  }
  return branchIndices.slice(0, 1);
};
