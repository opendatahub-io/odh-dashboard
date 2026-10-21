import { renderHook } from '@testing-library/react';
import { useGridFeatureFlag } from '~/app/utilities/gridFeatureFlag';

describe('useGridFeatureFlag', () => {
  beforeEach(() => {
    window.__MAAS_CONSUMER_PORTAL_GRID__ = undefined;
    window.sessionStorage.removeItem('odh-maas-portal-feature-flags');
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    window.__MAAS_CONSUMER_PORTAL_GRID__ = undefined;
    window.sessionStorage.removeItem('odh-maas-portal-feature-flags');
    window.history.replaceState({}, '', '/');
  });

  it('honors an explicit portal false even when the URL requests grid', () => {
    window.history.replaceState({}, '', '/?devFeatureFlags=grid=true');
    window.__MAAS_CONSUMER_PORTAL_GRID__ = false;

    const { result } = renderHook(useGridFeatureFlag);

    expect(result.current).toBe(false);
  });

  it('honors an explicit portal false even when the session requests grid', () => {
    window.sessionStorage.setItem('odh-maas-portal-feature-flags', '{"grid":true}');
    window.__MAAS_CONSUMER_PORTAL_GRID__ = false;

    const { result } = renderHook(useGridFeatureFlag);

    expect(result.current).toBe(false);
  });

  it('uses the standalone URL override when no portal value is published', () => {
    window.history.replaceState({}, '', '/?devFeatureFlags=grid=true');

    const { result } = renderHook(useGridFeatureFlag);

    expect(result.current).toBe(true);
  });
});
