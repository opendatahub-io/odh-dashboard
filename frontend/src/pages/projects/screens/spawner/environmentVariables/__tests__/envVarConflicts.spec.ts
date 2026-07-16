import { EnvironmentVariableType, EnvVariable, SecretCategory } from '#~/pages/projects/types';
import { Connection } from '#~/concepts/connectionTypes/types';
import { detectEnvVarConflicts } from '#~/pages/projects/screens/spawner/environmentVariables/envVarConflicts';

jest.mock('@odh-dashboard/k8s-core', () => ({
  getDisplayNameFromK8sResource: jest.fn(
    (resource: { metadata: { annotations: Record<string, string>; name: string } }) =>
      resource.metadata.annotations['openshift.io/display-name'] || resource.metadata.name || '',
  ),
}));

describe('detectEnvVarConflicts', () => {
  it('should return empty array when there are no conflicts', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'secret-a',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'KEY_A', value: '' }],
        },
      },
    ];

    expect(detectEnvVarConflicts(envVariables, [])).toEqual([]);
  });

  it('should detect conflict between existing secret and connection', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'my-secret',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'DB_HOST', value: '' }],
        },
      },
    ];

    const connections: Connection[] = [
      {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: 'my-connection',
          namespace: 'test-ns',
          annotations: {
            'openshift.io/display-name': 'My Connection',
            'opendatahub.io/connection-type': 'postgres',
          },
          labels: {},
        },
        data: { DB_HOST: 'dGVzdA==' },
      } as unknown as Connection,
    ];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].key).toBe('DB_HOST');
    expect(conflicts[0].sources).toHaveLength(2);
    expect(conflicts[0].sources).toEqual(
      expect.arrayContaining([
        { type: 'existing-secret', name: 'my-secret' },
        { type: 'connection', name: 'My Connection' },
      ]),
    );
  });

  it('should detect conflict between two existing secrets', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'secret-a',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'SHARED_KEY', value: '' }],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'secret-b',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'SHARED_KEY', value: '' }],
        },
      },
    ];

    const conflicts = detectEnvVarConflicts(envVariables, []);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].key).toBe('SHARED_KEY');
  });

  it('should not report connection-to-connection conflicts (handled elsewhere)', () => {
    const connections: Connection[] = [
      {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: 'conn-a',
          namespace: 'test-ns',
          annotations: { 'openshift.io/display-name': 'Conn A' },
          labels: {},
        },
        data: { SAME_KEY: 'dGVzdA==' },
      } as unknown as Connection,
      {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: 'conn-b',
          namespace: 'test-ns',
          annotations: { 'openshift.io/display-name': 'Conn B' },
          labels: {},
        },
        data: { SAME_KEY: 'dGVzdA==' },
      } as unknown as Connection,
    ];

    const conflicts = detectEnvVarConflicts([], connections);
    expect(conflicts).toEqual([]);
  });

  it('should detect conflict between existing secret and inline secret', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'ext-secret',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'API_KEY', value: '' }],
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

    const conflicts = detectEnvVarConflicts(envVariables, []);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].key).toBe('API_KEY');
  });
});
