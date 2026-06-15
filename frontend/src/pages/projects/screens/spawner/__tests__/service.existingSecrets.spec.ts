import { EnvironmentVariableType, EnvVariable } from '#~/pages/projects/types';
import { getExistingSecretKeyRefEnvVars } from '#~/pages/projects/screens/spawner/service';

describe('getExistingSecretKeyRefEnvVars', () => {
  it('should return empty array when no env variables', () => {
    expect(getExistingSecretKeyRefEnvVars([])).toEqual([]);
  });

  it('should skip non-EXISTING_SECRET types', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: null, data: [] },
      },
      {
        type: EnvironmentVariableType.CONFIG_MAP,
        values: { category: null, data: [] },
      },
    ];
    expect(getExistingSecretKeyRefEnvVars(envVars)).toEqual([]);
  });

  it('should skip EXISTING_SECRET with no secretName', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRef: { secretName: '', selectedKeys: ['k1'], allKeys: false },
      },
    ];
    expect(getExistingSecretKeyRefEnvVars(envVars)).toEqual([]);
  });

  it('should skip EXISTING_SECRET with no selected keys', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRef: { secretName: 'my-secret', selectedKeys: [], allKeys: false },
      },
    ];
    expect(getExistingSecretKeyRefEnvVars(envVars)).toEqual([]);
  });

  it('should generate secretKeyRef entries for selected keys', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRef: {
          secretName: 'my-secret',
          selectedKeys: ['DB_HOST', 'DB_PORT'],
          allKeys: false,
        },
      },
    ];
    expect(getExistingSecretKeyRefEnvVars(envVars)).toEqual([
      { name: 'DB_HOST', valueFrom: { secretKeyRef: { name: 'my-secret', key: 'DB_HOST' } } },
      { name: 'DB_PORT', valueFrom: { secretKeyRef: { name: 'my-secret', key: 'DB_PORT' } } },
    ]);
  });

  it('should generate entries for all keys when allKeys is true', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRef: {
          secretName: 'my-secret',
          selectedKeys: ['A', 'B', 'C'],
          allKeys: true,
        },
      },
    ];
    const result = getExistingSecretKeyRefEnvVars(envVars);
    expect(result).toHaveLength(3);
    expect(
      result.every(
        (e) =>
          (e.valueFrom as Record<string, Record<string, string>>).secretKeyRef.name === 'my-secret',
      ),
    ).toBe(true);
  });

  it('should handle multiple EXISTING_SECRET entries', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRef: {
          secretName: 'secret-a',
          selectedKeys: ['KEY1'],
          allKeys: false,
        },
      },
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRef: {
          secretName: 'secret-b',
          selectedKeys: ['KEY2', 'KEY3'],
          allKeys: true,
        },
      },
    ];
    const result = getExistingSecretKeyRefEnvVars(envVars);
    expect(result).toEqual([
      { name: 'KEY1', valueFrom: { secretKeyRef: { name: 'secret-a', key: 'KEY1' } } },
      { name: 'KEY2', valueFrom: { secretKeyRef: { name: 'secret-b', key: 'KEY2' } } },
      { name: 'KEY3', valueFrom: { secretKeyRef: { name: 'secret-b', key: 'KEY3' } } },
    ]);
  });

  it('should interleave with non-EXISTING_SECRET types correctly', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: null, data: [{ key: 'k', value: 'v' }] },
      },
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRef: {
          secretName: 'ext',
          selectedKeys: ['FOO'],
          allKeys: false,
        },
      },
    ];
    const result = getExistingSecretKeyRefEnvVars(envVars);
    expect(result).toEqual([
      { name: 'FOO', valueFrom: { secretKeyRef: { name: 'ext', key: 'FOO' } } },
    ]);
  });

  it('should skip EXISTING_SECRET with undefined existingSecretRef', () => {
    const envVars: EnvVariable[] = [{ type: EnvironmentVariableType.EXISTING_SECRET }];
    expect(getExistingSecretKeyRefEnvVars(envVars)).toEqual([]);
  });
});
