import {
  EnvironmentVariableType,
  EnvVariable,
  SecretCategory,
  ConfigMapCategory,
} from '#~/pages/projects/types';
import { isEnvVariableDataValid } from '#~/pages/projects/screens/spawner/spawnerUtils';

describe('isEnvVariableDataValid — EXISTING_SECRET', () => {
  it('should return true for empty env variables', () => {
    expect(isEnvVariableDataValid([])).toBe(true);
  });

  it('should return true for valid EXISTING_SECRET with selected keys', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRefs: [{ secretName: 'my-secret', selectedKeys: ['KEY1'], allKeys: false }],
      },
    ];
    expect(isEnvVariableDataValid(envVars)).toBe(true);
  });

  it('should return false for EXISTING_SECRET with empty refs array', () => {
    const envVars: EnvVariable[] = [
      { type: EnvironmentVariableType.EXISTING_SECRET, existingSecretRefs: [] },
    ];
    expect(isEnvVariableDataValid(envVars)).toBe(false);
  });

  it('should return false for EXISTING_SECRET with a ref missing secretName', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRefs: [{ secretName: '', selectedKeys: ['KEY1'], allKeys: false }],
      },
    ];
    expect(isEnvVariableDataValid(envVars)).toBe(false);
  });

  it('should return false for EXISTING_SECRET with a ref missing selected keys', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRefs: [{ secretName: 'my-secret', selectedKeys: [], allKeys: false }],
      },
    ];
    expect(isEnvVariableDataValid(envVars)).toBe(false);
  });

  it('should return false for EXISTING_SECRET with no existingSecretRefs', () => {
    const envVars: EnvVariable[] = [{ type: EnvironmentVariableType.EXISTING_SECRET }];
    expect(isEnvVariableDataValid(envVars)).toBe(false);
  });

  it('should return false if any ref in the array is invalid', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRefs: [
          { secretName: 'good', selectedKeys: ['A'], allKeys: false },
          { secretName: '', selectedKeys: ['B'], allKeys: false },
        ],
      },
    ];
    expect(isEnvVariableDataValid(envVars)).toBe(false);
  });

  it('should validate mixed types correctly', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.GENERIC, data: [{ key: 'k', value: 'v' }] },
      },
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRefs: [{ secretName: 'ext-secret', selectedKeys: ['A', 'B'], allKeys: true }],
      },
    ];
    expect(isEnvVariableDataValid(envVars)).toBe(true);
  });

  it('should return false when one entry in a mixed list is invalid', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.CONFIG_MAP,
        values: { category: ConfigMapCategory.GENERIC, data: [{ key: 'k', value: 'v' }] },
      },
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRefs: [],
      },
    ];
    expect(isEnvVariableDataValid(envVars)).toBe(false);
  });
});
