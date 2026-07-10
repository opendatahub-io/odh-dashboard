import type { EnvironmentVariable } from '@odh-dashboard/k8s-core';
import {
  EnvironmentVariableType,
  EnvVariable,
  SecretCategory,
  ConfigMapCategory,
} from '#~/pages/projects/types';
import { getExistingSecretEnvVars } from '#~/pages/projects/screens/spawner/service';

describe('getExistingSecretEnvVars', () => {
  it('should return empty array when no env variables are provided', () => {
    const result = getExistingSecretEnvVars([]);
    expect(result).toEqual([]);
  });

  it('should return empty array when no existing secret env variables are present', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'test-key', value: 'test-value' }],
        },
      },
      {
        type: EnvironmentVariableType.CONFIG_MAP,
        values: {
          category: ConfigMapCategory.GENERIC,
          data: [{ key: 'cm-key', value: 'cm-value' }],
        },
      },
    ];

    const result = getExistingSecretEnvVars(envVariables);
    expect(result).toEqual([]);
  });

  it('should convert existing secret entries to env vars with secretKeyRef', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'my-existing-secret',
        values: {
          category: SecretCategory.EXISTING,
          data: [
            { key: 'DB_HOST', value: '' },
            { key: 'DB_PORT', value: '' },
          ],
        },
      },
    ];

    const result = getExistingSecretEnvVars(envVariables);

    const expected: EnvironmentVariable[] = [
      {
        name: 'DB_HOST',
        valueFrom: { secretKeyRef: { name: 'my-existing-secret', key: 'DB_HOST' } },
      },
      {
        name: 'DB_PORT',
        valueFrom: { secretKeyRef: { name: 'my-existing-secret', key: 'DB_PORT' } },
      },
    ];

    expect(result).toEqual(expected);
  });

  it('should handle multiple existing secrets', () => {
    const envVariables: EnvVariable[] = [
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
          data: [
            { key: 'KEY_B1', value: '' },
            { key: 'KEY_B2', value: '' },
          ],
        },
      },
    ];

    const result = getExistingSecretEnvVars(envVariables);

    expect(result).toHaveLength(3);
    expect(result).toEqual([
      {
        name: 'KEY_A',
        valueFrom: { secretKeyRef: { name: 'secret-a', key: 'KEY_A' } },
      },
      {
        name: 'KEY_B1',
        valueFrom: { secretKeyRef: { name: 'secret-b', key: 'KEY_B1' } },
      },
      {
        name: 'KEY_B2',
        valueFrom: { secretKeyRef: { name: 'secret-b', key: 'KEY_B2' } },
      },
    ]);
  });

  it('should skip existing secret entries with no values', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'my-secret',
        values: undefined,
      },
    ];

    const result = getExistingSecretEnvVars(envVariables);
    expect(result).toEqual([]);
  });

  it('should skip existing secret entries with empty data', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'my-secret',
        values: {
          category: SecretCategory.EXISTING,
          data: [],
        },
      },
    ];

    const result = getExistingSecretEnvVars(envVariables);
    expect(result).toEqual([]);
  });

  it('should only process EXISTING secrets, ignoring GENERIC and AWS secrets', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'generic-key', value: 'generic-val' }],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.AWS,
          data: [{ key: 'aws-key', value: 'aws-val' }],
        },
      },
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'existing-secret',
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'EXISTING_KEY', value: '' }],
        },
      },
    ];

    const result = getExistingSecretEnvVars(envVariables);
    expect(result).toEqual([
      {
        name: 'EXISTING_KEY',
        valueFrom: { secretKeyRef: { name: 'existing-secret', key: 'EXISTING_KEY' } },
      },
    ]);
  });

  it('should skip existing secret entries without existingName', () => {
    const envVariables: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          data: [{ key: 'KEY', value: '' }],
        },
      },
    ];

    const result = getExistingSecretEnvVars(envVariables);
    expect(result).toEqual([]);
  });
});
