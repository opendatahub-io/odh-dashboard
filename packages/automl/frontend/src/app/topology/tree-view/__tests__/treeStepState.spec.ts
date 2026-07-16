jest.mock('@patternfly/react-topology', () => ({
  RunStatus: {
    Succeeded: 'Succeeded',
    Failed: 'Failed',
    InProgress: 'InProgress',
    Pending: 'Pending',
    Cancelled: 'Cancelled',
    Skipped: 'Skipped',
  },
}));

import { RunStatus } from '@patternfly/react-topology';
import {
  isTreeNodeData,
  isTreeStepState,
  runStatusToTreeStepState,
} from '~/app/topology/tree-view/treeStepState';

describe('isTreeStepState', () => {
  it.each(['completed', 'active', 'pending', 'failed', 'unreached'] as const)(
    'accepts %s',
    (state) => {
      expect(isTreeStepState(state)).toBe(true);
    },
  );

  it.each(['running', '', 'Completed'])('rejects %s', (state) => {
    expect(isTreeStepState(state)).toBe(false);
  });
});

describe('isTreeNodeData', () => {
  it('accepts objects with valid TreeNodeData properties', () => {
    expect(isTreeNodeData({ stepState: 'active', label: 'Load data' })).toBe(true);
    expect(isTreeNodeData({ stepState: 'active', activeIconVariant: 'pulse' })).toBe(true);
    expect(isTreeNodeData({ stepState: 'pending' })).toBe(true);
  });

  it('rejects objects with an arbitrary stepState string', () => {
    expect(isTreeNodeData({ stepState: 'running' })).toBe(false);
  });

  it('rejects non-string labels and invalid activeIconVariant values', () => {
    expect(isTreeNodeData({ stepState: 'active', label: 42 })).toBe(false);
    expect(isTreeNodeData({ stepState: 'active', activeIconVariant: 'spin' })).toBe(false);
  });

  it('rejects non-objects and missing stepState', () => {
    expect(isTreeNodeData(null)).toBe(false);
    expect(isTreeNodeData({ label: 'Load data' })).toBe(false);
  });
});

describe('runStatusToTreeStepState', () => {
  it('maps skipped runs to unreached and pending runs to pending', () => {
    expect(runStatusToTreeStepState(RunStatus.Skipped)).toBe('unreached');
    expect(runStatusToTreeStepState(RunStatus.Pending)).toBe('pending');
    expect(runStatusToTreeStepState(undefined)).toBe('pending');
  });
});
