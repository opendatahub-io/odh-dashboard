import { EnvVariable, EnvironmentVariableType, SecretCategory } from '#~/pages/projects/types';
import { getSecretKeyRefEnvVars } from '#~/pages/projects/screens/spawner/service';

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
          { secretName: 'api-secret', selectedKeys: ['API_KEY'] },
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
        name: 'API_KEY',
        valueFrom: { secretKeyRef: { name: 'api-secret', key: 'API_KEY' } },
      },
    ]);
  });

  it('should filter out keys with invalid env var names (hyphens, dots)', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecretRefs: [
          { secretName: 'cert-secret', selectedKeys: ['tls.crt', 'VALID_KEY', 'api-key'] },
        ],
      },
    ];

    const result = getSecretKeyRefEnvVars(envVars);

    expect(result).toEqual([
      {
        name: 'VALID_KEY',
        valueFrom: { secretKeyRef: { name: 'cert-secret', key: 'VALID_KEY' } },
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

  it('should use aliased env var name from keyEnvNameMap when available', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecretRefs: [
          {
            secretName: 'db-creds',
            selectedKeys: ['password', 'host'],
            keyEnvNameMap: { password: 'DATABASE_PASSWORD' },
          },
        ],
      },
    ];

    const result = getSecretKeyRefEnvVars(envVars);

    expect(result).toEqual([
      {
        name: 'DATABASE_PASSWORD',
        valueFrom: { secretKeyRef: { name: 'db-creds', key: 'password' } },
      },
      {
        name: 'host',
        valueFrom: { secretKeyRef: { name: 'db-creds', key: 'host' } },
      },
    ]);
  });

  it('should preserve optional flag from keyOptionalMap', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecretRefs: [
          {
            secretName: 'my-secret',
            selectedKeys: ['API_KEY', 'FALLBACK'],
            keyOptionalMap: { FALLBACK: true },
          },
        ],
      },
    ];

    const result = getSecretKeyRefEnvVars(envVars);

    expect(result).toEqual([
      {
        name: 'API_KEY',
        valueFrom: { secretKeyRef: { name: 'my-secret', key: 'API_KEY' } },
      },
      {
        name: 'FALLBACK',
        valueFrom: { secretKeyRef: { name: 'my-secret', key: 'FALLBACK', optional: true } },
      },
    ]);
  });

  it('should filter reserved names even when aliased via keyEnvNameMap', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecretRefs: [
          {
            secretName: 'my-secret',
            selectedKeys: ['args', 'VALID_KEY'],
            keyEnvNameMap: { args: 'NOTEBOOK_ARGS' },
          },
        ],
      },
    ];

    const result = getSecretKeyRefEnvVars(envVars);

    expect(result).toEqual([
      {
        name: 'VALID_KEY',
        valueFrom: { secretKeyRef: { name: 'my-secret', key: 'VALID_KEY' } },
      },
    ]);
  });
});
