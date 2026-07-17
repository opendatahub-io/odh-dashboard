import * as React from 'react';
import { renderHook, act } from '@testing-library/react';
import { DashboardConfigContext } from '@odh-dashboard/plugin-core';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useAgentOpsDeploy } from '~/app/hooks/useAgentOpsDeploy';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));

const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);

const areaStatus = (status: boolean) => ({
  status,
  devFlags: null,
  featureFlags: null,
  reliantAreas: null,
  requiredComponents: null,
  requiredCapabilities: null,
  customCondition: () => status,
});

describe('useAgentOpsDeploy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    mockUseIsAreaAvailable.mockReturnValue(areaStatus(false));
  });

  it('returns true from DashboardConfigContext when set', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        DashboardConfigContext.Provider,
        {
          value: {
            dashboardConfig: { agentOpsDeploy: true },
          } as React.ContextType<typeof DashboardConfigContext>,
        },
        children,
      );

    const { result } = renderHook(() => useAgentOpsDeploy(), { wrapper });

    expect(result.current).toBe(true);
    expect(mockUseIsAreaAvailable).toHaveBeenCalledWith(SupportedArea.AGENT_OPS_DEPLOY);
  });

  it('falls back to sessionStorage when context is unset', () => {
    sessionStorage.setItem('odh-feature-flags', JSON.stringify({ agentOpsDeploy: true }));

    const { result } = renderHook(() => useAgentOpsDeploy());

    expect(result.current).toBe(true);
  });

  it('updates when odh-dev-flags-changed fires', () => {
    const { result } = renderHook(() => useAgentOpsDeploy());
    expect(result.current).toBe(false);

    act(() => {
      sessionStorage.setItem('odh-feature-flags', JSON.stringify({ agentOpsDeploy: true }));
      window.dispatchEvent(new CustomEvent('odh-dev-flags-changed'));
    });

    expect(result.current).toBe(true);
  });
});
