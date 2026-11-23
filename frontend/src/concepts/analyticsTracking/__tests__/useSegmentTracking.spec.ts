import { renderHook } from '@testing-library/react';
import { useSegmentSetup } from '@odh-dashboard/analytics';
import { useSegmentTracking } from '#~/concepts/analyticsTracking/useSegmentTracking';
import { fireIdentifyEvent, firePageEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';

let mockKey = { segmentKey: 'key', loaded: true, loadError: undefined as Error | undefined };
let mockDisabled = false;
let mockState: { user: string | undefined; clusterID: string | undefined };
let mockUserLoaded = true;
const mockUser = { userID: 'user-1', isAdmin: false, canCreateProjects: true };

jest.mock('@odh-dashboard/analytics', () => ({ useSegmentSetup: jest.fn() }));
jest.mock('#~/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireIdentifyEvent: jest.fn(),
  firePageEvent: jest.fn(),
}));
jest.mock('#~/concepts/analyticsTracking/useWatchSegmentKey', () => ({
  useWatchSegmentKey: () => mockKey,
}));
jest.mock('#~/concepts/analyticsTracking/useTrackUser', () => ({
  useTrackUser: () => [mockUser, mockUserLoaded],
}));
jest.mock('#~/app/AppContext', () => ({
  useAppContext: () => ({
    dashboardConfig: { spec: { dashboardConfig: { disableTracking: mockDisabled } } },
  }),
}));
jest.mock('#~/redux/hooks', () => ({
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

describe('RHOAI analytics setup adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKey = { segmentKey: 'key', loaded: true, loadError: undefined };
    mockDisabled = false;
    mockState = { user: 'username', clusterID: 'cluster-1' };
    mockUserLoaded = true;
  });

  it('should pass dashboard settings and the existing delivery callbacks into shared setup', () => {
    const hook = renderHook(useSegmentTracking);
    const setup = jest.mocked(useSegmentSetup).mock.calls[0][0];
    expect(setup).toEqual({
      segmentKey: 'key',
      cdnURL: 'https://console.redhat.com/connections/cdn',
      apiHost: 'console.redhat.com/connections/api/v1',
      ready: true,
      enabled: true,
      clusterID: 'cluster-1',
      userKey: 'username',
      identify: expect.any(Function),
      trackPageEvent: firePageEvent,
    });
    setup.identify();
    expect(fireIdentifyEvent).toHaveBeenCalledWith({
      userID: 'user-1',
      isAdmin: false,
      canCreateProjects: true,
    });
    hook.rerender();
    expect(jest.mocked(useSegmentSetup).mock.calls[1][0].identify).toBe(setup.identify);
  });

  it('should retain the original readiness and initialization-enable decisions', () => {
    const hook = renderHook(useSegmentTracking);
    mockKey = { ...mockKey, loadError: new Error('unavailable') };
    hook.rerender();
    expect(jest.mocked(useSegmentSetup).mock.lastCall?.[0].ready).toBe(false);
    mockKey = { ...mockKey, loadError: undefined };
    mockDisabled = true;
    hook.rerender();
    expect(jest.mocked(useSegmentSetup).mock.lastCall?.[0]).toEqual(
      expect.objectContaining({ ready: true, enabled: false }),
    );
  });

  it.each([
    [
      'key configuration has not loaded',
      () => {
        mockKey.loaded = false;
      },
    ],
    [
      'username is empty',
      () => {
        mockState.user = '';
      },
    ],
    [
      'username is missing',
      () => {
        mockState.user = undefined;
      },
    ],
    [
      'cluster ID is empty',
      () => {
        mockState.clusterID = '';
      },
    ],
    [
      'cluster ID is missing',
      () => {
        mockState.clusterID = undefined;
      },
    ],
    [
      'user information is not ready',
      () => {
        mockUserLoaded = false;
      },
    ],
  ] as const)('should defer setup when %s', (_condition, arrange) => {
    arrange();
    renderHook(useSegmentTracking);
    expect(jest.mocked(useSegmentSetup).mock.lastCall?.[0].ready).toBe(false);
  });
});
