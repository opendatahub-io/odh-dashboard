import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { mockHardwareProfile } from '~/__mocks__/mockHardwareProfile';
import { HardwareProfileVisibleIn } from '~/k8sTypes';
import useMigratedHardwareProfiles from '~/pages/hardwareProfiles/migration/useMigratedHardwareProfiles';
import { useHardwareProfilesByArea } from '~/pages/hardwareProfiles/migration/useHardwareProfilesByArea';

jest.mock('../useMigratedHardwareProfiles');

const mockUseMigratedHardwareProfiles = jest.mocked(useMigratedHardwareProfiles);

describe('useHardwareProfilesByArea', () => {
  const refresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all profiles when no areas specified', () => {
    const profiles = [
      mockHardwareProfile({
        annotations: {
          'opendatahub.io/visible-in': JSON.stringify(['notebooks']),
        },
      }),
      mockHardwareProfile({
        annotations: {
          'opendatahub.io/visible-in': JSON.stringify(['serving']),
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

    const renderResult = testHook(useHardwareProfilesByArea)();
    const [data, loaded, loadError] = renderResult.result.current;

    expect(data).toEqual(profiles);
    expect(loaded).toBe(true);
    expect(loadError).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should filter profiles by area', () => {
    const notebookProfile = mockHardwareProfile({
      annotations: {
        'opendatahub.io/visible-in': JSON.stringify(['notebooks']),
      },
    });
    const servingProfile = mockHardwareProfile({
      annotations: {
        'opendatahub.io/visible-in': JSON.stringify(['serving']),
      },
    });

    mockUseMigratedHardwareProfiles.mockReturnValue({
      data: [notebookProfile, servingProfile],
      loaded: true,
      loadError: undefined,
      refresh,
      getMigrationAction: jest.fn(),
    });

    const renderResult = testHook(useHardwareProfilesByArea)([HardwareProfileVisibleIn.NOTEBOOKS]);
    const [data] = renderResult.result.current;

    expect(data).toEqual([notebookProfile]);
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should include profiles with invalid visible-in annotation', () => {
    const invalidProfile = mockHardwareProfile({
      annotations: {
        'opendatahub.io/visible-in': 'invalid-json',
      },
    });

    mockUseMigratedHardwareProfiles.mockReturnValue({
      data: [invalidProfile],
      loaded: true,
      loadError: undefined,
      refresh,
      getMigrationAction: jest.fn(),
    });

    const renderResult = testHook(useHardwareProfilesByArea)([HardwareProfileVisibleIn.NOTEBOOKS]);
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

    const renderResult = testHook(useHardwareProfilesByArea)([HardwareProfileVisibleIn.NOTEBOOKS]);
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

    const renderResult = testHook(useHardwareProfilesByArea)();
    const [data, loaded, loadError] = renderResult.result.current;

    expect(data).toEqual([]);
    expect(loaded).toBe(false);
    expect(loadError).toBe(error);
    expect(renderResult).hookToHaveUpdateCount(1);
  });
});
