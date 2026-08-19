import React from 'react';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import type { HostApiServices } from '../../types';
import { HostApiContext } from '../../HostApiContext';
import { useHostApi } from '../useHostApi';

const mockServices: HostApiServices = {
  useTemplates: jest.fn(() => [[], false, undefined]),
  setProjectServingPlatform: jest.fn(),
  useWatchConnectionTypes: jest.fn(() => [[], false, undefined, jest.fn()]),
  useServingConnections: jest.fn(() => [[], false, undefined, jest.fn()]),
  getDashboardConfigTemplateOrder: jest.fn(),
  getDashboardConfigTemplateDisablement: jest.fn(),
  useModelServingMetrics: jest.fn(() => ({ data: {}, refresh: jest.fn() })),
  useServingPlatformStatuses: jest.fn(() => ({
    kServe: { enabled: false, installed: false },
    kServeNIM: { enabled: false, installed: false },
    platformEnabledCount: 0,
    refreshNIMAvailability: jest.fn(),
  })),
  isProjectNIMSupported: jest.fn(() => false),
  registeredModelDeploymentsRoute: jest.fn(() => ''),
};

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  React.createElement(HostApiContext.Provider, { value: mockServices }, children);

describe('useHostApi', () => {
  it('should return all host API services from context', () => {
    const { result } = renderHook(() => useHostApi(), { wrapper });
    expect(result.current).toBe(mockServices);
  });

  it('should throw when context is not provided and a service is called', () => {
    const { result } = renderHook(() => useHostApi());
    expect(() => result.current.useTemplates('test-ns')).toThrow(
      'HostApiContext not provided: useTemplates',
    );
  });
});
