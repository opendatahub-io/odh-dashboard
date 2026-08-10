import type { PipelineNodeModelExpanded } from '~/app/types/topology';

/** Mirrors stageMapStatus.BRANCHING_STAGE_ID without importing PF topology. */
const BRANCHING_STAGE_ID = 'optimize_templates';

export type BranchExpandOptions = {
  /** When false (default), show shared spine + winner branch only. */
  patternsExpanded: boolean;
  /**
   * Succeeded run with a known best pattern — show pattern name + "winner" subtitle + star.
   * Otherwise pattern terminus uses "Pattern winner" (no subtitle / star).
   */
  winnerResolved: boolean;
  winnerPatternLabel?: string;
  winnerPatternKey?: string;
};

const BRANCH_STARTED_STATUSES = new Set(['InProgress', 'Succeeded', 'Failed', 'Cancelled']);

const normalizeMatchKey = (value: string): string => value.replace(/\s+/g, '').toLowerCase();

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
  const label = patternNode.label ?? '';
  const candidates = [options.winnerPatternLabel, options.winnerPatternKey].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
  if (candidates.length === 0) {
    return false;
  }
  const normalizedLabel = normalizeMatchKey(label);
  return candidates.some((candidate) => normalizeMatchKey(candidate) === normalizedLabel);
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
