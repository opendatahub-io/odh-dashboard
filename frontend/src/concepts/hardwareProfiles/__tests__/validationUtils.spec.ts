import { IdentifierResourceType } from '#~/types';
import { HardwareProfileKind } from '#~/k8sTypes';
import {
  createCpuSchema,
  createMemorySchema,
  createNumericSchema,
  hardwareProfileValidationSchema,
  isHardwareProfileConfigValid,
} from '#~/concepts/hardwareProfiles/validationUtils';

describe('validationUtils', () => {
  describe('createCpuSchema', () => {
    it('should validate CPU values within range', () => {
      const schema = createCpuSchema('1', '4');

      // Valid values
      expect(schema.safeParse('2').success).toBe(true);
      expect(schema.safeParse('3').success).toBe(true);
      expect(schema.safeParse(2).success).toBe(true);
      expect(schema.safeParse(undefined).success).toBe(true);

      // Invalid values - below minimum
      const belowMin = schema.safeParse('0.5');
      expect(belowMin.success).toBe(false);
      if (!belowMin.success) {
        expect(belowMin.error.errors[0].message).toBe('Must be at least 1 Cores');
      }

      // Invalid values - above maximum
      const aboveMax = schema.safeParse('5');
      expect(aboveMax.success).toBe(false);
      if (!aboveMax.success) {
        expect(aboveMax.error.errors[0].message).toBe('Must not exceed 4 Cores');
      }
    });

    it('should handle CPU values with units', () => {
      const schema = createCpuSchema('1', '4');
      expect(schema.safeParse('2').success).toBe(true);
      expect(schema.safeParse('2000').success).toBe(false);
    });
  });

  describe('createMemorySchema', () => {
    it('should validate memory values within range', () => {
      const schema = createMemorySchema('1Gi', '4Gi');

      // Valid values
      expect(schema.safeParse('2Gi').success).toBe(true);
      expect(schema.safeParse('3Gi').success).toBe(true);
      expect(schema.safeParse(undefined).success).toBe(true);

      // Invalid values - below minimum
      const belowMin = schema.safeParse('500Mi');
      expect(belowMin.success).toBe(false);
      if (!belowMin.success) {
        expect(belowMin.error.errors[0].message).toBe('Must be at least 1 GiB');
      }

      // Invalid values - above maximum
      const aboveMax = schema.safeParse('5Gi');
      expect(aboveMax.success).toBe(false);
      if (!aboveMax.success) {
        expect(aboveMax.error.errors[0].message).toBe('Must not exceed 4 GiB');
      }
    });

    it('should handle memory values with different units', () => {
      const schema = createMemorySchema('1Gi', '4Gi');
      expect(schema.safeParse('2048Mi').success).toBe(true);
      expect(schema.safeParse('2G').success).toBe(true);
    });
  });

  describe('createNumericSchema', () => {
    it('should validate numeric values within range', () => {
      const schema = createNumericSchema(1, 4);

      // Valid values
      expect(schema.safeParse(2).success).toBe(true);
      expect(schema.safeParse('3').success).toBe(true);
      expect(schema.safeParse(undefined).success).toBe(true);

      // Invalid values - below minimum
      const belowMin = schema.safeParse(0);
      expect(belowMin.success).toBe(false);
      if (!belowMin.success) {
        expect(belowMin.error.errors[0].message).toBe('Must be at least 1');
      }

      // Invalid values - above maximum
      const aboveMax = schema.safeParse(5);
      expect(aboveMax.success).toBe(false);
      if (!aboveMax.success) {
        expect(aboveMax.error.errors[0].message).toBe('Must not exceed 4');
      }

      // Invalid values - not a number
      const notNumber = schema.safeParse('abc');
      expect(notNumber.success).toBe(false);
      if (!notNumber.success) {
        expect(notNumber.error.errors[0].message).toBe('Value must be a number');
      }
    });
  });

  describe('hardwareProfileValidationSchema', () => {
    const mockProfile: HardwareProfileKind = {
      apiVersion: 'infrastructure.opendatahub.io/v1alpha1',
      kind: 'HardwareProfile',
      metadata: {
        name: 'test',
        namespace: 'test-namespace',
        annotations: {
          'opendatahub.io/display-name': 'Test Profile',
        },
      },
      spec: {
        identifiers: [
          {
            identifier: 'cpu',
            displayName: 'CPU',
            resourceType: IdentifierResourceType.CPU,
            minCount: '1',
            maxCount: '4',
            defaultCount: '2',
          },
          {
            identifier: 'memory',
            displayName: 'Memory',
            resourceType: IdentifierResourceType.MEMORY,
            minCount: '1Gi',
            maxCount: '4Gi',
            defaultCount: '2Gi',
          },
          {
            identifier: 'gpu',
            displayName: 'GPU',
            resourceType: IdentifierResourceType.ACCELERATOR,
            minCount: 0,
            maxCount: 2,
            defaultCount: 0,
          },
        ],
      },
    };

    it('should validate a valid configuration', () => {
      const validConfig = {
        selectedProfile: mockProfile,
        resources: {
          requests: {
            cpu: '2',
            memory: '2Gi',
            gpu: '1',
          },
          limits: {
            cpu: '3',
            memory: '3Gi',
            gpu: '1',
          },
        },
        useExistingSettings: false,
      };

      const result = hardwareProfileValidationSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should validate that limits are greater than or equal to requests', () => {
      const invalidConfig = {
        selectedProfile: mockProfile,
        resources: {
          requests: {
            cpu: '3',
            memory: '3Gi',
          },
          limits: {
            cpu: '2',
            memory: '2Gi',
          },
        },
        useExistingSettings: false,
      };

      const result = hardwareProfileValidationSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      if (!result.success) {
        const limitError = result.error.issues.find(
          (issue: { message: string }) =>
            issue.message === 'Limit must be greater than or equal to request',
        );
        expect(limitError?.message).toBe('Limit must be greater than or equal to request');
      }
    });

    it('should allow undefined values', () => {
      const configWithUndefined = {
        selectedProfile: mockProfile,
        resources: {
          requests: {},
          limits: {},
        },
        useExistingSettings: false,
      };

      const result = hardwareProfileValidationSchema.safeParse(configWithUndefined);
      expect(result.success).toBe(true);
    });

    it('should validate each resource type independently', () => {
      const mixedConfig = {
        selectedProfile: mockProfile,
        resources: {
          requests: {
            cpu: '0.5', // Below min
            memory: '5Gi', // Above max
            gpu: 'not-a-number', // Invalid type
          },
          limits: {
            cpu: '4',
            memory: '4Gi',
            gpu: '2',
          },
        },
        useExistingSettings: false,
      };

      const result = hardwareProfileValidationSchema.safeParse(mixedConfig);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(3); // One error for each invalid request
      }
    });
  });

  describe('isHardwareProfileConfigValid', () => {
    it('should return false when no resources and not using existing settings', () => {
      const config = {
        useExistingSettings: false,
      };
      expect(isHardwareProfileConfigValid(config)).toBe(false);
    });

    it('should validate resources when provided', () => {
      const config = {
        useExistingSettings: false,
        resources: {
          requests: { cpu: '1' },
          limits: { cpu: '2' },
        },
        selectedProfile: {
          apiVersion: 'infrastructure.opendatahub.io/v1alpha1',
          kind: 'HardwareProfile',
          metadata: {
            name: 'test',
            namespace: 'test-namespace',
            annotations: {
              'opendatahub.io/display-name': 'Test Profile',
            },
          },
          spec: {
            identifiers: [
              {
                identifier: 'cpu',
                displayName: 'CPU',
                resourceType: IdentifierResourceType.CPU,
                minCount: '1',
                maxCount: '4',
                defaultCount: '2',
              },
            ],
          },
        },
      };
      expect(isHardwareProfileConfigValid(config)).toBe(true);
    });
  });
});
