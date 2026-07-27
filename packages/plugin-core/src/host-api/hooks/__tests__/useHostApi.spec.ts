import React from 'react';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import type { HostApiServices } from '../../types';
import { HostApiContext } from '../../HostApiContext';
import { useHostApi } from '../useHostApi';

const mockServices: HostApiServices = {
  dashboardNamespace: 'test-ns',
  checkAccess: jest.fn(),
  getSecretsByLabel: jest.fn(),
  getDashboardPvcs: jest.fn(),
  fetchDashboardConfig: jest.fn(),
  useTemplates: jest.fn(() => [[], false, undefined]),
  setProjectServingPlatform: jest.fn(),
  createSecret: jest.fn(),
  getSecret: jest.fn(),
  deleteSecret: jest.fn(),
  patchSecretWithOwnerReference: jest.fn(),
  patchSecretWithProtocolAnnotation: jest.fn(),
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
    expect(() =>
      result.current.checkAccess({
        group: '',
        resource: '',
        subresource: '',
        verb: 'get',
        name: '',
        namespace: '',
      }),
    ).toThrow('HostApiContext not provided: checkAccess');
  });
});
