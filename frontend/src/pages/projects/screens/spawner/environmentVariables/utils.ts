import type { SecretKind } from '@odh-dashboard/k8s-core';
import { ConfigMapKind, NotebookKind } from '#~/k8sTypes';
import { Connection } from '#~/concepts/connectionTypes/types';
import { EnvVariable, SecretCategory } from '#~/pages/projects/types';

export const updateArrayValue = <T>(values: T[], index: number, partialValue: Partial<T>): T[] =>
  values.map((v, i) => (i === index ? { ...v, ...partialValue } : v));

export const removeArrayItem = <T>(values: T[], index: number): T[] =>
  values.filter((v, i) => i !== index);

export const isConfigMapKind = (object: unknown): object is ConfigMapKind =>
  typeof object === 'object' && object !== null && 'kind' in object && object.kind === 'ConfigMap';

export const isSecretKind = (object: unknown): object is SecretKind =>
  typeof object === 'object' && object !== null && 'kind' in object && object.kind === 'Secret';

export const isStringKeyValuePairObject = (object: unknown): object is Record<string, string> =>
  typeof object === 'object' &&
  object !== null &&
  Object.entries(object).every(
    ([key, value]) => typeof key === 'string' && typeof value === 'string',
  );

export const isExistingSecretCategory = (
  category: SecretCategory | null | undefined,
): category is SecretCategory.EXISTING => category === SecretCategory.EXISTING;

export const getDeletedConfigMapOrSecretVariables = (
  notebook: NotebookKind | undefined,
  envVariables: EnvVariable[],
  excludedResources: string[] = [],
): {
  deletedSecrets: string[];
  deletedConfigMaps: string[];
} => {
  const existingEnvVariables = new Set(envVariables.map((env) => env.existingName));
  const deletedConfigMaps: string[] = [];
  const deletedSecrets: string[] = [];

  (notebook?.spec.template.spec.containers[0].envFrom || []).forEach((env) => {
    if (
      env.configMapRef &&
      !existingEnvVariables.has(env.configMapRef.name) &&
      !excludedResources.includes(env.configMapRef.name)
    ) {
      deletedConfigMaps.push(env.configMapRef.name);
    }
    if (
      env.secretRef &&
      !existingEnvVariables.has(env.secretRef.name) &&
      !excludedResources.includes(env.secretRef.name)
    ) {
      deletedSecrets.push(env.secretRef.name);
    }
  });
  return { deletedSecrets, deletedConfigMaps };
};

export type EnvVarConflict = {
  source1: string;
  source2: string;
  keys: string[];
};

export const detectEnvVarConflicts = (
  envVariables: EnvVariable[],
  connections: Connection[],
): EnvVarConflict[] => {
  const conflicts: EnvVarConflict[] = [];

  type Source = {
    name: string;
    keys: string[];
  };

  const sources: Source[] = [];

  envVariables.forEach((envVar) => {
    if (!envVar.values?.data) {
      return;
    }

    const keys = envVar.values.data.map((entry) => entry.key);

    if (envVar.values.category === SecretCategory.EXISTING) {
      const sourceName = envVar.values.secretName || 'Existing secret';
      sources.push({ name: sourceName, keys });
    } else if (
      envVar.values.category === SecretCategory.GENERIC ||
      envVar.values.category === SecretCategory.UPLOAD
    ) {
      const existingInline = sources.find((s) => s.name === 'Inline secret');
      if (existingInline) {
        existingInline.keys.push(...keys);
      } else {
        sources.push({ name: 'Inline secret', keys });
      }
    }
  });

  connections.forEach((connection) => {
    if (!connection.data) {
      return;
    }

    const keys = Object.keys(connection.data);
    const displayName =
      connection.metadata.annotations['openshift.io/display-name'] || connection.metadata.name;
    sources.push({ name: displayName, keys });
  });

  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const first = sources[i];
      const second = sources[j];

      const duplicateKeys = first.keys.filter((key) => second.keys.includes(key));

      if (duplicateKeys.length > 0) {
        conflicts.push({
          source1: first.name,
          source2: second.name,
          keys: duplicateKeys,
        });
      }
    }
  }

  return conflicts;
};
