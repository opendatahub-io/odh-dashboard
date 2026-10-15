import {
  GRID,
  getPortalFeatureFlagOverrides,
  persistPortalFeatureFlagOverrides,
} from '../featureFlags';

describe('portal feature flags', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    window.sessionStorage.clear();
  });

  it('reads the grid value from the devFeatureFlags query parameter', () => {
    window.history.replaceState({}, '', '/?devFeatureFlags=grid=true');

    expect(getPortalFeatureFlagOverrides()).toEqual({ [GRID]: true });
  });

  it('reads the persisted grid value when no query override is present', () => {
    persistPortalFeatureFlagOverrides({ [GRID]: false });

    expect(getPortalFeatureFlagOverrides()).toEqual({ [GRID]: false });
  });

  it('gives the query override precedence over the persisted value', () => {
    persistPortalFeatureFlagOverrides({ [GRID]: false });
    window.history.replaceState({}, '', '/?devFeatureFlags=grid=true');

    expect(getPortalFeatureFlagOverrides()).toEqual({ [GRID]: true });
  });

  it('supports the boolean shorthand used by the dashboard flag tooling', () => {
    window.history.replaceState({}, '', '/?devFeatureFlags=false');

    expect(getPortalFeatureFlagOverrides()).toEqual({ [GRID]: false });
  });

  it('continues when session storage is unavailable', () => {
    const { sessionStorage } = window;
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get: () => {
        throw new Error('session storage unavailable');
      },
    });

    expect(getPortalFeatureFlagOverrides()).toEqual({});
    expect(() => persistPortalFeatureFlagOverrides({ [GRID]: true })).not.toThrow();

    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: sessionStorage,
    });
  });
});
