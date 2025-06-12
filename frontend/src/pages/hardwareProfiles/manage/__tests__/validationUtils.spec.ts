import { TolerationOperator, TolerationEffect, IdentifierResourceType } from '#~/types';
import {
  manageHardwareProfileValidationSchema,
  nodeSelectorSchema,
} from '#~/pages/hardwareProfiles/manage/validationUtils';

describe('manageHardwareProfileValidationSchema', () => {
  const validData = {
    displayName: 'Test Profile',
    enabled: true,
    identifiers: [
      {
        displayName: 'CPU',
        identifier: 'cpu',
        resourceType: IdentifierResourceType.CPU,
        defaultCount: 2,
        minCount: 1,
        maxCount: 4,
      },
      {
        displayName: 'Memory',
        identifier: 'memory',
        resourceType: IdentifierResourceType.MEMORY,
        defaultCount: '2Gi',
        minCount: '1Gi',
        maxCount: '4Gi',
      },
    ],
    tolerations: [
      {
        key: 'node-type',
        operator: TolerationOperator.EQUAL,
        value: 'gpu',
        effect: TolerationEffect.NO_SCHEDULE,
        tolerationSeconds: 300,
      },
    ],
    nodeSelector: { 'test-key': 'test-value' },
    name: 'test-name',
    description: 'A valid hardware profile',
    visibility: [],
  };

  it('should validate a correct hardware profile', () => {
    const result = manageHardwareProfileValidationSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should fail when name is empty', () => {
    const invalidData = {
      ...validData,
      name: '',
    };

    const result = manageHardwareProfileValidationSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should allow optional tolerations', () => {
    const validDataWithoutTolerations = {
      ...validData,
      tolerations: undefined,
    };

    const result = manageHardwareProfileValidationSchema.safeParse(validDataWithoutTolerations);
    expect(result.success).toBe(true);
  });

  it('should fail if resourceType is invalid', () => {
    const invalidData = {
      ...validData,
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          resourceType: 'INVALID_TYPE', // Not in IdentifierResourceType enum
          defaultCount: 2,
          minCount: 1,
          maxCount: 4,
        },
      ],
    };

    const result = manageHardwareProfileValidationSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should fail if memory resource is missing', () => {
    const invalidData = {
      ...validData,
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          resourceType: IdentifierResourceType.CPU,
          defaultCount: 2,
          minCount: 1,
          maxCount: 4,
        },
      ],
    };

    const result = manageHardwareProfileValidationSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should fail if CPU resource is missing', () => {
    const invalidData = {
      ...validData,
      identifiers: [
        {
          displayName: 'Memory',
          identifier: 'memory',
          resourceType: IdentifierResourceType.MEMORY,
          defaultCount: 2,
          minCount: 1,
          maxCount: 4,
        },
      ],
    };

    const result = manageHardwareProfileValidationSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  describe('nodeSelectorSchema', () => {
    it('should pass for valid nodeSelector', () => {
      const validNodeSelector = { key1: 'value1', key2: 'value2' };
      const result = nodeSelectorSchema.safeParse(validNodeSelector);
      expect(result.success).toBe(true);
    });

    it('should fail if nodeSelector has an empty key', () => {
      const invalidNodeSelector = { '': 'value1' };
      const result = nodeSelectorSchema.safeParse(invalidNodeSelector);
      expect(result.success).toBe(false);
    });

    it('should fail if nodeSelector has an empty value', () => {
      const invalidNodeSelector = { key1: '' };
      const result = nodeSelectorSchema.safeParse(invalidNodeSelector);
      expect(result.success).toBe(false);
    });

    it('should fail if nodeSelector has empty key and value', () => {
      const invalidNodeSelector = { '': '' };
      const result = nodeSelectorSchema.safeParse(invalidNodeSelector);
      expect(result.success).toBe(false);
    });
  });
});
