import { ConfigMapKind, NotebookKind, SecretKind } from '#~/k8sTypes';
import { EnvVariable } from '#~/pages/projects/types';

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
