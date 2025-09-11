import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import { HardwareProfileFeatureVisibility } from '#~/k8sTypes';
import useMigratedHardwareProfiles from '#~/pages/hardwareProfiles/migration/useMigratedHardwareProfiles';
import { useHardwareProfilesByFeatureVisibility } from '#~/pages/hardwareProfiles/migration/useHardwareProfilesByFeatureVisibility';
import { useWatchHardwareProfiles } from '#~/utilities/useWatchHardwareProfiles';
import { useDashboardNamespace } from '#~/redux/selectors';

jest.mock('../useMigratedHardwareProfiles');
jest.mock('#~/utilities/useWatchHardwareProfiles');
jest.mock('#~/redux/selectors');

const mockUseMigratedHardwareProfiles = jest.mocked(useMigratedHardwareProfiles);
const mockUseWatchHardwareProfiles = jest.mocked(useWatchHardwareProfiles);
const mockUseDashboardNamespace = jest.mocked(useDashboardNamespace);

describe('useHardwareProfilesByUseCase', () => {
  const refresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWatchHardwareProfiles.mockReturnValue([[], true, undefined]);
    mockUseDashboardNamespace.mockReturnValue({ dashboardNamespace: 'test-namespace' });
  });

  it('should return all profiles when no use cases specified', () => {
    const profiles = [
      mockHardwareProfile({
        annotations: {
          'opendatahub.io/dashboard-feature-visibility': JSON.stringify([
            HardwareProfileFeatureVisibility.WORKBENCH,
          ]),
        },
      }),
      mockHardwareProfile({
        annotations: {
          'opendatahub.io/dashboard-feature-visibility': JSON.stringify([
            HardwareProfileFeatureVisibility.MODEL_SERVING,
          ]),
        },
      }),
    ];

    // todo: delete this mock
    mockUseMigratedHardwareProfiles.mockReturnValue({
      data: profiles,
      loaded: true,
      loadError: undefined,
      refresh,
      getMigrationAction: jest.fn(),
    });

    const renderResult = testHook(useHardwareProfilesByFeatureVisibility)();
    const [data, loaded, loadError] = renderResult.result.current;

    expect(data).toEqual(profiles);
    expect(loaded).toBe(true);
    expect(loadError).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should filter profiles by use case', () => {
    const notebookProfile = mockHardwareProfile({
      annotations: {
        'opendatahub.io/dashboard-feature-visibility': JSON.stringify([
          HardwareProfileFeatureVisibility.WORKBENCH,
        ]),
      },
    });
    const servingProfile = mockHardwareProfile({
      annotations: {
        'opendatahub.io/dashboard-feature-visibility': JSON.stringify([
          HardwareProfileFeatureVisibility.MODEL_SERVING,
        ]),
      },
    });

    // todo: delete this mock
    mockUseMigratedHardwareProfiles.mockReturnValue({
      data: [notebookProfile, servingProfile],
      loaded: true,
      loadError: undefined,
      refresh,
      getMigrationAction: jest.fn(),
    });

    const renderResult = testHook(useHardwareProfilesByFeatureVisibility)([
      HardwareProfileFeatureVisibility.WORKBENCH,
    ]);
    const [data] = renderResult.result.current;

    expect(data).toEqual([notebookProfile]);
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should include profiles with invalid visible-in annotation', () => {
    const invalidProfile = mockHardwareProfile({
      annotations: {
        'opendatahub.io/dashboard-feature-visibility': 'invalid-json',
      },
    });

    mockUseMigratedHardwareProfiles.mockReturnValue({
      data: [invalidProfile],
      loaded: true,
      loadError: undefined,
      refresh,
      getMigrationAction: jest.fn(),
    });

    const renderResult = testHook(useHardwareProfilesByFeatureVisibility)([
      HardwareProfileFeatureVisibility.WORKBENCH,
    ]);
    const [data] = renderResult.result.current;

    expect(data).toEqual([invalidProfile]);
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should include profiles without visible-in annotation', () => {
    const profileWithoutAnnotation = mockHardwareProfile({});

    mockUseMigratedHardwareProfiles.mockReturnValue({
      data: [profileWithoutAnnotation],
      loaded: true,
      loadError: undefined,
      refresh,
      getMigrationAction: jest.fn(),
    });

    const renderResult = testHook(useHardwareProfilesByFeatureVisibility)([
      HardwareProfileFeatureVisibility.WORKBENCH,
    ]);
    const [data] = renderResult.result.current;

    expect(data).toEqual([profileWithoutAnnotation]);
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should handle loading and error states', () => {
    const error = new Error('Test error');
    mockUseMigratedHardwareProfiles.mockReturnValue({
      data: [],
      loaded: false,
      loadError: error,
      refresh,
      getMigrationAction: jest.fn(),
    });

    const renderResult = testHook(useHardwareProfilesByFeatureVisibility)();
    const [data, loaded, loadError] = renderResult.result.current;

    expect(data).toEqual([]);
    expect(loaded).toBe(false);
    expect(loadError).toBe(error);
    expect(renderResult).hookToHaveUpdateCount(1);
  });
});
