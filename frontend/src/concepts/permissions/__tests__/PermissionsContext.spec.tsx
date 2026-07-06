import * as React from 'react';
import { renderHook } from '@testing-library/react';
import {
  PermissionsContextProvider,
  usePermissionsContext,
} from '#~/concepts/permissions/PermissionsContext';

jest.mock('#~/concepts/permissions/apiHooks/useRoles', () => ({
  useRoles: jest.fn(),
}));

jest.mock('#~/concepts/permissions/apiHooks/useRoleBindings', () => ({
  useRoleBindings: jest.fn(),
}));

jest.mock('#~/concepts/permissions/apiHooks/useClusterRoles', () => ({
  useClusterRoles: jest.fn(),
}));

const mockUseRoles = jest.requireMock('#~/concepts/permissions/apiHooks/useRoles')
  .useRoles as jest.Mock;
const mockUseRoleBindings = jest.requireMock('#~/concepts/permissions/apiHooks/useRoleBindings')
  .useRoleBindings as jest.Mock;
const mockUseClusterRoles = jest.requireMock('#~/concepts/permissions/apiHooks/useClusterRoles')
  .useClusterRoles as jest.Mock;

describe('PermissionsContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoles.mockReturnValue({ data: [], loaded: true, error: undefined, refresh: jest.fn() });
    mockUseRoleBindings.mockReturnValue({
      data: [],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
    mockUseClusterRoles.mockReturnValue({
      data: [],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
  });

  it('throws if usePermissionsContext is used outside provider', () => {
    expect(() => renderHook(() => usePermissionsContext())).toThrow(
      /usePermissionsContext must be used within a PermissionsContextProvider/,
    );
  });

  it('provides loaded=true when all resources are loaded', () => {
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <PermissionsContextProvider namespace="test-ns">{children}</PermissionsContextProvider>
    );

    const { result } = renderHook(() => usePermissionsContext(), { wrapper });
    expect(result.current.loaded).toBe(true);
    expect(result.current.error).toBeUndefined();
  });

  it('provides loaded=false when any resource is still loading', () => {
    mockUseClusterRoles.mockReturnValue({
      data: [],
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <PermissionsContextProvider namespace="test-ns">{children}</PermissionsContextProvider>
    );

    const { result } = renderHook(() => usePermissionsContext(), { wrapper });
    expect(result.current.loaded).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('provides error when any resource has an error', () => {
    const err = new Error('roles failed');
    mockUseRoles.mockReturnValue({ data: [], loaded: true, error: err, refresh: jest.fn() });

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <PermissionsContextProvider namespace="test-ns">{children}</PermissionsContextProvider>
    );

    const { result } = renderHook(() => usePermissionsContext(), { wrapper });
    expect(result.current.loaded).toBe(true);
    expect(result.current.error).toBe(err);
  });
});
