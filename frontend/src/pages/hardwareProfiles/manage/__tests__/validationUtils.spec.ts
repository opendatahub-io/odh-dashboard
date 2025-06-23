import {
  TolerationOperator,
  TolerationEffect,
  IdentifierResourceType,
  SchedulingType,
} from '#~/types';
import {
  manageHardwareProfileValidationSchema,
  nodeSelectorSchema,
  schedulingSchema,
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
    name: 'test-name',
    description: 'A valid hardware profile',
    visibility: [],
    scheduling: {
      type: SchedulingType.NODE,
      node: {
        nodeSelector: { 'test-key': 'test-value' },
        tolerations: [
          {
            key: 'node-type',
            operator: TolerationOperator.EQUAL,
            value: 'gpu',
            effect: TolerationEffect.NO_SCHEDULE,
            tolerationSeconds: 300,
          },
        ],
      },
    },
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

  it('should validate with queue scheduling type', () => {
    const queueSchedulingData = {
      ...validData,
      scheduling: {
        type: SchedulingType.QUEUE,
        kueue: {
          localQueueName: 'test-queue',
          priorityClass: 'high',
        },
      },
    };

    const result = manageHardwareProfileValidationSchema.safeParse(queueSchedulingData);
    expect(result.success).toBe(true);
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

  describe('schedulingSchema', () => {
    it('should pass for valid queue scheduling', () => {
      const validQueueScheduling = {
        type: SchedulingType.QUEUE,
        kueue: {
          localQueueName: 'test-queue',
          priorityClass: 'high',
        },
      };
      const result = schedulingSchema.safeParse(validQueueScheduling);
      expect(result.success).toBe(true);
    });

    it('should pass for valid node scheduling', () => {
      const validNodeScheduling = {
        type: SchedulingType.NODE,
        node: {
          nodeSelector: { 'test-key': 'test-value' },
          tolerations: [
            {
              key: 'node-type',
              operator: TolerationOperator.EQUAL,
              value: 'gpu',
              effect: TolerationEffect.NO_SCHEDULE,
            },
          ],
        },
      };
      const result = schedulingSchema.safeParse(validNodeScheduling);
      expect(result.success).toBe(true);
    });

    it('should fail if queue scheduling is missing localQueueName', () => {
      const invalidQueueScheduling = {
        type: SchedulingType.QUEUE,
        kueue: {
          priorityClass: 'high',
        },
      };
      const result = schedulingSchema.safeParse(invalidQueueScheduling);
      expect(result.success).toBe(false);
    });

    it('should fail if scheduling type is invalid', () => {
      const invalidScheduling = {
        type: 'INVALID_TYPE',
        node: {
          nodeSelector: { 'test-key': 'test-value' },
        },
      };
      const result = schedulingSchema.safeParse(invalidScheduling);
      expect(result.success).toBe(false);
    });
  });
});
