import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import { getProfileScore, sortIdentifiers } from '#~/concepts/hardwareProfiles/utils';
import { HardwareProfileKind } from '#~/k8sTypes';
import { Identifier, IdentifierResourceType } from '#~/types';

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
