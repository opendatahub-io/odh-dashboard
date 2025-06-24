import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import {
  convertOldToNew,
  getProfileScore,
  isOldHardwareProfile,
  sortIdentifiers,
} from '#~/concepts/hardwareProfiles/utils';
import { HardwareProfileKind } from '#~/k8sTypes';
import {
  DisplayNameAnnotation,
  Identifier,
  IdentifierResourceType,
  SchedulingType,
  TolerationEffect,
  TolerationOperator,
} from '#~/types';

describe('sortIdentifiers', () => {
  it('should sort CPU and memory first, followed by other identifiers', () => {
    const identifiers: Identifier[] = [
      {
        identifier: 'storage',
        displayName: 'Storage',
        minCount: 1,
        maxCount: 4,
        defaultCount: 1,
      },
      {
        identifier: 'memory',
        displayName: 'Memory',
        minCount: 1,
        maxCount: 1,
        defaultCount: 1,
      },
      {
        identifier: 'cpu',
        displayName: 'CPU',
        minCount: 1,
        maxCount: 1,
        defaultCount: 1,
      },
      {
        identifier: 'gpu',
        displayName: 'GPU',
        minCount: 0,
        maxCount: 4,
        defaultCount: 0,
      },
    ];

    const result = sortIdentifiers(identifiers);

    expect(result).toEqual([
      {
        identifier: 'cpu',
        displayName: 'CPU',
        minCount: 1,
        maxCount: 1,
        defaultCount: 1,
      },
      {
        identifier: 'memory',
        displayName: 'Memory',
        minCount: 1,
        maxCount: 1,
        defaultCount: 1,
      },
      {
        identifier: 'storage',
        displayName: 'Storage',
        minCount: 1,
        maxCount: 4,
        defaultCount: 1,
      },
      {
        identifier: 'gpu',
        displayName: 'GPU',
        minCount: 0,
        maxCount: 4,
        defaultCount: 0,
      },
    ]);
  });

  it('should handle empty array', () => {
    const identifiers: Identifier[] = [];
    const result = sortIdentifiers(identifiers);
    expect(result).toEqual([]);
  });
});

describe('getProfileScore', () => {
  it('should return 0, if no identifier exist', () => {
    const profile: HardwareProfileKind = mockHardwareProfile({});
    delete profile.spec.identifiers;
    const result = getProfileScore(profile);
    expect(result).toEqual(0);
  });

  it('should return Number.MAX_SAFE_INTEGER, when profile with no maxValue', () => {
    const profile: HardwareProfileKind = mockHardwareProfile({
      identifiers: [
        {
          displayName: 'Memory',
          identifier: 'memory',
          minCount: '2Gi',
          defaultCount: '2Gi',
          resourceType: IdentifierResourceType.MEMORY,
        },
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: '1',
          maxCount: '2',
          defaultCount: '1',
          resourceType: IdentifierResourceType.CPU,
        },
      ],
    });

    const result = getProfileScore(profile);
    expect(result).toEqual(Number.MAX_SAFE_INTEGER);
  });

  it('should return NaN, if maxCount is not number', () => {
    const profile: HardwareProfileKind = mockHardwareProfile({
      identifiers: [
        {
          identifier: 'memory',
          displayName: 'Memory',
          minCount: 1,
          maxCount: 'test',
          defaultCount: 1,
        },
      ],
    });
    const result = getProfileScore(profile);
    expect(result).toEqual(NaN);
  });

  it('convert CPU to smallest unit for comparison, when resourceType has just CPU', () => {
    const profile: HardwareProfileKind = mockHardwareProfile({
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: '1',
          maxCount: '2',
          defaultCount: '1',
          resourceType: IdentifierResourceType.CPU,
        },
      ],
    });
    const result = getProfileScore(profile);
    expect(result).toEqual(2000);
  });

  it('convert memory to smallest unit for comparison, when resourceType has just memory', () => {
    const profile: HardwareProfileKind = mockHardwareProfile({
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: '1',
          maxCount: '2',
          defaultCount: '1',
          resourceType: IdentifierResourceType.CPU,
        },
      ],
    });
    const result = getProfileScore(profile);
    expect(result).toEqual(2000);
  });

  it('convert memory & CPU to smallest unit for comparison, when identifier has both memory and CPU', () => {
    const profile: HardwareProfileKind = mockHardwareProfile({});
    const result = getProfileScore(profile);
    expect(result).toEqual(5368711120);
  });

  it('calculate score, when identifier has other resourceType than memory and CPU', () => {
    const profile: HardwareProfileKind = mockHardwareProfile({
      identifiers: [
        {
          identifier: 'storage',
          displayName: 'Storage',
          minCount: 1,
          maxCount: 4,
          defaultCount: 1,
        },
        {
          identifier: 'gpu',
          displayName: 'GPU',
          minCount: 0,
          maxCount: 4,
          defaultCount: 0,
        },
      ],
    });
    const result = getProfileScore(profile);
    expect(result).toEqual(8);
  });
});
// Remove once the new HardwareProfile crd is fully rolled out
//--------------------------------------------------------------------------------------------------
describe('isOldHardwareProfile', () => {
  it('should return true for hardware profiles with displayName and enabled in spec', () => {
    const profile: HardwareProfileKind = {
      apiVersion: 'dashboard.opendatahub.io/v1alpha1',
      kind: 'HardwareProfile',
      metadata: {
        name: 'test-profile',
        namespace: 'test-namespace',
      },
      spec: {
        displayName: 'Test Profile',
        enabled: true,
      },
    };
    const result = isOldHardwareProfile(profile);
    expect(result).toBe(true);
  });

  it('should return false for hardware profiles without displayName in spec', () => {
    const profile: HardwareProfileKind = {
      apiVersion: 'dashboard.opendatahub.io/v1alpha1',
      kind: 'HardwareProfile',
      metadata: {
        name: 'test-profile',
        namespace: 'test-namespace',
      },
      spec: {
        enabled: true,
      },
    };
    const result = isOldHardwareProfile(profile);
    expect(result).toBe(false);
  });

  it('should return false for hardware profiles without enabled in spec', () => {
    const profile: HardwareProfileKind = {
      apiVersion: 'dashboard.opendatahub.io/v1alpha1',
      kind: 'HardwareProfile',
      metadata: {
        name: 'test-profile',
        namespace: 'test-namespace',
      },
      spec: {
        displayName: 'Test Profile',
      },
    };
    const result = isOldHardwareProfile(profile);
    expect(result).toBe(false);
  });

  it('should return false for hardware profiles with neither displayName nor enabled in spec', () => {
    const profile: HardwareProfileKind = {
      apiVersion: 'dashboard.opendatahub.io/v1alpha1',
      kind: 'HardwareProfile',
      metadata: {
        name: 'test-profile',
        namespace: 'test-namespace',
      },
      spec: {},
    };
    const result = isOldHardwareProfile(profile);
    expect(result).toBe(false);
  });
});

describe('convertOldToNew', () => {
  it('should correctly migrate displayName/description/enabled into annotations', () => {
    const oldProfile: HardwareProfileKind = {
      apiVersion: 'dashboard.opendatahub.io/v1alpha1',
      kind: 'HardwareProfile',
      metadata: {
        name: 'test-profile',
        namespace: 'test-namespace',
        annotations: {
          'existing-annotation': 'value',
        },
      },
      spec: {
        displayName: 'Test Profile',
        description: 'Test Description',
        enabled: true,
        identifiers: [
          {
            identifier: 'cpu',
            displayName: 'CPU',
            minCount: 1,
            maxCount: 2,
            defaultCount: 1,
          },
        ],
      },
    };

    const newProfile = convertOldToNew(oldProfile);

    // Check that the annotations were correctly migrated
    expect(newProfile.metadata.annotations).toEqual({
      'existing-annotation': 'value',
      [DisplayNameAnnotation.ODH_DISP_NAME]: 'Test Profile',
      [DisplayNameAnnotation.ODH_DESC]: 'Test Description',
      'opendatahub.io/disabled': 'false',
    });

    // Check that the identifiers were preserved
    expect(newProfile.spec.identifiers).toEqual(oldProfile.spec.identifiers);
  });

  it('should correctly handle nodeSelector and tolerations', () => {
    const oldProfile: HardwareProfileKind = {
      apiVersion: 'dashboard.opendatahub.io/v1alpha1',
      kind: 'HardwareProfile',
      metadata: {
        name: 'test-profile',
        namespace: 'test-namespace',
      },
      spec: {
        displayName: 'Test Profile',
        enabled: true,
        nodeSelector: {
          'node-role.kubernetes.io/worker': 'true',
        },
        tolerations: [
          {
            key: 'nvidia.com/gpu',
            operator: TolerationOperator.EXISTS,
            effect: TolerationEffect.NO_SCHEDULE,
          },
        ],
      },
    };

    const newProfile = convertOldToNew(oldProfile);

    // Check that the type and node fields were correctly created
    expect(newProfile.spec.scheduling?.type).toEqual(SchedulingType.NODE);
    expect(newProfile.spec.scheduling?.node).toEqual({
      nodeSelector: {
        'node-role.kubernetes.io/worker': 'true',
      },
      tolerations: [
        {
          key: 'nvidia.com/gpu',
          operator: TolerationOperator.EXISTS,
          effect: TolerationEffect.NO_SCHEDULE,
        },
      ],
    });
  });

  it('should correctly handle the case when there are no nodeSelector or tolerations', () => {
    const oldProfile: HardwareProfileKind = {
      apiVersion: 'dashboard.opendatahub.io/v1alpha1',
      kind: 'HardwareProfile',
      metadata: {
        name: 'test-profile',
        namespace: 'test-namespace',
      },
      spec: {
        displayName: 'Test Profile',
        enabled: true,
      },
    };

    const newProfile = convertOldToNew(oldProfile);

    // Check that there are no type and node fields
    expect(newProfile.spec.scheduling).toBeUndefined();
  });

  it('should handle empty nodeSelector and tolerations', () => {
    const oldProfile: HardwareProfileKind = {
      apiVersion: 'dashboard.opendatahub.io/v1alpha1',
      kind: 'HardwareProfile',
      metadata: {
        name: 'test-profile',
        namespace: 'test-namespace',
      },
      spec: {
        displayName: 'Test Profile',
        enabled: true,
        nodeSelector: {},
        tolerations: [],
      },
    };

    const newProfile = convertOldToNew(oldProfile);

    // Check that there are no type and node fields
    expect(newProfile.spec.scheduling).toBeUndefined();
  });

  it('should handle missing description', () => {
    const oldProfile: HardwareProfileKind = {
      apiVersion: 'dashboard.opendatahub.io/v1alpha1',
      kind: 'HardwareProfile',
      metadata: {
        name: 'test-profile',
        namespace: 'test-namespace',
      },
      spec: {
        displayName: 'Test Profile',
        enabled: true,
      },
    };

    const newProfile = convertOldToNew(oldProfile);

    // Check that the annotations were correctly migrated
    expect(newProfile.metadata.annotations).toEqual({
      [DisplayNameAnnotation.ODH_DISP_NAME]: 'Test Profile',
      'opendatahub.io/disabled': 'false',
    });
  });
});
//--------------------------------------------------------------------------------------------------
