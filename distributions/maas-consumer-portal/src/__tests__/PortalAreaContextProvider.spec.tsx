import React from 'react';
import { renderHook } from '@testing-library/react';
import { AreaContext, SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import PortalAreaContextProvider from '../PortalAreaContextProvider';
import PortalContextProvider from '../PortalContextProvider';

jest.mock('mod-arch-core', () => ({
  ModularArchContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSettings: () => ({ userSettings: null }),
  DeploymentMode: { Standalone: 'Standalone' },
}));

jest.mock('@openshift/dynamic-plugin-sdk', () => ({
  usePluginStore: () => ({
    setFeatureFlags: jest.fn(),
  }),
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
