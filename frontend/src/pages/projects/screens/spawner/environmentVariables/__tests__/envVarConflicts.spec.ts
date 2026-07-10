import {
  EnvVariable,
  EnvironmentVariableType,
  SecretCategory,
  ConfigMapCategory,
} from '#~/pages/projects/types';
import { Connection } from '#~/concepts/connectionTypes/types';
import { detectEnvVarConflicts } from '#~/pages/projects/screens/spawner/environmentVariables/envVarConflicts';

const makeExistingSecretEnvVar = (secretName: string, keys: string[]): EnvVariable => ({
  type: EnvironmentVariableType.SECRET,
  existingName: secretName,
  values: {
    category: SecretCategory.EXISTING,
    data: keys.map((key) => ({ key, value: '' })),
  },
});

const makeInlineSecretEnvVar = (keys: string[]): EnvVariable => ({
  type: EnvironmentVariableType.SECRET,
  values: {
    category: SecretCategory.GENERIC,
    data: keys.map((key) => ({ key, value: `value-${key}` })),
  },
});

const makeConfigMapEnvVar = (keys: string[]): EnvVariable => ({
  type: EnvironmentVariableType.CONFIG_MAP,
  values: {
    category: ConfigMapCategory.GENERIC,
    data: keys.map((key) => ({ key, value: `value-${key}` })),
  },
});

const makeConnection = (name: string, displayName: string, keys: string[]): Connection => {
  const data: Record<string, string> = {};
  keys.forEach((key) => {
    data[key] = btoa(`value-${key}`);
  });
  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name,
      namespace: 'test-ns',
      labels: {
        'opendatahub.io/dashboard': 'true',
        'opendatahub.io/managed': 'true',
      },
      annotations: {
        'openshift.io/display-name': displayName,
        'opendatahub.io/connection-type': 's3',
      },
    },
    data,
  } as unknown as Connection;
};

describe('detectEnvVarConflicts', () => {
  it('should return empty array when there are no env variables or connections', () => {
    const result = detectEnvVarConflicts([], []);
    expect(result).toEqual([]);
  });

  it('should return empty array when there are no duplicate keys', () => {
    const envVars: EnvVariable[] = [
      makeExistingSecretEnvVar('s3-creds', ['AWS_ACCESS_KEY_ID']),
      makeInlineSecretEnvVar(['MY_SECRET_KEY']),
    ];
    const result = detectEnvVarConflicts(envVars, []);
    expect(result).toEqual([]);
  });

  it('should detect conflict when same key appears across two existing secrets', () => {
    const envVars: EnvVariable[] = [
      makeExistingSecretEnvVar('s3-creds', ['AWS_ACCESS_KEY_ID']),
      makeExistingSecretEnvVar('backup-creds', ['AWS_ACCESS_KEY_ID']),
    ];
    const result = detectEnvVarConflicts(envVars, []);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('AWS_ACCESS_KEY_ID');
    expect(result[0].sources).toHaveLength(2);
    expect(result[0].sources).toContain("Secret 's3-creds'");
    expect(result[0].sources).toContain("Secret 'backup-creds'");
  });

  it('should detect conflict when same key appears in existing secret and inline secret', () => {
    const envVars: EnvVariable[] = [
      makeExistingSecretEnvVar('s3-creds', ['AWS_ACCESS_KEY_ID']),
      makeInlineSecretEnvVar(['AWS_ACCESS_KEY_ID']),
    ];
    const result = detectEnvVarConflicts(envVars, []);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('AWS_ACCESS_KEY_ID');
    expect(result[0].sources).toContain("Secret 's3-creds'");
    expect(result[0].sources.some((s) => s.includes('Secret'))).toBe(true);
  });

  it('should detect conflict when same key appears in existing secret and connection', () => {
    const envVars: EnvVariable[] = [makeExistingSecretEnvVar('s3-creds', ['AWS_ACCESS_KEY_ID'])];
    const connections: Connection[] = [
      makeConnection('my-conn', 'My Connection', ['AWS_ACCESS_KEY_ID']),
    ];
    const result = detectEnvVarConflicts(envVars, connections);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('AWS_ACCESS_KEY_ID');
    expect(result[0].sources).toContain("Secret 's3-creds'");
    expect(result[0].sources).toContain("Connection 'My Connection'");
  });

  it('should detect conflict when same key appears in inline secret and connection', () => {
    const envVars: EnvVariable[] = [makeInlineSecretEnvVar(['DB_PASSWORD'])];
    const connections: Connection[] = [makeConnection('db-conn', 'DB Connection', ['DB_PASSWORD'])];
    const result = detectEnvVarConflicts(envVars, connections);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('DB_PASSWORD');
    expect(result[0].sources).toContain("Connection 'DB Connection'");
  });

  it('should detect conflict when same key appears in configmap and connection', () => {
    const envVars: EnvVariable[] = [makeConfigMapEnvVar(['APP_CONFIG'])];
    const connections: Connection[] = [
      makeConnection('config-conn', 'Config Connection', ['APP_CONFIG']),
    ];
    const result = detectEnvVarConflicts(envVars, connections);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('APP_CONFIG');
  });

  it('should detect multiple conflicts across different keys', () => {
    const envVars: EnvVariable[] = [
      makeExistingSecretEnvVar('s3-creds', ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_KEY']),
      makeExistingSecretEnvVar('backup-creds', ['AWS_ACCESS_KEY_ID']),
    ];
    const connections: Connection[] = [
      makeConnection('my-conn', 'My Connection', ['AWS_SECRET_KEY', 'ENDPOINT']),
    ];
    const result = detectEnvVarConflicts(envVars, connections);
    expect(result).toHaveLength(2);

    const keyIds = result.map((c) => c.key).toSorted();
    expect(keyIds).toEqual(['AWS_ACCESS_KEY_ID', 'AWS_SECRET_KEY']);
  });

  it('should handle env variables with no values gracefully', () => {
    const envVars: EnvVariable[] = [{ type: null }, { type: EnvironmentVariableType.SECRET }];
    const result = detectEnvVarConflicts(envVars, []);
    expect(result).toEqual([]);
  });

  it('should handle connections with no data gracefully', () => {
    const connection = makeConnection('empty-conn', 'Empty', []);
    delete (connection as Record<string, unknown>).data;
    const result = detectEnvVarConflicts([], [connection]);
    expect(result).toEqual([]);
  });

  it('should detect three-way conflict across existing secret, inline secret, and connection', () => {
    const envVars: EnvVariable[] = [
      makeExistingSecretEnvVar('s3-creds', ['SHARED_KEY']),
      makeInlineSecretEnvVar(['SHARED_KEY']),
    ];
    const connections: Connection[] = [makeConnection('my-conn', 'My Connection', ['SHARED_KEY'])];
    const result = detectEnvVarConflicts(envVars, connections);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('SHARED_KEY');
    expect(result[0].sources).toHaveLength(3);
  });
});
