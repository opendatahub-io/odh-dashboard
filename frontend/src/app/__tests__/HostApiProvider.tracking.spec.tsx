import { renderHook } from '@odh-dashboard/jest-config/hooks';
import { useTrackEvent, useTrackPageEvent } from '@odh-dashboard/analytics/react';
import HostApiProvider from '#~/app/HostApiProvider';

let mockDevMode = false;

jest.mock('#~/utilities/const', () => ({
  ...jest.requireActual('#~/utilities/const'),
  get DEV_MODE() {
    return mockDevMode;
  },
  INTERNAL_DASHBOARD_VERSION: '3.0.0-test',
}));

jest.mock('#~/redux/selectors/project', () => ({
  ...jest.requireActual('#~/redux/selectors/project'),
  useDashboardNamespace: jest.fn(() => ({ dashboardNamespace: 'redhat-ods-applications' })),
}));

jest.mock('#~/redux/selectors', () => ({
  ...jest.requireActual('#~/redux/selectors'),
  useUser: jest.fn(() => ({ username: 'private-user', userID: 'private-user-id' })),
}));

describe('HostApiProvider custom-event forwarding', () => {
  const originalAnalytics = Object.getOwnPropertyDescriptor(window, 'analytics');
  const originalClusterID = Object.getOwnPropertyDescriptor(window, 'clusterID');
  const track = jest.fn();
  const page = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockDevMode = false;
    window.analytics = { track, page };
    window.clusterID = 'cluster-rhoai';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalAnalytics) {
      Object.defineProperty(window, 'analytics', originalAnalytics);
    } else {
      Reflect.deleteProperty(window, 'analytics');
    }
    if (originalClusterID) {
      Object.defineProperty(window, 'clusterID', originalClusterID);
    } else {
      Reflect.deleteProperty(window, 'clusterID');
    }
  });

  it('should forward one event with exact properties and host metadata', () => {
    const { result } = renderHook(useTrackEvent, { wrapper: HostApiProvider });

    result.current('custom-event', { outcome: 'submit', success: false });

    expect(track.mock.calls).toStrictEqual([
      [
        'custom-event',
        { outcome: 'submit', success: false, clusterID: 'cluster-rhoai' },
        { app: { version: '3.0.0-test' } },
      ],
    ]);
  });

  it('should not send events in development mode', () => {
    mockDevMode = true;
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
    const { result } = renderHook(useTrackEvent, { wrapper: HostApiProvider });

    result.current('custom-event', {});

    expect(track).not.toHaveBeenCalled();
  });

  it('should safely ignore events when the SDK is missing', () => {
    Reflect.deleteProperty(window, 'analytics');
    const { result } = renderHook(useTrackEvent, { wrapper: HostApiProvider });

    expect(() => result.current('custom-event', {})).not.toThrow();
    expect(track).not.toHaveBeenCalled();
  });
  it('should forward one page with metadata and emit nothing on mount or rerender', () => {
    const rendered = renderHook(useTrackPageEvent, { wrapper: HostApiProvider });
    rendered.rerender();
    expect(page).not.toHaveBeenCalled();
    rendered.result.current();
    rendered.rerender();
    expect(page.mock.calls).toStrictEqual([
      [undefined, { clusterID: 'cluster-rhoai' }, { app: { version: '3.0.0-test' } }],
    ]);
    expect(track).not.toHaveBeenCalled();
  });

  it('should suppress pages in development and safely ignore a missing SDK', () => {
    const { result } = renderHook(useTrackPageEvent, { wrapper: HostApiProvider });
    mockDevMode = true;
    jest.spyOn(console, 'log').mockImplementation();
    result.current();
    mockDevMode = false;
    Reflect.deleteProperty(window, 'analytics');
    expect(() => result.current()).not.toThrow();
    expect(page).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });
});
