import { resolveTreeNodeVisualState } from '~/app/topology/tree-view/treeNodeVisualState';

describe('resolveTreeNodeVisualState', () => {
  it('should use winner chrome only for an explicitly resolved winner', () => {
    expect(
      resolveTreeNodeVisualState({
        stepState: 'completed',
        justCompleted: true,
        isResolvedWinner: true,
      }),
    ).toBe('winner');
    expect(
      resolveTreeNodeVisualState({
        stepState: 'completed',
        justCompleted: false,
        isResolvedWinner: false,
      }),
    ).toBe('success');
  });

  it('should flash just-completed then rest as success', () => {
    expect(resolveTreeNodeVisualState({ stepState: 'completed', justCompleted: true })).toBe(
      'just-completed',
    );
    expect(resolveTreeNodeVisualState({ stepState: 'completed', justCompleted: false })).toBe(
      'success',
    );
  });

  it('should keep unreached ranked nodes as pending instead of winner chrome', () => {
    expect(
      resolveTreeNodeVisualState({
        stepState: 'unreached',
        justCompleted: false,
        isResolvedWinner: true,
      }),
    ).toBe('pending');
  });

  it('should preserve failed and active states for ranked nodes', () => {
    expect(
      resolveTreeNodeVisualState({
        stepState: 'failed',
        justCompleted: false,
        isResolvedWinner: true,
      }),
    ).toBe('failed');
    expect(
      resolveTreeNodeVisualState({
        stepState: 'active',
        justCompleted: false,
        isResolvedWinner: true,
      }),
    ).toBe('active');
  });

  it('should map failed, active, and pending/unreached states', () => {
    expect(resolveTreeNodeVisualState({ stepState: 'failed', justCompleted: false })).toBe(
      'failed',
    );
    expect(resolveTreeNodeVisualState({ stepState: 'active', justCompleted: false })).toBe(
      'active',
    );
    expect(resolveTreeNodeVisualState({ stepState: 'pending', justCompleted: false })).toBe(
      'pending',
    );
    expect(resolveTreeNodeVisualState({ stepState: 'unreached', justCompleted: false })).toBe(
      'pending',
    );
  });
});
