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
  canShowModelsExpandToggle,
  isBranchingStageNodeId,
  matchesWinnerModel,
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
  it('should recognize the model_selection branching stage node', () => {
    expect(isBranchingStageNodeId('training__model_selection')).toBe(true);
    expect(isBranchingStageNodeId('training__load_data')).toBe(false);
  });

  it('should hide the expand toggle until multiple branches have started', () => {
    expect(
      canShowModelsExpandToggle([
        makeNode('training__model__branch-0', 'xgboost', RunStatus.Pending),
        makeNode('training__model__branch-1', 'lightgbm', RunStatus.Pending),
      ]),
    ).toBe(false);

    expect(
      canShowModelsExpandToggle([
        makeNode('training__model__branch-0', 'xgboost', RunStatus.InProgress),
        makeNode('training__model__branch-1', 'lightgbm', RunStatus.Pending),
      ]),
    ).toBe(true);
  });

  it('should match winner labels ignoring spacing', () => {
    const node = makeNode('training__model__branch-0', 'XG Boost');
    expect(
      matchesWinnerModel(node, {
        winnerModelLabel: 'XGBoost',
        winnerModelKey: 'xgboost',
      }),
    ).toBe(true);
  });

  it('should match topology labels to longer leaderboard keys/names', () => {
    const node = makeNode('training__model__branch-2', 'ExtraTreesMSE_BAG_L1');
    expect(
      matchesWinnerModel(node, {
        winnerModelLabel: 'ExtraTreesMSE_B AG_L1_FULL',
        winnerModelKey: 'ExtraTreesMSE_BAG_L1_FULL',
      }),
    ).toBe(true);
  });

  it('should not match a short shared prefix across different models', () => {
    const node = makeNode('training__model__branch-1', 'LightGBMXT_BAG_L2');
    expect(
      matchesWinnerModel(node, {
        winnerModelLabel: 'LightGBM',
        winnerModelKey: 'LightGBM',
      }),
    ).toBe(false);
  });

  it('should resolve the winner branch and collapse to that spine', () => {
    const branches = new Map<number, PipelineNodeModelExpanded[]>([
      [0, [makeNode('training__model__branch-0', 'xgboost')]],
      [1, [makeNode('training__model__branch-1', 'lightgbm')]],
    ]);
    const options = {
      modelsExpanded: false,
      winnerResolved: true,
      winnerModelLabel: 'lightgbm',
    };

    expect(resolveWinnerBranchIndex(branches, [0, 1], options)).toBe(1);
    expect(resolveVisibleBranchIndices([0, 1], branches, options)).toEqual([1]);
    expect(
      resolveVisibleBranchIndices([0, 1], branches, { ...options, modelsExpanded: true }),
    ).toEqual([0, 1]);
  });
});
