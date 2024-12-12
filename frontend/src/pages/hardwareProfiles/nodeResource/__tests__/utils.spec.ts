import { Identifier } from '~/types';
import {
  validateDefaultCount,
  validateMinCount,
} from '~/pages/hardwareProfiles/nodeResource/utils';
import { MEMORY_UNITS_FOR_SELECTION } from '~/utilities/valueUnits';

const identifier: Identifier = {
  displayName: 'test',
  identifier: 'test',
  defaultCount: '2Gi',
  minCount: '1Gi',
  maxCount: '4Gi',
};

describe('validateDefaultCount', () => {
  it('should return true if defaultCount is between minCount and maxCount', () => {
    const result = validateDefaultCount(identifier, MEMORY_UNITS_FOR_SELECTION);
    expect(result).toBe(true);
  });

  it('should return false if defaultCount is less than minCount', () => {
    const result = validateDefaultCount(
      {
        ...identifier,
        defaultCount: '512Mi',
      },
      MEMORY_UNITS_FOR_SELECTION,
    );

    expect(result).toBe(false);
  });

  it('should return false if defaultCount is greater than maxCount', () => {
    const result = validateDefaultCount(
      {
        ...identifier,
        defaultCount: '8Gi',
      },
      MEMORY_UNITS_FOR_SELECTION,
    );

    expect(result).toBe(false);
  });
});

describe('validateMinCount', () => {
  it('should return true if minCount is less than maxCount', () => {
    const result = validateMinCount(identifier, MEMORY_UNITS_FOR_SELECTION);
    expect(result).toBe(true);
  });

  it('should return false if minCount is greater than maxCount', () => {
    const result = validateMinCount(
      {
        ...identifier,
        minCount: '8Gi',
        maxCount: '4Gi',
      },
      MEMORY_UNITS_FOR_SELECTION,
    );

    expect(result).toBe(false);
  });
});
