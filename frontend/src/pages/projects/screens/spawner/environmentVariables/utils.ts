import { ConfigMapKind, SecretKind } from '~/k8sTypes';

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
