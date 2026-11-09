import { renderHook } from '@odh-dashboard/jest-config/hooks';
import { useTrackEvent } from '@odh-dashboard/plugin-core/host-api';
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockDevMode = false;
    window.analytics = { track };
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
});
