import type { SecretKind } from '@odh-dashboard/k8s-core';
import { EnvironmentVariableType, SecretCategory, EnvVariable } from '#~/pages/projects/types';
import { buildExistingSecretEnvVars } from '#~/pages/projects/screens/spawner/environmentVariables/buildExistingSecretEnvVars';

const makeSecret = (name: string, keys: string[]): SecretKind => ({
  apiVersion: 'v1',
  kind: 'Secret',
  metadata: { name, namespace: 'test-ns', annotations: {}, labels: {} },
  data: keys.reduce<Record<string, string>>((acc, key) => {
    acc[key] = 'dmFsdWU=';
    return acc;
  }, {}),
});

describe('buildExistingSecretEnvVars', () => {
  it('should return empty array when no EXISTING category env vars', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'FOO', value: 'bar' }],
        },
      },
    ];
    expect(buildExistingSecretEnvVars(envVars, [])).toEqual([]);
  });

  it('should build env vars for allKeys', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          data: [],
          existingSecretRefs: [{ secretName: 'db-secret', allKeys: true, selectedKeys: [] }],
        },
      },
    ];
    const secrets = [makeSecret('db-secret', ['DB_HOST', 'DB_PORT'])];
    const result = buildExistingSecretEnvVars(envVars, secrets);
    expect(result).toEqual([
      {
        name: 'DB_HOST',
        valueFrom: { secretKeyRef: { name: 'db-secret', key: 'DB_HOST' } },
      },
      {
        name: 'DB_PORT',
        valueFrom: { secretKeyRef: { name: 'db-secret', key: 'DB_PORT' } },
      },
    ]);
  });

  it('should build env vars for selectedKeys only', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          data: [],
          existingSecretRefs: [
            { secretName: 'db-secret', allKeys: false, selectedKeys: ['DB_HOST'] },
          ],
        },
      },
    ];
    const secrets = [makeSecret('db-secret', ['DB_HOST', 'DB_PORT'])];
    const result = buildExistingSecretEnvVars(envVars, secrets);
    expect(result).toEqual([
      {
        name: 'DB_HOST',
        valueFrom: { secretKeyRef: { name: 'db-secret', key: 'DB_HOST' } },
      },
    ]);
  });

  it('should handle multiple secrets', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          data: [],
          existingSecretRefs: [
            { secretName: 'secret-a', allKeys: true, selectedKeys: [] },
            { secretName: 'secret-b', allKeys: false, selectedKeys: ['KEY_X'] },
          ],
        },
      },
    ];
    const secrets = [makeSecret('secret-a', ['KEY_1']), makeSecret('secret-b', ['KEY_X', 'KEY_Y'])];
    const result = buildExistingSecretEnvVars(envVars, secrets);
    expect(result).toHaveLength(2);
    expect(result[0].valueFrom.secretKeyRef.name).toBe('secret-a');
    expect(result[0].valueFrom.secretKeyRef.key).toBe('KEY_1');
    expect(result[1].valueFrom.secretKeyRef.name).toBe('secret-b');
    expect(result[1].valueFrom.secretKeyRef.key).toBe('KEY_X');
  });

  it('should return empty array when secret not found in availableSecrets for allKeys', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          data: [],
          existingSecretRefs: [{ secretName: 'missing-secret', allKeys: true, selectedKeys: [] }],
        },
      },
    ];
    const result = buildExistingSecretEnvVars(envVars, []);
    expect(result).toEqual([]);
  });
});
