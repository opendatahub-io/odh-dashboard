import { renderHook } from '@testing-library/react';
import useReconfigureSafeEffect from '~/app/hooks/useReconfigureSafeEffect';

describe('useReconfigureSafeEffect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not fire callback on initial mount', () => {
    const callback = jest.fn();
    renderHook(() => useReconfigureSafeEffect(callback, ['value-a']));

    expect(callback).not.toHaveBeenCalled();
  });

  it('should fire callback when a dependency changes', () => {
    const callback = jest.fn();
    const { rerender } = renderHook(({ dep }) => useReconfigureSafeEffect(callback, [dep]), {
      initialProps: { dep: 'initial' },
    });

    expect(callback).not.toHaveBeenCalled();

    rerender({ dep: 'changed' });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not fire callback when dependencies are unchanged on rerender', () => {
    const callback = jest.fn();
    const { rerender } = renderHook(({ dep }) => useReconfigureSafeEffect(callback, [dep]), {
      initialProps: { dep: 'stable' },
    });

    rerender({ dep: 'stable' });
    rerender({ dep: 'stable' });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should handle multiple dependencies and fire only when at least one changes', () => {
    const callback = jest.fn();
    const { rerender } = renderHook(({ a, b }) => useReconfigureSafeEffect(callback, [a, b]), {
      initialProps: { a: 'x', b: 'y' },
    });

    expect(callback).not.toHaveBeenCalled();

    // Only first dep changes
    rerender({ a: 'x2', b: 'y' });
    expect(callback).toHaveBeenCalledTimes(1);

    // Only second dep changes
    rerender({ a: 'x2', b: 'y2' });
    expect(callback).toHaveBeenCalledTimes(2);

    // Both change
    rerender({ a: 'x3', b: 'y3' });
    expect(callback).toHaveBeenCalledTimes(3);

    // Neither changes
    rerender({ a: 'x3', b: 'y3' });
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('should not fire callback on StrictMode-style double-mount with identical deps', () => {
    const callback = jest.fn();

    // Simulate StrictMode double-mount: two mounts with the same deps.
    // The first mount sets the ref, the second mount sees identical deps and skips.
    const { unmount } = renderHook(() => useReconfigureSafeEffect(callback, ['value']));
    unmount();

    // Remount with same deps (simulates StrictMode remount)
    renderHook(() => useReconfigureSafeEffect(callback, ['value']));

    expect(callback).not.toHaveBeenCalled();
  });

  it('should use Object.is semantics for comparison', () => {
    const callback = jest.fn();
    const { rerender } = renderHook(({ dep }) => useReconfigureSafeEffect(callback, [dep]), {
      initialProps: { dep: NaN as number },
    });

    // NaN === NaN under Object.is — should NOT fire
    rerender({ dep: NaN });
    expect(callback).not.toHaveBeenCalled();

    // 0 vs -0 are different under Object.is — should fire
    const { rerender: rerender2 } = renderHook(
      ({ dep }) => useReconfigureSafeEffect(callback, [dep]),
      { initialProps: { dep: 0 as number } },
    );

    rerender2({ dep: -0 });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should fire callback on each successive dependency change', () => {
    const callback = jest.fn();
    const { rerender } = renderHook(({ dep }) => useReconfigureSafeEffect(callback, [dep]), {
      initialProps: { dep: 'a' },
    });

    rerender({ dep: 'b' });
    rerender({ dep: 'c' });
    rerender({ dep: 'd' });

    expect(callback).toHaveBeenCalledTimes(3);
  });
});
