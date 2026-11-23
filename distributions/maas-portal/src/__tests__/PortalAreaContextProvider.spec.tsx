import React from 'react';
import { renderHook } from '@testing-library/react';
import { AreaContext, SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useTrackEvent, useTrackPageEvent } from '@odh-dashboard/analytics/react';
import PortalAreaContextProvider from '../providers/PortalAreaContextProvider';
import PortalContextProvider from '../providers/PortalContextProvider';

const mockModularArchContextProvider = jest.fn(
  ({ children }: { children: React.ReactNode; config: { mandatoryNamespace?: string } }) => (
    <>{children}</>
  ),
);

jest.mock('mod-arch-core', () => ({
  ModularArchContextProvider: (props: {
    children: React.ReactNode;
    config: { mandatoryNamespace?: string };
  }) => mockModularArchContextProvider(props),
  useSettings: () => ({ userSettings: null }),
  DeploymentMode: { Standalone: 'Standalone' },
}));

jest.mock('@odh-dashboard/maas/api/whoami', () => ({
  getMaaSWhoAmI: () => () => Promise.resolve({ isAdmin: false }),
}));

jest.mock('@openshift/dynamic-plugin-sdk', () => ({
  usePluginStore: () => ({
    setFeatureFlags: jest.fn(),
  }),
}));

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sCreateResource: jest.fn(),
}));

const AREA_SAMPLES = [
  SupportedArea.MODEL_SERVING,
  SupportedArea.DS_PROJECTS_VIEW,
  SupportedArea.DS_PIPELINES,
] as const;

const areaWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PortalAreaContextProvider>{children}</PortalAreaContextProvider>
);

const portalWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PortalContextProvider>{children}</PortalContextProvider>
);

describe('PortalAreaContextProvider', () => {
  describe('static context value', () => {
    it('should set dscStatus and dsciStatus to null', () => {
      const { result } = renderHook(() => React.useContext(AreaContext), { wrapper: areaWrapper });
      expect(result.current.dscStatus).toBeNull();
      expect(result.current.dsciStatus).toBeNull();
    });

    it('should provide an empty areasStatus map', () => {
      const { result } = renderHook(() => React.useContext(AreaContext), { wrapper: areaWrapper });
      expect(result.current.areasStatus).toEqual({});
    });
  });

  describe('useIsAreaAvailable', () => {
    it.each(AREA_SAMPLES)('should return status false for %s via hook fallback', (area) => {
      const { result } = renderHook(() => useIsAreaAvailable(area), { wrapper: areaWrapper });
      expect(result.current.status).toBe(false);
    });
  });
});

describe('PortalContextProvider AreaContext composition', () => {
  beforeEach(() => {
    mockModularArchContextProvider.mockClear();
  });

  it('sets the MaaS mandatory namespace', () => {
    renderHook(() => React.useContext(AreaContext), { wrapper: portalWrapper });

    expect(mockModularArchContextProvider.mock.calls[0][0].config.mandatoryNamespace).toBe(
      '__maas_grid__',
    );
  });

  it('should expose AreaContext through the production provider tree', () => {
    const { result } = renderHook(() => React.useContext(AreaContext), { wrapper: portalWrapper });
    expect(result.current.dscStatus).toBeNull();
    expect(result.current.dsciStatus).toBeNull();
    expect(result.current.areasStatus).toEqual({});
  });

  it.each(AREA_SAMPLES)(
    'should return status false for %s via useIsAreaAvailable under PortalContextProvider',
    (area) => {
      const { result } = renderHook(() => useIsAreaAvailable(area), { wrapper: portalWrapper });
      expect(result.current.status).toBe(false);
    },
  );
});

describe('PortalContextProvider tracking', () => {
  it('should provide stable no-ops for bundled feature tracking without accessing the SDK', () => {
    const originalAnalytics = Object.getOwnPropertyDescriptor(window, 'analytics');
    const analyticsRead = jest.fn();
    const analyticsWrite = jest.fn();

    try {
      Object.defineProperty(window, 'analytics', {
        configurable: true,
        get: analyticsRead,
        set: analyticsWrite,
      });
      const { result, rerender } = renderHook(
        () => ({ track: useTrackEvent(), page: useTrackPageEvent() }),
        { wrapper: portalWrapper },
      );

      const initial = result.current;
      rerender();
      expect(result.current.track).toBe(initial.track);
      expect(result.current.page).toBe(initial.page);
      expect(result.current.track('create_project_canceled', {})).toBeUndefined();
      expect(result.current.page()).toBeUndefined();
      expect(analyticsRead).not.toHaveBeenCalled();
      expect(analyticsWrite).not.toHaveBeenCalled();
    } finally {
      if (originalAnalytics) {
        Object.defineProperty(window, 'analytics', originalAnalytics);
      } else {
        Reflect.deleteProperty(window, 'analytics');
      }
    }
  });
});
