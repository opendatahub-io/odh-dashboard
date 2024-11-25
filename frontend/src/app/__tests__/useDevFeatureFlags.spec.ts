import { merge } from 'lodash-es';
import { act } from 'react';
import { useSearchParams } from 'react-router-dom';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import useDevFeatureFlags from '~/app/useDevFeatureFlags';
import { useBrowserStorage } from '~/components/browserStorage';
import { allFeatureFlags } from '~/concepts/areas/const';
import { DashboardCommonConfig, DashboardConfigKind } from '~/k8sTypes';
import axios from '~/utilities/axios';

jest.mock('react-router-dom', () => ({
  useSearchParams: jest.fn(() => [
    { get: jest.fn(() => null), has: jest.fn(() => false), delete: jest.fn() },
    jest.fn(),
  ]),
}));
jest.mock('~/components/browserStorage', () => ({
  useBrowserStorage: jest.fn(() => [null, jest.fn()]),
}));
jest.mock('~/utilities/axios', () => ({
  __esModule: true,
  default: {
    defaults: {
      headers: {
        common: [],
      },
    },
  },
}));

const axiosMock = jest.mocked(axios);
const useSearchParamsMock = jest.mocked(useSearchParams);
const useBrowserStorageMock = jest.mocked(useBrowserStorage);

const mockSession = (sessionFlags: Partial<DashboardCommonConfig> | null) => {
  const setSessionFn = jest.fn();
  useBrowserStorageMock.mockReturnValue([sessionFlags, setSessionFn]);
  return { sessionFlags, setSessionFn };
};

const mockUseSearchParams = (queryFlags: { [key in string]: boolean } | null | boolean) => {
  const backing = new URLSearchParams({
    foo: 'bar',
    ...(queryFlags != null
      ? {
          devFeatureFlags:
            typeof queryFlags === 'boolean'
              ? queryFlags.toString()
              : Object.entries(queryFlags)
                  .map(([key, value]) => `${key}=${value}`)
                  .join(','),
        }
      : {}),
  });
  const getFn = jest.fn((name: string) => backing.get(name));
  const hasFn = jest.fn((name: string) => backing.has(name));
  const deleteFn = jest.fn((name: string) => backing.delete(name));
  const searchParams = {
    get: getFn,
    has: hasFn,
    delete: deleteFn,
    toString: () => backing.toString(),
  } as unknown as ReturnType<typeof useSearchParams>[0];
  const setSearchParamsFn = jest.fn();
  useSearchParamsMock.mockReturnValue([searchParams, setSearchParamsFn]);
  return { queryFlags, searchParams, setSearchParamsFn };
};

describe('useDevFeatureFlags', () => {
  it('should pass through dashboardConfig if no dev feature flags set', () => {
    const dashboardConfig = {
      spec: { dashboardConfig: { disableAppLauncher: true } },
    } as DashboardConfigKind;
    const renderResult = testHook(useDevFeatureFlags)(dashboardConfig);
    expect(renderResult.result.current.dashboardConfig).toBe(dashboardConfig);
    expect(renderResult.result.current).toEqual({
      dashboardConfig,
      devFeatureFlags: null,
      resetDevFeatureFlags: expect.any(Function),
      setDevFeatureFlag: expect.any(Function),
      setDevFeatureFlagQueryVisible: expect.any(Function),
    });
  });

  it('should load flags from session', () => {
    const { sessionFlags, setSessionFn } = mockSession({
      disableHome: true,
      disableAppLauncher: false,
    });
    const dashboardConfig = {
      spec: { dashboardConfig: { enablement: true } },
    } as DashboardConfigKind;
    const renderResult = testHook(useDevFeatureFlags)(dashboardConfig);
    expect(renderResult.result.current).toEqual({
      dashboardConfig: merge({}, dashboardConfig, { spec: { dashboardConfig: sessionFlags } }),
      devFeatureFlags: sessionFlags,
      resetDevFeatureFlags: expect.any(Function),
      setDevFeatureFlag: expect.any(Function),
      setDevFeatureFlagQueryVisible: expect.any(Function),
    });

    expect(axiosMock.defaults.headers.common['x-odh-feature-flags']).toEqual(
      JSON.stringify({
        disableHome: true,
        disableAppLauncher: false,
      }),
    );

    act(() => renderResult.result.current.resetDevFeatureFlags());
    expect(setSessionFn).toHaveBeenCalledWith(null);
    act(() => renderResult.result.current.setDevFeatureFlag('disableInfo', false));
    expect(setSessionFn).toHaveBeenLastCalledWith({
      disableAppLauncher: false,
      disableHome: true,
      disableInfo: false,
    });
  });

  it('should load flags from query string', () => {
    const { setSessionFn } = mockSession(null);
    const { searchParams, setSearchParamsFn } = mockUseSearchParams({
      disableHome: true,
      enablement: true,
      info: false,
      invalid: true,
    });
    const dashboardConfig = {
      spec: { dashboardConfig: { disableAppLauncher: true } },
    } as DashboardConfigKind;
    const renderResult = testHook(useDevFeatureFlags)(dashboardConfig);
    expect(renderResult.result.current).toEqual({
      dashboardConfig: merge({}, dashboardConfig, {
        spec: {
          dashboardConfig: {
            disableAppLauncher: true,
            disableHome: true,
            enablement: true,
            disableInfo: true,
          },
        },
      }),
      devFeatureFlags: {
        disableHome: true,
        enablement: true,
        disableInfo: true,
      },
      resetDevFeatureFlags: expect.any(Function),
      setDevFeatureFlag: expect.any(Function),
      setDevFeatureFlagQueryVisible: expect.any(Function),
    });

    expect(searchParams.delete).toHaveBeenCalledWith('devFeatureFlags');
    expect(setSearchParamsFn.mock.calls[0][0].toString()).toEqual(
      new URLSearchParams({ foo: 'bar' }).toString(),
    );

    expect(setSessionFn).toHaveBeenCalledWith({
      disableHome: true,
      enablement: true,
      disableInfo: true,
    });
  });

  it('should load flags from query string with true', () => {
    mockUseSearchParams(true);
    const dashboardConfig = {
      spec: { dashboardConfig: { disableAppLauncher: true } },
    } as DashboardConfigKind;
    const renderResult = testHook(useDevFeatureFlags)(dashboardConfig);
    const expectedDevFeatureFlags = allFeatureFlags.reduce<{ [key: string]: boolean }>(
      (acc, flag) => {
        acc[flag] = false;
        return acc;
      },
      {},
    );
    expect(renderResult.result.current).toEqual({
      dashboardConfig: merge({}, dashboardConfig, {
        spec: {
          dashboardConfig: expectedDevFeatureFlags,
        },
      }),
      devFeatureFlags: expectedDevFeatureFlags,
      resetDevFeatureFlags: expect.any(Function),
      setDevFeatureFlag: expect.any(Function),
      setDevFeatureFlagQueryVisible: expect.any(Function),
    });
  });

  it('should load flags from query string with true', () => {
    mockUseSearchParams(false);
    const dashboardConfig = {
      spec: { dashboardConfig: { disableAppLauncher: false } },
    } as DashboardConfigKind;
    const renderResult = testHook(useDevFeatureFlags)(dashboardConfig);
    const expectedDevFeatureFlags = allFeatureFlags.reduce<{ [key: string]: boolean }>(
      (acc, flag) => {
        acc[flag] = true;
        return acc;
      },
      {},
    );
    expect(renderResult.result.current).toEqual({
      dashboardConfig: merge({}, dashboardConfig, {
        spec: {
          dashboardConfig: expectedDevFeatureFlags,
        },
      }),
      devFeatureFlags: expectedDevFeatureFlags,
      resetDevFeatureFlags: expect.any(Function),
      setDevFeatureFlag: expect.any(Function),
      setDevFeatureFlagQueryVisible: expect.any(Function),
    });
  });
});
