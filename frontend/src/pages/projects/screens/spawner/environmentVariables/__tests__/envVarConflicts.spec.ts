import {
  EnvVariable,
  EnvironmentVariableType,
  SecretCategory,
  ConfigMapCategory,
} from '#~/pages/projects/types';
import { Connection } from '#~/concepts/connectionTypes/types';
import { detectEnvVarConflicts } from '#~/pages/projects/screens/spawner/environmentVariables/envVarConflicts';

describe('detectEnvVarConflicts', () => {
  const createConnection = (
    name: string,
    displayName: string,
    data: Record<string, string>,
  ): Connection =>
    ({
      metadata: {
        name,
        annotations: {
          'openshift.io/display-name': displayName,
        },
        labels: {
          'opendatahub.io/managed': 'true',
        },
      },
      data,
    } as Connection);

  const createEnvVar = (
    type: EnvironmentVariableType,
    category: SecretCategory | ConfigMapCategory | null,
    data: Array<{ key: string; value: string }>,
    existingName?: string,
  ): EnvVariable => ({
    type,
    existingName,
    values: {
      category,
      data,
    },
  });

  it('should return empty array when no conflicts exist', () => {
    const envVariables: EnvVariable[] = [
      createEnvVar(EnvironmentVariableType.SECRET, SecretCategory.GENERIC, [
        { key: 'API_KEY', value: 'secret1' },
      ]),
    ];
    const connections: Connection[] = [
      createConnection('conn1', 'My Connection', { DATABASE_URL: 'postgres://...' }),
    ];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toEqual([]);
  });

  it('should detect conflicts between existing secret keys', () => {
    const envVariables: EnvVariable[] = [
      createEnvVar(
        EnvironmentVariableType.SECRET,
        SecretCategory.EXISTING,
        [{ key: 'API_KEY', value: '' }],
        'secret1',
      ),
      createEnvVar(
        EnvironmentVariableType.SECRET,
        SecretCategory.EXISTING,
        [{ key: 'API_KEY', value: '' }],
        'secret2',
      ),
    ];
    const connections: Connection[] = [];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toEqual([
      {
        key: 'API_KEY',
        sources: ["Secret 'secret1'", "Secret 'secret2'"],
      },
    ]);
  });

  it('should detect conflicts between existing secret keys and inline secret keys', () => {
    const envVariables: EnvVariable[] = [
      createEnvVar(
        EnvironmentVariableType.SECRET,
        SecretCategory.EXISTING,
        [{ key: 'API_KEY', value: '' }],
        'my-secret',
      ),
      createEnvVar(EnvironmentVariableType.SECRET, SecretCategory.GENERIC, [
        { key: 'API_KEY', value: 'inline-value' },
      ]),
    ];
    const connections: Connection[] = [];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toEqual([
      {
        key: 'API_KEY',
        sources: ["Secret 'my-secret'", 'Environment variable'],
      },
    ]);
  });

  it('should detect conflicts between existing secret keys and Connection keys', () => {
    const envVariables: EnvVariable[] = [
      createEnvVar(
        EnvironmentVariableType.SECRET,
        SecretCategory.EXISTING,
        [{ key: 'DATABASE_URL', value: '' }],
        'db-secret',
      ),
    ];
    const connections: Connection[] = [
      createConnection('conn1', 'Database Connection', { DATABASE_URL: 'postgres://...' }),
    ];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toEqual([
      {
        key: 'DATABASE_URL',
        sources: ["Secret 'db-secret'", "Connection 'Database Connection'"],
      },
    ]);
  });

  it('should detect conflicts across inline secrets, configmaps, and connections', () => {
    const envVariables: EnvVariable[] = [
      createEnvVar(EnvironmentVariableType.SECRET, SecretCategory.GENERIC, [
        { key: 'API_KEY', value: 'secret-value' },
      ]),
      createEnvVar(EnvironmentVariableType.CONFIG_MAP, ConfigMapCategory.GENERIC, [
        { key: 'API_KEY', value: 'config-value' },
      ]),
    ];
    const connections: Connection[] = [
      createConnection('api-conn', 'API Connection', { API_KEY: 'connection-value' }),
    ];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toEqual([
      {
        key: 'API_KEY',
        sources: ['Environment variable', 'Environment variable', "Connection 'API Connection'"],
      },
    ]);
  });

  it('should handle multiple conflicts at once', () => {
    const envVariables: EnvVariable[] = [
      createEnvVar(
        EnvironmentVariableType.SECRET,
        SecretCategory.EXISTING,
        [
          { key: 'KEY1', value: '' },
          { key: 'KEY2', value: '' },
        ],
        'secret1',
      ),
      createEnvVar(EnvironmentVariableType.SECRET, SecretCategory.GENERIC, [
        { key: 'KEY1', value: 'inline1' },
      ]),
    ];
    const connections: Connection[] = [
      createConnection('conn1', 'Connection 1', { KEY2: 'conn-value' }),
    ];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toEqual([
      {
        key: 'KEY1',
        sources: ["Secret 'secret1'", 'Environment variable'],
      },
      {
        key: 'KEY2',
        sources: ["Secret 'secret1'", "Connection 'Connection 1'"],
      },
    ]);
  });

  it('should use fallback names when display names are missing', () => {
    const envVariables: EnvVariable[] = [
      createEnvVar(EnvironmentVariableType.SECRET, SecretCategory.EXISTING, [
        { key: 'API_KEY', value: '' },
      ]),
    ];
    const connections: Connection[] = [
      createConnection('conn1', '', { API_KEY: 'connection-value' }),
    ];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toEqual([
      {
        key: 'API_KEY',
        sources: ['Existing secret', "Connection 'conn1'"],
      },
    ]);
  });
});
