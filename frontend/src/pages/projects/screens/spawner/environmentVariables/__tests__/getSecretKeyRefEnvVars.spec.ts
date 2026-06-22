import { EnvVariable, EnvironmentVariableType, SecretCategory } from '#~/pages/projects/types';
import { getSecretKeyRefEnvVars } from '#~/src/pages/projects/screens/spawner/service';

describe('getSecretKeyRefEnvVars', () => {
  it('should return empty array for empty input', () => {
    expect(getSecretKeyRefEnvVars([])).toEqual([]);
  });

  it('should return empty array when no EXISTING category vars', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.GENERIC, data: [{ key: 'foo', value: 'bar' }] },
      },
    ];
    expect(getSecretKeyRefEnvVars(envVars)).toEqual([]);
  });

  it('should generate secretKeyRef entries from existing secret refs', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecretRefs: [{ secretName: 'my-secret', selectedKeys: ['username', 'password'] }],
      },
    ];

    const result = getSecretKeyRefEnvVars(envVars);

    expect(result).toEqual([
      {
        name: 'username',
        valueFrom: { secretKeyRef: { name: 'my-secret', key: 'username' } },
      },
      {
        name: 'password',
        valueFrom: { secretKeyRef: { name: 'my-secret', key: 'password' } },
      },
    ]);
  });

  it('should handle multiple secrets with multiple keys', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecretRefs: [
          { secretName: 'db-secret', selectedKeys: ['host', 'port'] },
          { secretName: 'api-secret', selectedKeys: ['api-key'] },
        ],
      },
    ];

    const result = getSecretKeyRefEnvVars(envVars);

    expect(result).toEqual([
      {
        name: 'host',
        valueFrom: { secretKeyRef: { name: 'db-secret', key: 'host' } },
      },
      {
        name: 'port',
        valueFrom: { secretKeyRef: { name: 'db-secret', key: 'port' } },
      },
      {
        name: 'api-key',
        valueFrom: { secretKeyRef: { name: 'api-secret', key: 'api-key' } },
      },
    ]);
  });

  it('should handle EXISTING category with no existingSecretRefs', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
      },
    ];

    expect(getSecretKeyRefEnvVars(envVars)).toEqual([]);
  });

  it('should handle EXISTING category with empty selectedKeys', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecretRefs: [{ secretName: 'my-secret', selectedKeys: [] }],
      },
    ];

    expect(getSecretKeyRefEnvVars(envVars)).toEqual([]);
  });

  it('should skip non-EXISTING category vars and include EXISTING ones', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.GENERIC, data: [{ key: 'foo', value: 'bar' }] },
      },
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecretRefs: [{ secretName: 'my-secret', selectedKeys: ['token'] }],
      },
    ];

    const result = getSecretKeyRefEnvVars(envVars);

    expect(result).toEqual([
      {
        name: 'token',
        valueFrom: { secretKeyRef: { name: 'my-secret', key: 'token' } },
      },
    ]);
  });
});
