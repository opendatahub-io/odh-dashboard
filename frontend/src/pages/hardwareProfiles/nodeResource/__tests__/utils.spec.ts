import { Identifier } from '#~/types';
import {
  getValidationMessage,
  validateDefaultCount,
  validateMaxCount,
  validateMinCount,
} from '#~/pages/hardwareProfiles/nodeResource/utils';
import { CPU_UNITS, MEMORY_UNITS_FOR_SELECTION } from '#~/utilities/valueUnits';

const memoryIdentifier: Identifier = {
  displayName: 'test',
  identifier: 'test',
  defaultCount: '2Gi',
  minCount: '1Gi',
  maxCount: '4Gi',
};

const cpuIdentifier: Identifier = {
  displayName: 'test',
  identifier: 'test',
  defaultCount: '2',
  minCount: '500m',
  maxCount: '4',
};

const otherIdentifier: Identifier = {
  displayName: 'test',
  identifier: 'test',
  defaultCount: '4',
  minCount: '2',
  maxCount: '8',
};

describe('CPU', () => {
  describe('validateDefaultCount', () => {
    it('should return true if defaultCount is between minCount and maxCount', () => {
      const result = validateDefaultCount(cpuIdentifier, CPU_UNITS);
      expect(result.isValid).toBe(true);
      expect(getValidationMessage(result.issues)).toBeUndefined();
    });

    it('should return false if defaultCount is less than minCount', () => {
      const result = validateDefaultCount(
        {
          ...cpuIdentifier,
          defaultCount: '200m',
        },
        CPU_UNITS,
      );

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe(
        'Default value must be equal to or between the minimum and maximum allowed limits.',
      );
    });

    it('should return false if defaultCount is greater than maxCount', () => {
      const result = validateDefaultCount(
        {
          ...cpuIdentifier,
          defaultCount: '5',
        },
        CPU_UNITS,
      );

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe(
        'Default value must be equal to or between the minimum and maximum allowed limits.',
      );
    });

    it('should return true if maxCount is not defined', () => {
      const result = validateDefaultCount(
        {
          ...cpuIdentifier,
          defaultCount: '5',
          maxCount: undefined,
        },
        CPU_UNITS,
      );

      expect(result.isValid).toBe(true);
      expect(getValidationMessage(result.issues)).toBeUndefined();
    });

    it('should return false if the field is empty', () => {
      const result = validateDefaultCount(
        {
          ...cpuIdentifier,
          defaultCount: 'm',
        },
        CPU_UNITS,
      );

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe('Default value must be provided.');
    });

    it('should return false if the field is zero', () => {
      const result = validateDefaultCount(
        {
          ...cpuIdentifier,
          defaultCount: '0',
        },
        CPU_UNITS,
      );

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe('Default value must be a positive number.');
    });
  });

  describe('validateMinCount', () => {
    it('should return true if minCount is less than maxCount', () => {
      const result = validateMinCount(cpuIdentifier, CPU_UNITS);
      expect(result.isValid).toBe(true);
      expect(getValidationMessage(result.issues)).toBeUndefined();
    });

    it('should return false if minCount is greater than maxCount', () => {
      const result = validateMinCount(
        {
          ...cpuIdentifier,
          minCount: '8',
        },
        CPU_UNITS,
      );

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe(
        'Minimum allowed value cannot exceed the maximum allowed value (if specified).',
      );
    });

    it('should return true if maxCount is not defined', () => {
      const result = validateMinCount(
        {
          ...cpuIdentifier,
          minCount: '8',
          maxCount: undefined,
        },
        CPU_UNITS,
      );

      expect(result.isValid).toBe(true);
      expect(getValidationMessage(result.issues)).toBeUndefined();
    });

    it('should return false if minCount is empty', () => {
      const result = validateMinCount(
        {
          ...cpuIdentifier,
          minCount: 'm',
        },
        CPU_UNITS,
      );

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe('Minimum allowed value must be provided.');
    });

    it('should return false if minCount is zero', () => {
      const result = validateMinCount(
        {
          ...cpuIdentifier,
          minCount: '0m',
        },
        CPU_UNITS,
      );

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe(
        'Minimum allowed value must be a positive number.',
      );
    });
  });

  describe('validateMaxCount', () => {
    it('should return true if maxCount is not defined', () => {
      const result = validateMaxCount(
        {
          ...cpuIdentifier,
          maxCount: undefined,
        },
        CPU_UNITS,
      );

      expect(result.isValid).toBe(true);
      expect(getValidationMessage(result.issues)).toBeUndefined();
    });

    it('should return false if maxCount is empty', () => {
      const result = validateMaxCount(
        {
          ...cpuIdentifier,
          maxCount: 'm',
        },
        CPU_UNITS,
      );

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe('Maximum allowed value must be provided.');
    });

    it('should return false if maxCount is zero', () => {
      const result = validateMaxCount(
        {
          ...cpuIdentifier,
          maxCount: '0m',
        },
        CPU_UNITS,
      );

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe(
        'Maximum allowed value must be a positive number.',
      );
    });
  });
});

describe('Memory', () => {
  describe('validateDefaultCount', () => {
    it('should return true if defaultCount is between minCount and maxCount', () => {
      const result = validateDefaultCount(memoryIdentifier, MEMORY_UNITS_FOR_SELECTION);
      expect(result.isValid).toBe(true);
      expect(getValidationMessage(result.issues)).toBeUndefined();
    });

    it('should return false if defaultCount is less than minCount', () => {
      const result = validateDefaultCount(
        {
          ...memoryIdentifier,
          defaultCount: '512Mi',
        },
        MEMORY_UNITS_FOR_SELECTION,
      );

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe(
        'Default value must be equal to or between the minimum and maximum allowed limits.',
      );
    });

    it('should return false if defaultCount is greater than maxCount', () => {
      const result = validateDefaultCount(
        {
          ...memoryIdentifier,
          defaultCount: '8Gi',
        },
        MEMORY_UNITS_FOR_SELECTION,
      );

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe(
        'Default value must be equal to or between the minimum and maximum allowed limits.',
      );
    });

    it('should return true if maxCount is not defined', () => {
      const result = validateDefaultCount(
        {
          ...memoryIdentifier,
          defaultCount: '8Gi',
          maxCount: undefined,
        },
        MEMORY_UNITS_FOR_SELECTION,
      );

      expect(result.isValid).toBe(true);
      expect(getValidationMessage(result.issues)).toBeUndefined();
    });

    it('should return false if the field is empty', () => {
      const result = validateDefaultCount(
        {
          ...memoryIdentifier,
          defaultCount: 'Gi',
        },
        MEMORY_UNITS_FOR_SELECTION,
      );

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe('Default value must be provided.');
    });

    it('should return false if the field is zero', () => {
      const result = validateDefaultCount(
        {
          ...memoryIdentifier,
          defaultCount: '0Gi',
        },
        MEMORY_UNITS_FOR_SELECTION,
      );

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe('Default value must be a positive number.');
    });
  });

  describe('validateMinCount', () => {
    it('should return true if minCount is less than maxCount', () => {
      const result = validateMinCount(memoryIdentifier, MEMORY_UNITS_FOR_SELECTION);
      expect(result.isValid).toBe(true);
      expect(getValidationMessage(result.issues)).toBeUndefined();
    });

    it('should return false if minCount is greater than maxCount', () => {
      const result = validateMinCount(
        {
          ...memoryIdentifier,
          minCount: '8Gi',
          maxCount: '4Gi',
        },
        MEMORY_UNITS_FOR_SELECTION,
      );

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe(
        'Minimum allowed value cannot exceed the maximum allowed value (if specified).',
      );
    });

    it('should return true if maxCount is not defined', () => {
      const result = validateMinCount(
        {
          ...memoryIdentifier,
          minCount: '8Gi',
          maxCount: undefined,
        },
        MEMORY_UNITS_FOR_SELECTION,
      );

      expect(result.isValid).toBe(true);
      expect(getValidationMessage(result.issues)).toBeUndefined();
    });

    it('should return false if minCount is empty', () => {
      const result = validateMinCount(
        {
          ...memoryIdentifier,
          minCount: 'Gi',
        },
        MEMORY_UNITS_FOR_SELECTION,
      );

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe('Minimum allowed value must be provided.');
    });

    it('should return false if minCount is zero', () => {
      const result = validateMinCount(
        {
          ...memoryIdentifier,
          minCount: '0Gi',
        },
        MEMORY_UNITS_FOR_SELECTION,
      );

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe(
        'Minimum allowed value must be a positive number.',
      );
    });
  });

  describe('validateMaxCount', () => {
    it('should return true if maxCount is not defined', () => {
      const result = validateMaxCount(
        {
          ...memoryIdentifier,
          maxCount: undefined,
        },
        MEMORY_UNITS_FOR_SELECTION,
      );

      expect(result.isValid).toBe(true);
      expect(getValidationMessage(result.issues)).toBeUndefined();
    });

    it('should return false if maxCount is empty', () => {
      const result = validateMaxCount(
        {
          ...memoryIdentifier,
          maxCount: 'Gi',
        },
        MEMORY_UNITS_FOR_SELECTION,
      );

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe('Maximum allowed value must be provided.');
    });

    it('should return false if maxCount is zero', () => {
      const result = validateMaxCount(
        {
          ...memoryIdentifier,
          maxCount: '0Gi',
        },
        MEMORY_UNITS_FOR_SELECTION,
      );

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe(
        'Maximum allowed value must be a positive number.',
      );
    });
  });
});

describe('Other', () => {
  describe('validateDefaultCount', () => {
    it('should return true if defaultCount is between minCount and maxCount', () => {
      const result = validateDefaultCount(otherIdentifier);
      expect(result.isValid).toBe(true);
      expect(getValidationMessage(result.issues)).toBeUndefined();
    });

    it('should return false if defaultCount is less than minCount', () => {
      const result = validateDefaultCount({
        ...otherIdentifier,
        defaultCount: '1',
      });

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe(
        'Default value must be equal to or between the minimum and maximum allowed limits.',
      );
    });

    it('should return false if defaultCount is greater than maxCount', () => {
      const result = validateDefaultCount({
        ...otherIdentifier,
        defaultCount: '9',
      });

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe(
        'Default value must be equal to or between the minimum and maximum allowed limits.',
      );
    });

    it('should return true if maxCount is not defined', () => {
      const result = validateDefaultCount({
        ...otherIdentifier,
        defaultCount: '9',
        maxCount: undefined,
      });

      expect(result.isValid).toBe(true);
      expect(getValidationMessage(result.issues)).toBeUndefined();
    });

    it('should return false if the field is empty', () => {
      const result = validateDefaultCount({
        ...otherIdentifier,
        defaultCount: 'undefined',
      });

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe('Value must be a number.');
    });

    it('should return false if the field is zero', () => {
      const result = validateDefaultCount({
        ...otherIdentifier,
        defaultCount: '0',
      });

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe('Value must be a positive number.');
    });
  });

  describe('validateMinCount', () => {
    it('should return true if minCount is less than maxCount', () => {
      const result = validateMinCount(otherIdentifier);
      expect(result.isValid).toBe(true);
      expect(getValidationMessage(result.issues)).toBeUndefined();
    });

    it('should return false if minCount is greater than maxCount', () => {
      const result = validateMinCount({
        ...otherIdentifier,
        minCount: '9',
      });

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe(
        'Minimum allowed value cannot exceed the maximum allowed value (if specified).',
      );
    });

    it('should return true if maxCount is not defined', () => {
      const result = validateMinCount({
        ...otherIdentifier,
        minCount: '9',
        maxCount: undefined,
      });

      expect(result.isValid).toBe(true);
      expect(getValidationMessage(result.issues)).toBeUndefined();
    });

    it('should return false if minCount is empty', () => {
      const result = validateMinCount({
        ...otherIdentifier,
        minCount: 'undefined',
      });

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe('Value must be a number.');
    });

    it('should return false if minCount is zero', () => {
      const result = validateMinCount({
        ...otherIdentifier,
        minCount: '0',
      });

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe('Value must be a positive number.');
    });
  });

  describe('validateMaxCount', () => {
    it('should return true if maxCount is not defined', () => {
      const result = validateMaxCount({
        ...otherIdentifier,
        maxCount: undefined,
      });

      expect(result.isValid).toBe(true);
      expect(getValidationMessage(result.issues)).toBeUndefined();
    });

    it('should return false if maxCount is empty', () => {
      const result = validateMaxCount({
        ...otherIdentifier,
        maxCount: 'undefined',
      });

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe('Value must be a number.');
    });

    it('should return false if maxCount is zero', () => {
      const result = validateMaxCount({
        ...otherIdentifier,
        maxCount: '0',
      });

      expect(result.isValid).toBe(false);
      expect(getValidationMessage(result.issues)).toBe('Value must be a positive number.');
    });
  });
});
