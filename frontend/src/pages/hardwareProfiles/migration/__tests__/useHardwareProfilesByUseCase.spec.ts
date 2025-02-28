import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { mockHardwareProfile } from '~/__mocks__/mockHardwareProfile';
import { HardwareProfileUseCases } from '~/k8sTypes';
import useMigratedHardwareProfiles from '~/pages/hardwareProfiles/migration/useMigratedHardwareProfiles';
import { useHardwareProfilesByUseCase } from '~/pages/hardwareProfiles/migration/useHardwareProfilesByUseCase';

jest.mock('../useMigratedHardwareProfiles');

const mockUseMigratedHardwareProfiles = jest.mocked(useMigratedHardwareProfiles);

describe('useHardwareProfilesByUseCase', () => {
  const refresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all profiles when no use cases specified', () => {
    const profiles = [
      mockHardwareProfile({
        annotations: {
          'opendatahub.io/use-cases': JSON.stringify(['notebooks']),
        },
      }),
      mockHardwareProfile({
        annotations: {
          'opendatahub.io/use-cases': JSON.stringify(['serving']),
        },
      }),
    ];

    mockUseMigratedHardwareProfiles.mockReturnValue({
      data: profiles,
      loaded: true,
      loadError: undefined,
      refresh,
      getMigrationAction: jest.fn(),
    });

    const renderResult = testHook(useHardwareProfilesByUseCase)();
    const [data, loaded, loadError] = renderResult.result.current;

    expect(data).toEqual(profiles);
    expect(loaded).toBe(true);
    expect(loadError).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should filter profiles by use case', () => {
    const notebookProfile = mockHardwareProfile({
      annotations: {
        'opendatahub.io/use-cases': JSON.stringify(['notebooks']),
      },
    });
    const servingProfile = mockHardwareProfile({
      annotations: {
        'opendatahub.io/use-cases': JSON.stringify(['serving']),
      },
    });

    mockUseMigratedHardwareProfiles.mockReturnValue({
      data: [notebookProfile, servingProfile],
      loaded: true,
      loadError: undefined,
      refresh,
      getMigrationAction: jest.fn(),
    });

    const renderResult = testHook(useHardwareProfilesByUseCase)([
      HardwareProfileUseCases.WORKBENCH,
    ]);
    const [data] = renderResult.result.current;

    expect(data).toEqual([notebookProfile]);
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should include profiles with invalid visible-in annotation', () => {
    const invalidProfile = mockHardwareProfile({
      annotations: {
        'opendatahub.io/use-cases': 'invalid-json',
      },
    });

    mockUseMigratedHardwareProfiles.mockReturnValue({
      data: [invalidProfile],
      loaded: true,
      loadError: undefined,
      refresh,
      getMigrationAction: jest.fn(),
    });

    const renderResult = testHook(useHardwareProfilesByUseCase)([
      HardwareProfileUseCases.WORKBENCH,
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

    const renderResult = testHook(useHardwareProfilesByUseCase)([
      HardwareProfileUseCases.WORKBENCH,
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

    const renderResult = testHook(useHardwareProfilesByUseCase)();
    const [data, loaded, loadError] = renderResult.result.current;

    expect(data).toEqual([]);
    expect(loaded).toBe(false);
    expect(loadError).toBe(error);
    expect(renderResult).hookToHaveUpdateCount(1);
  });
});
