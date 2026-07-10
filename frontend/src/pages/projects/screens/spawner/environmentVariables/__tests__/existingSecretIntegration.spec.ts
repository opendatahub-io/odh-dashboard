import {
  EnvVariable,
  EnvironmentVariableType,
  SecretCategory,
  ConfigMapCategory,
} from '#~/pages/projects/types';
import { getExistingSecretEnvVars } from '#~/pages/projects/screens/spawner/service';
import { isEnvVariableDataValid } from '#~/pages/projects/screens/spawner/spawnerUtils';
import { detectEnvVarConflicts } from '#~/pages/projects/screens/spawner/environmentVariables/envVarConflicts';
import { EMPTY_EXISTING_SECRET } from '#~/pages/projects/screens/spawner/environmentVariables/const';

describe('Existing secret integration', () => {
  describe('EMPTY_EXISTING_SECRET constant', () => {
    it('should have SECRET type and EXISTING category', () => {
      expect(EMPTY_EXISTING_SECRET.type).toBe(EnvironmentVariableType.SECRET);
      expect(EMPTY_EXISTING_SECRET.values?.category).toBe(SecretCategory.EXISTING);
      expect(EMPTY_EXISTING_SECRET.existingName).toBe('');
      expect(EMPTY_EXISTING_SECRET.values?.data).toEqual([]);
    });
  });

  describe('getExistingSecretEnvVars output structure', () => {
    it('should produce EnvironmentVariable objects with valueFrom.secretKeyRef', () => {
      const envVars: EnvVariable[] = [
        {
          type: EnvironmentVariableType.SECRET,
          existingName: 'my-db-secret',
          values: {
            category: SecretCategory.EXISTING,
            data: [
              { key: 'DB_HOST', value: '' },
              { key: 'DB_PORT', value: '' },
            ],
          },
        },
      ];

      const result = getExistingSecretEnvVars(envVars);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'DB_HOST',
        valueFrom: { secretKeyRef: { name: 'my-db-secret', key: 'DB_HOST' } },
      });
      expect(result[1]).toEqual({
        name: 'DB_PORT',
        valueFrom: { secretKeyRef: { name: 'my-db-secret', key: 'DB_PORT' } },
      });
    });

    it('should handle multiple existing secrets', () => {
      const envVars: EnvVariable[] = [
        {
          type: EnvironmentVariableType.SECRET,
          existingName: 'secret-a',
          values: {
            category: SecretCategory.EXISTING,
            data: [{ key: 'KEY_A', value: '' }],
          },
        },
        {
          type: EnvironmentVariableType.SECRET,
          existingName: 'secret-b',
          values: {
            category: SecretCategory.EXISTING,
            data: [{ key: 'KEY_B', value: '' }],
          },
        },
      ];

      const result = getExistingSecretEnvVars(envVars);

      expect(result).toHaveLength(2);
      expect(result[0].valueFrom?.secretKeyRef?.name).toBe('secret-a');
      expect(result[1].valueFrom?.secretKeyRef?.name).toBe('secret-b');
    });

    it('should exclude inline secrets from the output', () => {
      const envVars: EnvVariable[] = [
        {
          type: EnvironmentVariableType.SECRET,
          existingName: 'my-secret',
          values: {
            category: SecretCategory.EXISTING,
            data: [{ key: 'API_KEY', value: '' }],
          },
        },
        {
          type: EnvironmentVariableType.SECRET,
          values: {
            category: SecretCategory.GENERIC,
            data: [{ key: 'INLINE_KEY', value: 'inline-value' }],
          },
        },
      ];

      const result = getExistingSecretEnvVars(envVars);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('API_KEY');
    });
  });

  describe('detectEnvVarConflicts with EXISTING secrets', () => {
    it('should detect conflicts between two existing secrets sharing a key', () => {
      const envVars: EnvVariable[] = [
        {
          type: EnvironmentVariableType.SECRET,
          existingName: 'secret-1',
          values: {
            category: SecretCategory.EXISTING,
            data: [{ key: 'SHARED_KEY', value: '' }],
          },
        },
        {
          type: EnvironmentVariableType.SECRET,
          existingName: 'secret-2',
          values: {
            category: SecretCategory.EXISTING,
            data: [{ key: 'SHARED_KEY', value: '' }],
          },
        },
      ];

      const conflicts = detectEnvVarConflicts(envVars, []);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].key).toBe('SHARED_KEY');
      expect(conflicts[0].sources).toContain("Secret 'secret-1'");
      expect(conflicts[0].sources).toContain("Secret 'secret-2'");
    });

    it('should detect conflicts between existing secret and inline configmap', () => {
      const envVars: EnvVariable[] = [
        {
          type: EnvironmentVariableType.SECRET,
          existingName: 'my-secret',
          values: {
            category: SecretCategory.EXISTING,
            data: [{ key: 'APP_PORT', value: '' }],
          },
        },
        {
          type: EnvironmentVariableType.CONFIG_MAP,
          values: {
            category: ConfigMapCategory.GENERIC,
            data: [{ key: 'APP_PORT', value: '8080' }],
          },
        },
      ];

      const conflicts = detectEnvVarConflicts(envVars, []);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].key).toBe('APP_PORT');
      expect(conflicts[0].sources).toContain("Secret 'my-secret'");
    });

    it('should report no conflicts when keys are unique across sources', () => {
      const envVars: EnvVariable[] = [
        {
          type: EnvironmentVariableType.SECRET,
          existingName: 'db-secret',
          values: {
            category: SecretCategory.EXISTING,
            data: [{ key: 'DB_HOST', value: '' }],
          },
        },
        {
          type: EnvironmentVariableType.SECRET,
          values: {
            category: SecretCategory.GENERIC,
            data: [{ key: 'API_KEY', value: 'some-value' }],
          },
        },
      ];

      const conflicts = detectEnvVarConflicts(envVars, []);

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('isEnvVariableDataValid for EXISTING category', () => {
    it('should return true when existingName is set and data has entries', () => {
      const envVars: EnvVariable[] = [
        {
          type: EnvironmentVariableType.SECRET,
          existingName: 'my-secret',
          values: {
            category: SecretCategory.EXISTING,
            data: [{ key: 'KEY_1', value: '' }],
          },
        },
      ];

      expect(isEnvVariableDataValid(envVars)).toBe(true);
    });

    it('should return false when existingName is empty', () => {
      const envVars: EnvVariable[] = [
        {
          type: EnvironmentVariableType.SECRET,
          existingName: '',
          values: {
            category: SecretCategory.EXISTING,
            data: [{ key: 'KEY_1', value: '' }],
          },
        },
      ];

      expect(isEnvVariableDataValid(envVars)).toBe(false);
    });

    it('should return false when data array is empty', () => {
      const envVars: EnvVariable[] = [
        {
          type: EnvironmentVariableType.SECRET,
          existingName: 'my-secret',
          values: {
            category: SecretCategory.EXISTING,
            data: [],
          },
        },
      ];

      expect(isEnvVariableDataValid(envVars)).toBe(false);
    });

    it('should validate mixed existing and inline env vars', () => {
      const envVars: EnvVariable[] = [
        {
          type: EnvironmentVariableType.SECRET,
          existingName: 'my-secret',
          values: {
            category: SecretCategory.EXISTING,
            data: [{ key: 'SECRET_KEY', value: '' }],
          },
        },
        {
          type: EnvironmentVariableType.SECRET,
          values: {
            category: SecretCategory.GENERIC,
            data: [{ key: 'INLINE_KEY', value: 'val' }],
          },
        },
      ];

      expect(isEnvVariableDataValid(envVars)).toBe(true);
    });

    it('should return false when one existing var is invalid among valid ones', () => {
      const envVars: EnvVariable[] = [
        {
          type: EnvironmentVariableType.SECRET,
          existingName: 'valid-secret',
          values: {
            category: SecretCategory.EXISTING,
            data: [{ key: 'KEY_A', value: '' }],
          },
        },
        {
          type: EnvironmentVariableType.SECRET,
          existingName: '',
          values: {
            category: SecretCategory.EXISTING,
            data: [{ key: 'KEY_B', value: '' }],
          },
        },
      ];

      expect(isEnvVariableDataValid(envVars)).toBe(false);
    });
  });

  describe('end-to-end: create, validate, convert, check conflicts', () => {
    it('should handle a complete workflow with existing secrets', () => {
      // Step 1: Create existing secret env vars (simulates form creation)
      const envVars: EnvVariable[] = [
        {
          ...EMPTY_EXISTING_SECRET,
          existingName: 'prod-credentials',
          values: {
            category: SecretCategory.EXISTING,
            data: [
              { key: 'USERNAME', value: '' },
              { key: 'PASSWORD', value: '' },
            ],
          },
        },
        {
          type: EnvironmentVariableType.SECRET,
          values: {
            category: SecretCategory.GENERIC,
            data: [{ key: 'API_TOKEN', value: 'token-123' }],
          },
        },
      ];

      // Step 2: Validate the form data
      expect(isEnvVariableDataValid(envVars)).toBe(true);

      // Step 3: Convert to notebook CR env vars
      const secretEnvVars = getExistingSecretEnvVars(envVars);
      expect(secretEnvVars).toHaveLength(2);
      expect(secretEnvVars).toEqual([
        {
          name: 'USERNAME',
          valueFrom: { secretKeyRef: { name: 'prod-credentials', key: 'USERNAME' } },
        },
        {
          name: 'PASSWORD',
          valueFrom: { secretKeyRef: { name: 'prod-credentials', key: 'PASSWORD' } },
        },
      ]);

      // Step 4: Check for conflicts (none expected)
      const conflicts = detectEnvVarConflicts(envVars, []);
      expect(conflicts).toHaveLength(0);
    });

    it('should detect conflicts in a mixed environment setup', () => {
      const envVars: EnvVariable[] = [
        {
          type: EnvironmentVariableType.SECRET,
          existingName: 'aws-creds',
          values: {
            category: SecretCategory.EXISTING,
            data: [
              { key: 'AWS_ACCESS_KEY_ID', value: '' },
              { key: 'AWS_SECRET_ACCESS_KEY', value: '' },
            ],
          },
        },
        {
          type: EnvironmentVariableType.SECRET,
          existingName: 'backup-creds',
          values: {
            category: SecretCategory.EXISTING,
            data: [{ key: 'AWS_ACCESS_KEY_ID', value: '' }],
          },
        },
      ];

      // Validation should pass (both have names and keys)
      expect(isEnvVariableDataValid(envVars)).toBe(true);

      // But conflict detection catches the duplicate key
      const conflicts = detectEnvVarConflicts(envVars, []);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].key).toBe('AWS_ACCESS_KEY_ID');
    });
  });
});
