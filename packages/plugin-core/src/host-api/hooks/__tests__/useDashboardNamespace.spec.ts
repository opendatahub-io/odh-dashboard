import React from 'react';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import type { HostApiServices } from '../../types';
import { HostApiContext } from '../../HostApiContext';
import { useDashboardNamespace } from '../useDashboardNamespace';

function createWrapper(namespace: string): React.FC<{ children: React.ReactNode }> {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(
      HostApiContext.Provider,
      { value: { dashboardNamespace: namespace } as HostApiServices },
      children,
    );
  Wrapper.displayName = 'Wrapper';
  return Wrapper;
}

describe('useDashboardNamespace', () => {
  it('should return the dashboard namespace from context', () => {
    const { result } = renderHook(() => useDashboardNamespace(), {
      wrapper: createWrapper('opendatahub'),
    });
    expect(result.current).toEqual({ dashboardNamespace: 'opendatahub' });
  });

  it('should return a stable reference across re-renders', () => {
    const { result, rerender } = renderHook(() => useDashboardNamespace(), {
      wrapper: createWrapper('redhat-ods-applications'),
    });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('should return empty string when context has no namespace', () => {
    const { result } = renderHook(() => useDashboardNamespace(), {
      wrapper: createWrapper(''),
    });
    expect(result.current).toEqual({ dashboardNamespace: '' });
  });
});
