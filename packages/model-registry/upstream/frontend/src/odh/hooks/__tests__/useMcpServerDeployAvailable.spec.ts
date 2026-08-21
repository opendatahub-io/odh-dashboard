import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import useFetchDscStatus from '@odh-dashboard/internal/concepts/areas/useFetchDscStatus';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import useMcpServerDeployAvailable from '~/odh/hooks/useMcpServerDeployAvailable';

jest.mock('@odh-dashboard/internal/concepts/areas/useFetchDscStatus', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseFetchDscStatus = jest.mocked(useFetchDscStatus);

describe('useMcpServerDeployAvailable', () => {
  it.each([
    ['Managed', true],
    ['Unmanaged', true],
    ['Removed', false],
  ] as const)('mcplifecycleoperator %s → available=%s', (managementState, available) => {
    mockUseFetchDscStatus.mockReturnValue([
      {
        components: {
          [DataScienceStackComponent.MCP_LIFECYCLE_OPERATOR]: { managementState },
        },
        conditions: [],
      },
      true,
      undefined,
      jest.fn(),
    ]);

    const { result } = testHook(useMcpServerDeployAvailable)();
    expect(result.current).toEqual({ available, loaded: true });
  });

  it('returns available=false when mcplifecycleoperator is missing from DSC', () => {
    mockUseFetchDscStatus.mockReturnValue([
      { components: {}, conditions: [] },
      true,
      undefined,
      jest.fn(),
    ]);

    const { result } = testHook(useMcpServerDeployAvailable)();
    expect(result.current).toEqual({ available: false, loaded: true });
  });

  it('returns available=false and loaded=false while DSC is loading', () => {
    mockUseFetchDscStatus.mockReturnValue([null, false, undefined, jest.fn()]);

    const { result } = testHook(useMcpServerDeployAvailable)();
    expect(result.current).toEqual({ available: false, loaded: false });
  });
});
