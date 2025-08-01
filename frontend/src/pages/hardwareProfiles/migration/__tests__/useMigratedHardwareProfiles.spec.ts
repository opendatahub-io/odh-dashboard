import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockAcceleratorProfile } from '#~/__mocks__/mockAcceleratorProfile';
import { mockDashboardConfig } from '#~/__mocks__';
import { useWatchHardwareProfiles } from '#~/utilities/useWatchHardwareProfiles';
import useAcceleratorProfiles from '#~/pages/notebookController/screens/server/useAcceleratorProfiles';
import { useDashboardNamespace } from '#~/redux/selectors';
import { DEFAULT_NOTEBOOK_SIZES } from '#~/pages/notebookController/const';
import useMigratedHardwareProfiles from '#~/pages/hardwareProfiles/migration/useMigratedHardwareProfiles';
import { MigrationSourceType } from '#~/pages/hardwareProfiles/migration/types';
import { useApplicationSettings } from '#~/app/useApplicationSettings';

global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));

jest.mock('#~/utilities/useWatchHardwareProfiles');
jest.mock('#~/pages/notebookController/screens/server/useAcceleratorProfiles');
jest.mock('#~/app/useApplicationSettings');
jest.mock('#~/redux/selectors');

const mockUseWatchHardwareProfiles = jest.mocked(useWatchHardwareProfiles);
const mockUseAcceleratorProfiles = jest.mocked(useAcceleratorProfiles);
const mockUseApplicationSettings = jest.mocked(useApplicationSettings);
const mockUseDashboardNamespace = jest.mocked(useDashboardNamespace);

describe('useMigratedHardwareProfiles', () => {
  const namespace = 'test-namespace';
  const refreshAcceleratorProfiles = jest.fn();

  const testNamespace = 'test-namespace';

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseDashboardNamespace.mockReturnValue({ dashboardNamespace: namespace });

    mockUseApplicationSettings.mockReturnValue({
      dashboardConfig: mockDashboardConfig({
        disableNotebookController: false,
        notebookSizes: [],
        modelServerSizes: [],
      }),
      loaded: true,
      loadError: undefined,
      refresh: jest.fn(),
    });

    mockUseWatchHardwareProfiles.mockReturnValue([[], true, undefined]);
    mockUseAcceleratorProfiles.mockReturnValue([[], true, undefined, refreshAcceleratorProfiles]);
  });

  it('should initialize with with no profiles if none exist to migrate', () => {
    const renderResult = testHook(useMigratedHardwareProfiles)(testNamespace);

    expect(renderResult.result.current).toEqual({
      data: [],
      loaded: true,
      loadError: undefined,
      refresh: expect.any(Function),
      getMigrationAction: expect.any(Function),
    });
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should migrate accelerator profiles', () => {
    const acceleratorProfile = mockAcceleratorProfile({
      name: 'test-accelerator',
      tolerations: [{ key: 'gpu', value: 'true' }],
    });

    mockUseAcceleratorProfiles.mockReturnValue([
      [acceleratorProfile],
      true,
      undefined,
      refreshAcceleratorProfiles,
    ]);

    const renderResult = testHook(useMigratedHardwareProfiles)(testNamespace);
    const { data, getMigrationAction } = renderResult.result.current;

    // Should create notebook and serving profiles
    expect(data.length).toBe(2);

    // Verify migration action
    const migrationAction = getMigrationAction(data[0].metadata.name);
    expect(migrationAction).toBeDefined();
    expect(migrationAction?.source.type).toBe(MigrationSourceType.ACCELERATOR_PROFILE);
    expect(migrationAction?.source.resource).toBe(acceleratorProfile);

    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should migrate notebook sizes', () => {
    const notebookSizes = [{ name: 'Small', resources: { requests: { cpu: '1', memory: '1Gi' } } }];

    mockUseApplicationSettings.mockReturnValue({
      dashboardConfig: mockDashboardConfig({
        notebookSizes,
        modelServerSizes: [],
      }),
      loaded: true,
      loadError: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useMigratedHardwareProfiles)(testNamespace);
    const { data, getMigrationAction } = renderResult.result.current;

    expect(data.length).toBe(1);
    const migrationAction = getMigrationAction(data[0].metadata.name);
    expect(migrationAction?.source.type).toBe(MigrationSourceType.NOTEBOOK_CONTAINER_SIZE);

    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should migrate model serving sizes', () => {
    const modelServerSizes = [
      { name: 'Medium', resources: { requests: { cpu: '2', memory: '2Gi' } } },
    ];

    mockUseApplicationSettings.mockReturnValue({
      dashboardConfig: mockDashboardConfig({
        notebookSizes: [],
        modelServerSizes,
      }),
      loaded: true,
      loadError: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useMigratedHardwareProfiles)(testNamespace);
    const { data, getMigrationAction } = renderResult.result.current;

    expect(data.length).toBe(1);
    const migrationAction = getMigrationAction(data[0].metadata.name);
    expect(migrationAction?.source.type).toBe(MigrationSourceType.SERVING_CONTAINER_SIZE);

    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should handle notebook tolerations', () => {
    mockUseApplicationSettings.mockReturnValue({
      dashboardConfig: mockDashboardConfig({
        notebookSizes: DEFAULT_NOTEBOOK_SIZES,
      }),
      loaded: true,
      loadError: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useMigratedHardwareProfiles)(testNamespace);
    const { data } = renderResult.result.current;

    const notebookProfile = data.find((profile) =>
      profile.metadata.annotations?.['opendatahub.io/dashboard-feature-visibility']?.includes(
        'workbench',
      ),
    );
    expect(notebookProfile?.spec.scheduling?.node?.tolerations).toEqual([
      {
        key: 'NotebooksOnlyChange',
        effect: 'NoSchedule',
        operator: 'Exists',
      },
    ]);

    expect(renderResult).hookToHaveUpdateCount(1);
  });
});
