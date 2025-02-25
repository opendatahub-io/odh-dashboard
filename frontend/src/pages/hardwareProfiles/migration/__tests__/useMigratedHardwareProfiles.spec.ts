import { mockHardwareProfile } from '~/__mocks__/mockHardwareProfile';
import { mockAcceleratorProfile } from '~/__mocks__/mockAcceleratorProfile';
import { mockDashboardConfig } from '~/__mocks__';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { useWatchHardwareProfiles } from '~/utilities/useWatchHardwareProfiles';
import useAcceleratorProfiles from '~/pages/notebookController/screens/server/useAcceleratorProfiles';
import { useAppContext } from '~/app/AppContext';
import { useDashboardNamespace } from '~/redux/selectors';
import { DEFAULT_NOTEBOOK_SIZES } from '~/pages/notebookController/const';
import useMigratedHardwareProfiles from '~/pages/hardwareProfiles/migration/useMigratedHardwareProfiles';
import { MigrationSourceType } from '~/pages/hardwareProfiles/migration/types';

global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));

jest.mock('~/utilities/useWatchHardwareProfiles');
jest.mock('~/pages/notebookController/screens/server/useAcceleratorProfiles');
jest.mock('~/app/AppContext');
jest.mock('~/redux/selectors');

const mockUseWatchHardwareProfiles = jest.mocked(useWatchHardwareProfiles);
const mockUseAcceleratorProfiles = jest.mocked(useAcceleratorProfiles);
const mockUseAppContext = jest.mocked(useAppContext);
const mockUseDashboardNamespace = jest.mocked(useDashboardNamespace);

describe('useMigratedHardwareProfiles', () => {
  const namespace = 'test-namespace';
  const refreshAcceleratorProfiles = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseDashboardNamespace.mockReturnValue({ dashboardNamespace: namespace });

    mockUseAppContext.mockReturnValue({
      dashboardConfig: mockDashboardConfig({
        disableNotebookController: false,
        notebookSizes: [],
        modelServerSizes: [],
      }),
      buildStatuses: [],
      storageClasses: [],
      isRHOAI: false,
    });

    mockUseWatchHardwareProfiles.mockReturnValue([[], true, undefined]);
    mockUseAcceleratorProfiles.mockReturnValue([[], true, undefined, refreshAcceleratorProfiles]);
  });

  it('should initialize with with no profiles if none exist to migrate', () => {
    const renderResult = testHook(useMigratedHardwareProfiles)();

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

    const renderResult = testHook(useMigratedHardwareProfiles)();
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

    mockUseAppContext.mockReturnValue({
      dashboardConfig: mockDashboardConfig({
        notebookSizes,
        modelServerSizes: [],
      }),
      buildStatuses: [],
      storageClasses: [],
      isRHOAI: false,
    });

    const renderResult = testHook(useMigratedHardwareProfiles)();
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

    mockUseAppContext.mockReturnValue({
      dashboardConfig: mockDashboardConfig({
        notebookSizes: [],
        modelServerSizes,
      }),
      buildStatuses: [],
      storageClasses: [],
      isRHOAI: false,
    });

    const renderResult = testHook(useMigratedHardwareProfiles)();
    const { data, getMigrationAction } = renderResult.result.current;

    expect(data.length).toBe(1);
    const migrationAction = getMigrationAction(data[0].metadata.name);
    expect(migrationAction?.source.type).toBe(MigrationSourceType.SERVING_CONTAINER_SIZE);

    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should handle notebook tolerations', () => {
    mockUseAppContext.mockReturnValue({
      dashboardConfig: mockDashboardConfig({
        notebookSizes: DEFAULT_NOTEBOOK_SIZES,
      }),
      buildStatuses: [],
      storageClasses: [],
      isRHOAI: false,
    });

    const renderResult = testHook(useMigratedHardwareProfiles)();
    const { data } = renderResult.result.current;

    const notebookProfile = data.find((profile) =>
      profile.metadata.annotations?.['opendatahub.io/visible-in']?.includes('notebooks'),
    );
    expect(notebookProfile?.spec.tolerations).toEqual([
      {
        key: 'NotebooksOnlyChange',
        effect: 'NoSchedule',
        operator: 'Exists',
      },
    ]);

    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should combine existing and migrated profiles', () => {
    const existingProfile = mockHardwareProfile({ name: 'existing' });
    mockUseWatchHardwareProfiles.mockReturnValue([[existingProfile], true, undefined]);

    const acceleratorProfile = mockAcceleratorProfile({ name: 'test-accelerator' });
    mockUseAcceleratorProfiles.mockReturnValue([
      [acceleratorProfile],
      true,
      undefined,
      refreshAcceleratorProfiles,
    ]);

    const renderResult = testHook(useMigratedHardwareProfiles)();
    const { data } = renderResult.result.current;

    expect(data).toContain(existingProfile);
    expect(data.length).toBeGreaterThan(1);

    expect(renderResult).hookToHaveUpdateCount(1);
  });
});
