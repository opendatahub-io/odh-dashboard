import { EnvironmentVariableType, EnvVariable } from '#~/pages/projects/types';
import { getExistingSecretKeyRefEnvVars } from '#~/pages/projects/screens/spawner/service';

describe('getExistingSecretKeyRefEnvVars', () => {
  it('should return empty array when no env variables', () => {
    expect(getExistingSecretKeyRefEnvVars([])).toEqual([]);
  });

  it('should skip non-EXISTING_SECRET types', () => {
    const envVars: EnvVariable[] = [
      { type: EnvironmentVariableType.SECRET, values: { category: null, data: [] } },
      { type: EnvironmentVariableType.CONFIG_MAP, values: { category: null, data: [] } },
    ];
    expect(getExistingSecretKeyRefEnvVars(envVars)).toEqual([]);
  });

  it('should skip refs with no secretName', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRefs: [{ secretName: '', selectedKeys: ['k1'], allKeys: false }],
      },
    ];
    expect(getExistingSecretKeyRefEnvVars(envVars)).toEqual([]);
  });

  it('should skip refs with no selected keys', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRefs: [{ secretName: 'my-secret', selectedKeys: [], allKeys: false }],
      },
    ];
    expect(getExistingSecretKeyRefEnvVars(envVars)).toEqual([]);
  });

  it('should generate secretKeyRef entries for selected keys', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRefs: [
          { secretName: 'my-secret', selectedKeys: ['DB_HOST', 'DB_PORT'], allKeys: false },
        ],
      },
    ];
    expect(getExistingSecretKeyRefEnvVars(envVars)).toEqual([
      { name: 'DB_HOST', valueFrom: { secretKeyRef: { name: 'my-secret', key: 'DB_HOST' } } },
      { name: 'DB_PORT', valueFrom: { secretKeyRef: { name: 'my-secret', key: 'DB_PORT' } } },
    ]);
  });

  it('should handle multiple refs in one EXISTING_SECRET entry', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRefs: [
          { secretName: 'secret-a', selectedKeys: ['KEY1'], allKeys: false },
          { secretName: 'secret-b', selectedKeys: ['KEY2', 'KEY3'], allKeys: true },
        ],
      },
    ];
    expect(getExistingSecretKeyRefEnvVars(envVars)).toEqual([
      { name: 'KEY1', valueFrom: { secretKeyRef: { name: 'secret-a', key: 'KEY1' } } },
      { name: 'KEY2', valueFrom: { secretKeyRef: { name: 'secret-b', key: 'KEY2' } } },
      { name: 'KEY3', valueFrom: { secretKeyRef: { name: 'secret-b', key: 'KEY3' } } },
    ]);
  });

  it('should interleave with non-EXISTING_SECRET types correctly', () => {
    const envVars: EnvVariable[] = [
      { type: EnvironmentVariableType.SECRET, values: { category: null, data: [] } },
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRefs: [{ secretName: 'ext', selectedKeys: ['FOO'], allKeys: false }],
      },
    ];
    expect(getExistingSecretKeyRefEnvVars(envVars)).toEqual([
      { name: 'FOO', valueFrom: { secretKeyRef: { name: 'ext', key: 'FOO' } } },
    ]);
  });

  it('should skip EXISTING_SECRET with undefined existingSecretRefs', () => {
    const envVars: EnvVariable[] = [{ type: EnvironmentVariableType.EXISTING_SECRET }];
    expect(getExistingSecretKeyRefEnvVars(envVars)).toEqual([]);
  });

  it('should skip valid and invalid refs within the same entry', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.EXISTING_SECRET,
        existingSecretRefs: [
          { secretName: 'good', selectedKeys: ['A'], allKeys: false },
          { secretName: '', selectedKeys: ['B'], allKeys: false },
          { secretName: 'also-good', selectedKeys: ['C'], allKeys: true },
        ],
      },
    ];
    expect(getExistingSecretKeyRefEnvVars(envVars)).toEqual([
      { name: 'A', valueFrom: { secretKeyRef: { name: 'good', key: 'A' } } },
      { name: 'C', valueFrom: { secretKeyRef: { name: 'also-good', key: 'C' } } },
    ]);
  });
});
