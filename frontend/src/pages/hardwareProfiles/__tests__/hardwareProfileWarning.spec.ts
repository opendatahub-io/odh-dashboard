import { mockHardwareProfile } from '~/__mocks__/mockHardwareProfile';
import { IdentifierResourceType } from '~/types';
import { hardwareProfileWarning } from '~/pages/hardwareProfiles/utils';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

describe('useHardwareProfile', () => {
  it('should generate warnings for min being larger than max', async () => {
    const hardwareProfilesMock = [
      mockHardwareProfile({
        uid: 'test-2',
        enabled: false,
        identifiers: [
          {
            displayName: 'Memory',
            identifier: 'memory',
            resourceType: IdentifierResourceType.MEMORY,
            minCount: '10Gi',
            maxCount: '5Gi',
            defaultCount: '2Gi',
          },
          {
            displayName: 'CPU',
            identifier: 'cpu',
            resourceType: IdentifierResourceType.CPU,
            minCount: '1',
            maxCount: '2',
            defaultCount: '1',
          },
        ],
      }),
    ];
    const hardwareProfilesResult = hardwareProfileWarning(hardwareProfilesMock);
    expect(hardwareProfilesResult[0].spec.warning).toStrictEqual({
      message: `Minimum allowed ${IdentifierResourceType.MEMORY} cannot exceed maximum allowed Memory. Edit the profile to make the profile valid.`,
      title: 'Invalid hardware profile',
    });
  });

  it('should generate warnings for negative min value', async () => {
    const hardwareProfilesMock = [
      mockHardwareProfile({
        uid: 'test-3',
        enabled: false,
        identifiers: [
          {
            displayName: 'Memory',
            identifier: 'memory',
            resourceType: IdentifierResourceType.MEMORY,
            minCount: '2Gi',
            maxCount: '5Gi',
            defaultCount: '2Gi',
          },
          {
            displayName: 'CPU',
            identifier: 'cpu',
            resourceType: IdentifierResourceType.CPU,
            minCount: '-1',
            maxCount: '2',
            defaultCount: '1',
          },
        ],
      }),
    ];
    const hardwareProfilesResult = hardwareProfileWarning(hardwareProfilesMock);
    expect(hardwareProfilesResult[0].spec.warning).toStrictEqual({
      message: `Minimum allowed ${IdentifierResourceType.CPU} cannot be negative. Edit the profile to make the profile valid.`,
      title: 'Invalid hardware profile',
    });
  });

  it('should generate warnings for negative max value', async () => {
    const hardwareProfilesMock = [
      mockHardwareProfile({
        uid: 'test-4',
        enabled: false,
        identifiers: [
          {
            displayName: 'Memory',
            identifier: 'memory',
            resourceType: IdentifierResourceType.MEMORY,
            minCount: '2Gi',
            maxCount: '5Gi',
            defaultCount: '2Gi',
          },
          {
            displayName: 'CPU',
            identifier: 'cpu',
            resourceType: IdentifierResourceType.CPU,
            minCount: '1',
            maxCount: '-2',
            defaultCount: '1',
          },
        ],
      }),
    ];
    const hardwareProfilesResult = hardwareProfileWarning(hardwareProfilesMock);
    expect(hardwareProfilesResult[0].spec.warning).toStrictEqual({
      message: `Maximum allowed ${IdentifierResourceType.CPU} cannot be negative. Edit the profile to make the profile valid.`,
      title: 'Invalid hardware profile',
    });
  });

  it('should generate warnings for negative default count', async () => {
    const hardwareProfilesMock = [
      mockHardwareProfile({
        uid: 'test-4',
        enabled: false,
        identifiers: [
          {
            displayName: 'Memory',
            identifier: 'memory',
            resourceType: IdentifierResourceType.MEMORY,
            minCount: '2Gi',
            maxCount: '5Gi',
            defaultCount: '-2Gi',
          },
          {
            displayName: 'CPU',
            identifier: 'cpu',
            resourceType: IdentifierResourceType.CPU,
            minCount: '1',
            maxCount: '2',
            defaultCount: '1',
          },
        ],
      }),
    ];
    const hardwareProfilesResult = hardwareProfileWarning(hardwareProfilesMock);
    expect(hardwareProfilesResult[0].spec.warning).toStrictEqual({
      message: `Default count for ${IdentifierResourceType.MEMORY} cannot be negative. Edit the profile to make the profile valid.`,
      title: 'Invalid hardware profile',
    });
  });

  it('should generate warnings for invalid identifier counts', async () => {
    const hardwareProfilesMock = [
      mockHardwareProfile({
        uid: 'test-5',
        labels: {
          'opendatahub.io/ootb': 'true',
        },
        enabled: false,
        identifiers: [
          {
            displayName: 'Memory',
            identifier: 'memory',
            resourceType: IdentifierResourceType.MEMORY,
            minCount: 'Gi',
            maxCount: '5Gi',
            defaultCount: '2Gi',
          },
          {
            displayName: 'CPU',
            identifier: 'cpu',
            resourceType: IdentifierResourceType.CPU,
            minCount: '1',
            maxCount: '2',
            defaultCount: '1',
          },
        ],
      }),
    ];
    const hardwareProfilesResult = hardwareProfileWarning(hardwareProfilesMock);
    expect(hardwareProfilesResult[0].spec.warning).toStrictEqual({
      message: `The resource count for ${IdentifierResourceType.MEMORY} has an invalid unit. Select the restore button to restore the Default profile to its initial state.`,
      title: 'Invalid default hardware profile',
    });
  });

  it('should generate warnings for a default profile without resources', async () => {
    const hardwareProfilesMock = [
      mockHardwareProfile({
        uid: 'test-6',
        enabled: false,
        labels: {
          'opendatahub.io/ootb': 'true',
        },
        identifiers: [],
      }),
    ];
    const hardwareProfilesResult = hardwareProfileWarning(hardwareProfilesMock);
    expect(hardwareProfilesResult[0].spec.warning).toStrictEqual({
      message:
        'Omitting CPU or Memory resources is not recommended. Select the restore button to restore the Default profile to its initial state.',
      title: 'Incomplete default hardware profile',
    });
  });

  it('should generate warnings for default value outside of min/max range', async () => {
    const hardwareProfilesMock = [
      mockHardwareProfile({
        uid: 'test-7',
        enabled: false,
        identifiers: [
          {
            displayName: 'Memory',
            identifier: 'memory',
            resourceType: IdentifierResourceType.MEMORY,
            minCount: '0Gi',
            maxCount: '5Gi',
            defaultCount: '6Gi',
          },
          {
            displayName: 'CPU',
            identifier: 'cpu',
            resourceType: IdentifierResourceType.CPU,
            minCount: '5',
            maxCount: '10',
            defaultCount: '5',
          },
        ],
      }),
    ];
    const hardwareProfilesResult = hardwareProfileWarning(hardwareProfilesMock);
    expect(hardwareProfilesResult[0].spec.warning).toStrictEqual({
      message: `The default count for ${IdentifierResourceType.MEMORY} must be between the minimum allowed ${IdentifierResourceType.MEMORY} and maximum allowed ${IdentifierResourceType.MEMORY}. Edit the profile to make the profile valid.`,
      title: 'Invalid hardware profile',
    });
  });

  it('should generate warnings for a default profile outside of min/max range', async () => {
    const hardwareProfilesMock = [
      mockHardwareProfile({
        uid: 'test-8',
        enabled: false,
        labels: {
          'opendatahub.io/ootb': 'true',
        },
        identifiers: [
          {
            displayName: 'Memory',
            identifier: 'memory',
            resourceType: IdentifierResourceType.MEMORY,
            minCount: '0Gi',
            maxCount: '5Gi',
            defaultCount: '2Gi',
          },
          {
            displayName: 'CPU',
            identifier: 'cpu',
            resourceType: IdentifierResourceType.CPU,
            minCount: '5',
            maxCount: '10',
            defaultCount: '11',
          },
        ],
      }),
    ];
    const hardwareProfilesResult = hardwareProfileWarning(hardwareProfilesMock);
    expect(hardwareProfilesResult[0].spec.warning).toStrictEqual({
      message: `The default count for ${IdentifierResourceType.CPU} must be between the minimum allowed ${IdentifierResourceType.CPU} and maximum allowed ${IdentifierResourceType.CPU}. Select the restore button to restore the Default profile to its initial state.`,
      title: 'Invalid default hardware profile',
    });
  });
});
