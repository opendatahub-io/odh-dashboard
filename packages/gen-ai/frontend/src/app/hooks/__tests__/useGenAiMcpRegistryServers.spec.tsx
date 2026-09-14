import * as React from 'react';
import { act, renderHook } from '@testing-library/react';
import { DashboardConfigContext } from '@odh-dashboard/plugin-core';
import useGenAiMcpRegistryServers from '~/app/hooks/useGenAiMcpRegistryServers';

const SESSION_KEY = 'odh-feature-flags';

const withDashboardConfig = (genAiMcpRegistryServers: boolean) => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <DashboardConfigContext.Provider
      value={
        {
          dashboardConfig: { genAiMcpRegistryServers },
        } as React.ContextType<typeof DashboardConfigContext>
      }
    >
      {children}
    </DashboardConfigContext.Provider>
  );
  return wrapper;
};

describe('useGenAiMcpRegistryServers', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('should use the dashboard config value', () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ genAiMcpRegistryServers: false }));

    const { result } = renderHook(() => useGenAiMcpRegistryServers(), {
      wrapper: withDashboardConfig(true),
    });

    expect(result.current).toBe(true);
  });

  it('should fall back to the session feature flag', () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ genAiMcpRegistryServers: true }));

    const { result } = renderHook(() => useGenAiMcpRegistryServers());

    expect(result.current).toBe(true);
  });

  it('should default to false and react to feature flag changes', () => {
    const { result } = renderHook(() => useGenAiMcpRegistryServers());
    expect(result.current).toBe(false);

    act(() => {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ genAiMcpRegistryServers: true }));
      window.dispatchEvent(new CustomEvent('odh-dev-flags-changed'));
    });

    expect(result.current).toBe(true);
  });
});
