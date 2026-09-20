jest.mock('@patternfly/react-topology', () => ({
  RunStatus: {
    Succeeded: 'Succeeded',
    Failed: 'Failed',
    InProgress: 'InProgress',
    Pending: 'Pending',
    Cancelled: 'Cancelled',
  },
}));

import { RunStatus } from '@patternfly/react-topology';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
import {
  canShowPatternsExpandToggle,
  isBranchingStageNodeId,
  matchesWinnerPattern,
  resolveVisibleBranchIndices,
  resolveWinnerBranchIndex,
} from '~/app/topology/tree-view/branchExpand';

const makeNode = (id: string, label: string, runStatus?: RunStatus): PipelineNodeModelExpanded =>
  ({
    id,
    label,
    type: 'DEFAULT_TASK_NODE',
    data: runStatus ? { runStatus } : undefined,
  }) as PipelineNodeModelExpanded;

describe('branchExpand', () => {
  it('should recognize the optimize_templates branching stage node', () => {
    expect(isBranchingStageNodeId('rag_optimization__optimize_templates')).toBe(true);
    expect(isBranchingStageNodeId('rag_optimization__prepare_data')).toBe(false);
  });

  it('should hide the expand toggle until multiple branches have started', () => {
    expect(
      canShowPatternsExpandToggle([
        makeNode('rag__pattern__branch-0', 'Pattern A', RunStatus.Pending),
        makeNode('rag__pattern__branch-1', 'Pattern B', RunStatus.Pending),
      ]),
    ).toBe(false);

    expect(
      canShowPatternsExpandToggle([
        makeNode('rag__pattern__branch-0', 'Pattern A', RunStatus.InProgress),
        makeNode('rag__pattern__branch-1', 'Pattern B', RunStatus.Pending),
      ]),
    ).toBe(true);
  });

  it('should match winner labels ignoring spacing', () => {
    const node = makeNode('rag__pattern__branch-0', 'Pattern H');
    expect(
      matchesWinnerPattern(node, {
        winnerPatternLabel: 'PatternH',
        winnerPatternKey: 'pattern-h',
      }),
    ).toBe(true);
  });

  it('should match topology labels to longer winner display names', () => {
    const node = makeNode('rag__pattern__branch-1', 'PatternGraphRAG');
    expect(
      matchesWinnerPattern(node, {
        winnerPatternLabel: 'PatternGraphRAG_v2',
        winnerPatternKey: 'PatternGraphRAG_v2',
      }),
    ).toBe(true);
  });

  it('should not match branch-1 identifier to branch-11', () => {
    const node = makeNode('rag__pattern__branch-11', 'Pattern Eleven');
    expect(
      matchesWinnerPattern(node, {
        winnerPatternLabel: 'rag__pattern__branch-1',
        winnerPatternKey: 'rag__pattern__branch-1',
      }),
    ).toBe(false);
  });

  it('should not match a short shared prefix across different patterns', () => {
    const node = makeNode('rag__pattern__branch-1', 'PatternGraphRAG');
    expect(
      matchesWinnerPattern(node, {
        winnerPatternLabel: 'PatternGraph',
        winnerPatternKey: 'PatternGraph',
      }),
    ).toBe(false);
  });

  it('should resolve the winner branch and collapse to that spine', () => {
    const branches = new Map<number, PipelineNodeModelExpanded[]>([
      [0, [makeNode('rag__pattern__branch-0', 'Pattern A')]],
      [1, [makeNode('rag__pattern__branch-1', 'Pattern H')]],
    ]);
    const options = {
      patternsExpanded: false,
      winnerResolved: true,
      winnerPatternLabel: 'Pattern H',
    };

    expect(resolveWinnerBranchIndex(branches, [0, 1], options)).toBe(1);
    expect(resolveVisibleBranchIndices([0, 1], branches, options)).toEqual([1]);
    expect(
      resolveVisibleBranchIndices([0, 1], branches, { ...options, patternsExpanded: true }),
    ).toEqual([0, 1]);
  });
});
