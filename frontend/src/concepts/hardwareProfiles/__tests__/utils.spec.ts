import { sortIdentifiers } from '~/concepts/hardwareProfiles/utils';
import { Identifier } from '~/types';

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
