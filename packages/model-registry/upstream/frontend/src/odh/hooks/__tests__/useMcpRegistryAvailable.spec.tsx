import * as React from 'react';
import { renderHook } from '@testing-library/react';
import { DashboardConfigContext } from '@odh-dashboard/plugin-core';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import useFetchDscStatus from '@odh-dashboard/internal/concepts/areas/useFetchDscStatus';
import useMcpRegistryAvailable from '~/odh/hooks/useMcpRegistryAvailable';

jest.mock('@odh-dashboard/internal/concepts/areas/useFetchDscStatus', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseFetchDscStatus = jest.mocked(useFetchDscStatus);

const renderWithDashboardConfig = (mcpRegistry: boolean | undefined) => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <DashboardConfigContext.Provider value={{ dashboardConfig: { mcpRegistry } } as never}>
      {children}
    </DashboardConfigContext.Provider>
  );
  return renderHook(() => useMcpRegistryAvailable(), { wrapper });
};

describe('useMcpRegistryAvailable', () => {
  beforeEach(() => {
    mockUseFetchDscStatus.mockReturnValue([
      {
        components: { [DataScienceStackComponent.MLFLOW]: { managementState: 'Managed' } },
        conditions: [],
      },
      true,
      undefined,
      jest.fn(),
    ]);
  });

  it('returns true when mcpRegistry flag is on and MLflow is Managed', () => {
    const { result } = renderWithDashboardConfig(true);
    expect(result.current).toBe(true);
  });

  it('returns false when mcpRegistry flag is off', () => {
    const { result } = renderWithDashboardConfig(false);
    expect(result.current).toBe(false);
  });

  it('returns false when mcpRegistry flag is on but MLflow is not Managed/Unmanaged', () => {
    mockUseFetchDscStatus.mockReturnValue([
      {
        components: { [DataScienceStackComponent.MLFLOW]: { managementState: 'Removed' } },
        conditions: [],
      },
      true,
      undefined,
      jest.fn(),
    ]);
    const { result } = renderWithDashboardConfig(true);
    expect(result.current).toBe(false);
  });

  it('returns false when there is no DashboardConfigContext value', () => {
    const { result } = renderHook(() => useMcpRegistryAvailable());
    expect(result.current).toBe(false);
  });
});
