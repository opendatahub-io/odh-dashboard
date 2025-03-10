import { mockHardwareProfile } from '~/__mocks__/mockHardwareProfile';
import { IdentifierResourceType } from '~/types';
import { validateProfileWarning } from '~/pages/hardwareProfiles/utils';
import { HardwareProfileWarningType } from '~/concepts/hardwareProfiles/types';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

describe('validateProfileWarning', () => {
  it('should generate warnings for min being larger than max', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-1',
      enabled: false,
      identifiers: [
        {
          displayName: 'Memory',
          identifier: 'memory',
          resourceType: IdentifierResourceType.MEMORY,
          minCount: '20Gi',
          maxCount: '11Gi',
          defaultCount: '7Gi',
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
    });
    const hardwareProfilesResult = validateProfileWarning(hardwareProfileMock);
    expect(hardwareProfilesResult).toEqual([
      {
        type: HardwareProfileWarningType.OTHER,
        message: `Minimum allowed ${IdentifierResourceType.MEMORY} cannot exceed maximum allowed ${IdentifierResourceType.MEMORY}. Edit the profile to make the profile valid.`,
      },
      {
        type: HardwareProfileWarningType.OTHER,
        message: `The default count for ${IdentifierResourceType.MEMORY} must be between the minimum allowed ${IdentifierResourceType.MEMORY} and maximum allowed ${IdentifierResourceType.MEMORY}. Edit the profile to make the profile valid.`,
      },
    ]);
  });

  it('should generate warnings for negative min value', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-2',
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
    });
    const hardwareProfilesResult = validateProfileWarning(hardwareProfileMock);
    expect(hardwareProfilesResult).toEqual([
      {
        type: HardwareProfileWarningType.OTHER,
        message: `Minimum allowed ${IdentifierResourceType.CPU} cannot be negative. Edit the profile to make the profile valid.`,
      },
    ]);
  });

  it('should generate warnings for negative max value and negative default count', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-3',
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
          maxCount: '-2',
          defaultCount: '1',
        },
      ],
    });
    const hardwareProfilesResult = validateProfileWarning(hardwareProfileMock);
    expect(hardwareProfilesResult).toEqual([
      {
        type: HardwareProfileWarningType.OTHER,
        message: `Default count for ${IdentifierResourceType.MEMORY} cannot be negative. Edit the profile to make the profile valid.`,
      },
      {
        type: HardwareProfileWarningType.OTHER,
        message: `Maximum allowed ${IdentifierResourceType.CPU} cannot be negative. Edit the profile to make the profile valid.`,
      },
    ]);
  });

  it('should generate warnings for invalid identifier counts', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-4',
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
    });
    const hardwareProfilesResult = validateProfileWarning(hardwareProfileMock);
    expect(hardwareProfilesResult).toEqual([
      {
        type: HardwareProfileWarningType.OTHER,
        message: `The resource count for ${IdentifierResourceType.MEMORY} has an invalid unit. Edit the profile to make the profile valid.`,
      },
    ]);
  });

  it('should generate warnings for decimal minimum and maximum count', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-7',
      enabled: true,
      identifiers: [
        {
          displayName: 'Memory',
          identifier: 'memory',
          resourceType: IdentifierResourceType.MEMORY,
          minCount: '0.239879842Gi',
          maxCount: '5Gi',
          defaultCount: '2Gi',
        },
        {
          displayName: 'CPU',
          identifier: 'cpu',
          resourceType: IdentifierResourceType.CPU,
          minCount: 1,
          maxCount: '4.88',
          defaultCount: 2,
        },
      ],
    });
    const hardwareProfilesResult = validateProfileWarning(hardwareProfileMock);
    expect(hardwareProfilesResult).toEqual([
      {
        type: HardwareProfileWarningType.OTHER,
        message: `Minimum count for ${IdentifierResourceType.MEMORY} cannot be a decimal. Edit the profile to make the profile valid.`,
      },
      {
        type: HardwareProfileWarningType.OTHER,
        message: `Maximum count for ${IdentifierResourceType.CPU} cannot be a decimal. Edit the profile to make the profile valid.`,
      },
    ]);
  });

  it('should generate warnings for decimal default count', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-8',
      enabled: false,
      identifiers: [
        {
          displayName: 'Memory',
          identifier: 'memory',
          resourceType: IdentifierResourceType.MEMORY,
          minCount: '0Gi',
          maxCount: '5Gi',
          defaultCount: '2.2384092380Gi',
        },
        {
          displayName: 'CPU',
          identifier: 'cpu',
          resourceType: IdentifierResourceType.CPU,
          minCount: '5',
          maxCount: '10',
          defaultCount: '6',
        },
      ],
    });
    const hardwareProfilesResult = validateProfileWarning(hardwareProfileMock);
    expect(hardwareProfilesResult).toEqual([
      {
        type: HardwareProfileWarningType.OTHER,
        message: `Default count for ${IdentifierResourceType.MEMORY} cannot be a decimal. Edit the profile to make the profile valid.`,
      },
    ]);
  });
});
