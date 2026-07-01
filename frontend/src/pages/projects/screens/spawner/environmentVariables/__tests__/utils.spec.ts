import { Connection } from '#~/concepts/connectionTypes/types';
import { EnvVariable, SecretCategory, EnvironmentVariableType } from '#~/pages/projects/types';
import { NotebookKind } from '#~/k8sTypes';
import {
  detectEnvVarConflicts,
  getDeletedConfigMapOrSecretVariables,
} from '#~/pages/projects/screens/spawner/environmentVariables/utils';

const createEnvVariable = (
  category: SecretCategory,
  keys: string[],
  secretName?: string,
): EnvVariable => ({
  type: null,
  values: {
    category,
    data: keys.map((key) => ({ key, value: 'test-value' })),
    secretName,
  },
});

const createConnection = (name: string, keys: string[]): Connection => ({
  apiVersion: 'v1',
  kind: 'Secret',
  type: 'Opaque',
  metadata: {
    name,
    namespace: 'test',
    labels: {
      'opendatahub.io/dashboard': 'true',
    },
    annotations: {
      'openshift.io/display-name': `${name} Display`,
    },
  },
  data: keys.reduce((acc, key) => ({ ...acc, [key]: 'dGVzdC12YWx1ZQ==' }), {}),
});

describe('detectEnvVarConflicts', () => {
  it('should return empty array when there are no conflicts', () => {
    const envVariables: EnvVariable[] = [
      createEnvVariable(SecretCategory.GENERIC, ['KEY1', 'KEY2']),
      createEnvVariable(SecretCategory.EXISTING, ['KEY3', 'KEY4'], 'secret1'),
    ];
    const connections: Connection[] = [createConnection('conn1', ['KEY5', 'KEY6'])];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toEqual([]);
  });

  it('should detect collision between inline secret and existing secret', () => {
    const envVariables: EnvVariable[] = [
      createEnvVariable(SecretCategory.GENERIC, ['KEY1', 'KEY2']),
      createEnvVariable(SecretCategory.EXISTING, ['KEY2', 'KEY3'], 'secret1'),
    ];
    const connections: Connection[] = [];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({
      source1: 'Inline secret',
      source2: 'secret1',
      keys: ['KEY2'],
    });
  });

  it('should detect collision between two existing secrets', () => {
    const envVariables: EnvVariable[] = [
      createEnvVariable(SecretCategory.EXISTING, ['KEY1', 'KEY2'], 'secret1'),
      createEnvVariable(SecretCategory.EXISTING, ['KEY2', 'KEY3'], 'secret2'),
    ];
    const connections: Connection[] = [];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({
      source1: 'secret1',
      source2: 'secret2',
      keys: ['KEY2'],
    });
  });

  it('should detect collision between existing secret and Connection', () => {
    const envVariables: EnvVariable[] = [
      createEnvVariable(SecretCategory.EXISTING, ['KEY1', 'KEY2'], 'secret1'),
    ];
    const connections: Connection[] = [createConnection('conn1', ['KEY2', 'KEY3'])];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({
      source1: 'secret1',
      source2: 'conn1 Display',
      keys: ['KEY2'],
    });
  });

  it('should detect collision between inline secret and Connection', () => {
    const envVariables: EnvVariable[] = [
      createEnvVariable(SecretCategory.UPLOAD, ['KEY1', 'KEY2']),
    ];
    const connections: Connection[] = [createConnection('conn1', ['KEY2', 'KEY3'])];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({
      source1: 'Inline secret',
      source2: 'conn1 Display',
      keys: ['KEY2'],
    });
  });

  it('should detect multiple conflicts', () => {
    const envVariables: EnvVariable[] = [
      createEnvVariable(SecretCategory.GENERIC, ['KEY1', 'KEY2']),
      createEnvVariable(SecretCategory.EXISTING, ['KEY2', 'KEY3'], 'secret1'),
      createEnvVariable(SecretCategory.EXISTING, ['KEY3', 'KEY4'], 'secret2'),
    ];
    const connections: Connection[] = [createConnection('conn1', ['KEY4', 'KEY5'])];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toHaveLength(3);
    expect(conflicts).toContainEqual({
      source1: 'Inline secret',
      source2: 'secret1',
      keys: ['KEY2'],
    });
    expect(conflicts).toContainEqual({
      source1: 'secret1',
      source2: 'secret2',
      keys: ['KEY3'],
    });
    expect(conflicts).toContainEqual({
      source1: 'secret2',
      source2: 'conn1 Display',
      keys: ['KEY4'],
    });
  });

  it('should detect multiple colliding keys in a single conflict', () => {
    const envVariables: EnvVariable[] = [
      createEnvVariable(SecretCategory.GENERIC, ['KEY1', 'KEY2', 'KEY3']),
      createEnvVariable(SecretCategory.EXISTING, ['KEY2', 'KEY3', 'KEY4'], 'secret1'),
    ];
    const connections: Connection[] = [];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({
      source1: 'Inline secret',
      source2: 'secret1',
      keys: ['KEY2', 'KEY3'],
    });
  });

  it('should handle empty env variables and connections', () => {
    const conflicts = detectEnvVarConflicts([], []);

    expect(conflicts).toEqual([]);
  });

  it('should handle env variables without values', () => {
    const envVariables: EnvVariable[] = [
      { type: null },
      createEnvVariable(SecretCategory.GENERIC, ['KEY1']),
    ];
    const connections: Connection[] = [];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toEqual([]);
  });

  it('should handle connections without data', () => {
    const envVariables: EnvVariable[] = [createEnvVariable(SecretCategory.GENERIC, ['KEY1'])];
    const connections: Connection[] = [
      {
        apiVersion: 'v1',
        kind: 'Secret',
        type: 'Opaque',
        metadata: {
          name: 'conn1',
          namespace: 'test',
          labels: { 'opendatahub.io/dashboard': 'true' },
          annotations: { 'openshift.io/display-name': 'conn1 Display' },
        },
      },
    ];

    const conflicts = detectEnvVarConflicts(envVariables, connections);

    expect(conflicts).toEqual([]);
  });
});

const createNotebookWithExistingSecretRefs = (
  secretRefs: Array<{ secretName: string; envName: string; key: string }>,
): NotebookKind =>
  ({
    apiVersion: 'kubeflow.org/v1',
    kind: 'Notebook',
    metadata: {
      name: 'test-notebook',
      namespace: 'test-ns',
    },
    spec: {
      template: {
        spec: {
          containers: [
            {
              name: 'notebook',
              env: secretRefs.map((ref) => ({
                name: ref.envName,
                valueFrom: {
                  secretKeyRef: {
                    name: ref.secretName,
                    key: ref.key,
                  },
                },
              })),
              envFrom: [],
            },
          ],
        },
      },
    },
  } as NotebookKind);

const createNotebookWithEnvFrom = (
  envFrom: Array<{ type: 'secret' | 'configMap'; name: string }>,
): NotebookKind =>
  ({
    apiVersion: 'kubeflow.org/v1',
    kind: 'Notebook',
    metadata: {
      name: 'test-notebook',
      namespace: 'test-ns',
    },
    spec: {
      template: {
        spec: {
          containers: [
            {
              name: 'notebook',
              env: [],
              envFrom: envFrom.map((item) =>
                item.type === 'secret'
                  ? { secretRef: { name: item.name } }
                  : { configMapRef: { name: item.name } },
              ),
            },
          ],
        },
      },
    },
  } as NotebookKind);

describe('getDeletedConfigMapOrSecretVariables', () => {
  it('should return empty arrays when notebook is undefined', () => {
    const result = getDeletedConfigMapOrSecretVariables(undefined, []);
    expect(result).toEqual({ deletedConfigMaps: [], deletedSecrets: [] });
  });

  it('should detect deleted envFrom secrets', () => {
    const notebook = createNotebookWithEnvFrom([
      { type: 'secret', name: 'secret1' },
      { type: 'secret', name: 'secret2' },
    ]);

    const currentEnvVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        existingName: 'secret1',
        values: {
          category: SecretCategory.GENERIC,
          data: [],
        },
      },
    ];

    const result = getDeletedConfigMapOrSecretVariables(notebook, currentEnvVars);

    expect(result.deletedSecrets).toEqual(['secret2']);
    expect(result.deletedConfigMaps).toEqual([]);
  });

  it('should detect deleted envFrom configMaps', () => {
    const notebook = createNotebookWithEnvFrom([
      { type: 'configMap', name: 'cm1' },
      { type: 'configMap', name: 'cm2' },
    ]);

    const currentEnvVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.CONFIG_MAP,
        existingName: 'cm1',
        values: {
          category: SecretCategory.GENERIC,
          data: [],
        },
      },
    ];

    const result = getDeletedConfigMapOrSecretVariables(notebook, currentEnvVars);

    expect(result.deletedConfigMaps).toEqual(['cm2']);
    expect(result.deletedSecrets).toEqual([]);
  });

  it('should detect deleted existing secret refs', () => {
    const notebook = createNotebookWithExistingSecretRefs([
      { secretName: 'secret1', envName: 'KEY1', key: 'key1' },
      { secretName: 'secret1', envName: 'KEY2', key: 'key2' },
      { secretName: 'secret2', envName: 'KEY3', key: 'key3' },
    ]);

    const currentEnvVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          secretName: 'secret1',
          data: [
            { key: 'key1', value: '' },
            { key: 'key2', value: '' },
          ],
        },
      },
    ];

    const result = getDeletedConfigMapOrSecretVariables(notebook, currentEnvVars);

    expect(result.deletedSecrets).toContain('secret2');
    expect(result.deletedConfigMaps).toEqual([]);
  });

  it('should detect both deleted envFrom and existing secret refs', () => {
    const notebook: NotebookKind = {
      apiVersion: 'kubeflow.org/v1',
      kind: 'Notebook',
      metadata: {
        name: 'test-notebook',
        namespace: 'test-ns',
      },
      spec: {
        template: {
          spec: {
            containers: [
              {
                name: 'notebook',
                env: [
                  {
                    name: 'KEY1',
                    valueFrom: {
                      secretKeyRef: {
                        name: 'existing-secret',
                        key: 'key1',
                      },
                    },
                  },
                ],
                envFrom: [{ secretRef: { name: 'envfrom-secret' } }],
              },
            ],
          },
        },
      },
    } as NotebookKind;

    const currentEnvVars: EnvVariable[] = [];

    const result = getDeletedConfigMapOrSecretVariables(notebook, currentEnvVars);

    expect(result.deletedSecrets).toContain('existing-secret');
    expect(result.deletedSecrets).toContain('envfrom-secret');
    expect(result.deletedConfigMaps).toEqual([]);
  });

  it('should exclude resources from excluded list', () => {
    const notebook = createNotebookWithExistingSecretRefs([
      { secretName: 'secret1', envName: 'KEY1', key: 'key1' },
      { secretName: 'secret2', envName: 'KEY2', key: 'key2' },
    ]);

    const currentEnvVars: EnvVariable[] = [];

    const result = getDeletedConfigMapOrSecretVariables(notebook, currentEnvVars, ['secret1']);

    expect(result.deletedSecrets).toEqual(['secret2']);
    expect(result.deletedConfigMaps).toEqual([]);
  });

  it('should not report as deleted when existing secret ref is still in current env vars', () => {
    const notebook = createNotebookWithExistingSecretRefs([
      { secretName: 'secret1', envName: 'KEY1', key: 'key1' },
    ]);

    const currentEnvVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.EXISTING,
          secretName: 'secret1',
          data: [{ key: 'key1', value: '' }],
        },
      },
    ];

    const result = getDeletedConfigMapOrSecretVariables(notebook, currentEnvVars);

    expect(result.deletedSecrets).toEqual([]);
    expect(result.deletedConfigMaps).toEqual([]);
  });
});
