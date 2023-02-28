import { ConfigMapKind } from '~/k8sTypes';

export const updateArrayValue = <T>(values: T[], index: number, partialValue: Partial<T>): T[] =>
  values.map((v, i) => (i === index ? { ...v, ...partialValue } : v));

export const removeArrayItem = <T>(values: T[], index: number): T[] =>
  values.filter((v, i) => i !== index);

export const isConfigMapKind = (object: unknown): object is ConfigMapKind =>
  (object as ConfigMapKind).kind === 'ConfigMap';

export const isStringKeyValuePairObject = (object: unknown): object is Record<string, string> =>
  Object.entries(object as Record<string, string>).every(
    ([key, value]) => typeof key === 'string' && typeof value === 'string',
  );
