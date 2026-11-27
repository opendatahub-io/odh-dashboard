import { renderHook } from '@odh-dashboard/jest-config/hooks';
import { usePageTracking } from '../usePageTracking';

describe('usePageTracking', () => {
  it('should wait for a route change before invoking a replacement callback', () => {
    const original = jest.fn();
    const replacement = jest.fn();
    const hook = renderHook(({ routeKey, callback }) => usePageTracking(routeKey, callback), {
      initialProps: { routeKey: '/models', callback: original },
    });
    expect(original).toHaveBeenCalledTimes(1);
    expect(hook).hookToHaveUpdateCount(1);

    hook.rerender({ routeKey: '/models', callback: replacement });
    expect(original).toHaveBeenCalledTimes(1);
    expect(replacement).not.toHaveBeenCalled();

    hook.rerender({ routeKey: '/projects', callback: replacement });
    expect(original).toHaveBeenCalledTimes(1);
    expect(replacement).toHaveBeenCalledTimes(1);

    const combined = jest.fn();
    hook.rerender({ routeKey: '/admin', callback: combined });
    expect(replacement).toHaveBeenCalledTimes(1);
    expect(combined).toHaveBeenCalledTimes(1);

    hook.rerender({ routeKey: '/admin', callback: combined });
    expect(combined).toHaveBeenCalledTimes(1);
    expect(hook).hookToHaveUpdateCount(5);
  });
});
