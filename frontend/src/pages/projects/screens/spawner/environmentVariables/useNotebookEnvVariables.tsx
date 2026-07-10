import * as React from 'react';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import useFetchState, { NotReadyError } from '@odh-dashboard/ui-core/hooks/useFetchState';
import { getConfigMap, getSecret } from '#~/api';
import { ConfigMapKind, NotebookKind } from '#~/k8sTypes';
import { EnvVarResourceType } from '#~/types';
import {
  ConfigMapCategory,
  EnvironmentVariableType,
  EnvVariable,
  SecretCategory,
} from '#~/pages/projects/types';
import { isConnection } from '#~/concepts/connectionTypes/utils';
import { getDeletedConfigMapOrSecretVariables, isSecretKind } from './utils';

type SecretKeyRef = {
  name: string;
  key: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isSecretKeyRefShape = (value: unknown): value is SecretKeyRef =>
  isRecord(value) &&
  'name' in value &&
  typeof value.name === 'string' &&
  'key' in value &&
  typeof value.key === 'string';

const hasSecretKeyRef = (envEntry: {
  name: string;
  valueFrom?: Record<string, unknown>;
}): envEntry is { name: string; valueFrom: { secretKeyRef: SecretKeyRef } } =>
  envEntry.valueFrom !== undefined &&
  'secretKeyRef' in envEntry.valueFrom &&
  isSecretKeyRefShape(envEntry.valueFrom.secretKeyRef);

const getExistingSecretEnvVarsFromEnv = (notebook: NotebookKind): EnvVariable[] => {
  const envList = notebook.spec.template.spec.containers[0].env;

  // Group entries by secret name, preserving insertion order
  const secretKeyMap = new Map<string, string[]>();
  for (const entry of envList) {
    if (hasSecretKeyRef(entry)) {
      const secretName = entry.valueFrom.secretKeyRef.name;
      const keyName = entry.valueFrom.secretKeyRef.key;
      const existing = secretKeyMap.get(secretName);
      if (existing) {
        existing.push(keyName);
      } else {
        secretKeyMap.set(secretName, [keyName]);
      }
    }
  }

  const result: EnvVariable[] = [];
  for (const [secretName, keys] of secretKeyMap) {
    result.push({
      type: EnvironmentVariableType.SECRET,
      existingName: secretName,
      values: {
        category: SecretCategory.EXISTING,
        data: keys.map((key) => ({ key, value: '' })),
      },
    });
  }
  return result;
};

export const fetchNotebookEnvVariables = (notebook: NotebookKind): Promise<EnvVariable[]> => {
  const envFromList = notebook.spec.template.spec.containers[0].envFrom || [];
  return Promise.all(
    envFromList
      .map((envFrom) => {
        if (envFrom.configMapRef) {
          return getConfigMap(notebook.metadata.namespace, envFrom.configMapRef.name).catch((e) => {
            if (e.statusObject?.code === 404) {
              return null;
            }
            throw e;
          });
        }
        if (envFrom.secretRef) {
          return getSecret(notebook.metadata.namespace, envFrom.secretRef.name).catch((e) => {
            if (e.statusObject?.code === 404) {
              return null;
            }
            throw e;
          });
        }
        return Promise.resolve(undefined);
      })
      .filter(
        (
          v: Promise<ConfigMapKind | null> | Promise<undefined> | undefined,
        ): v is Promise<SecretKind | ConfigMapKind | null> => !!v,
      ),
  ).then((results) => {
    const envFromVars = results.reduce<EnvVariable[]>((acc, resource) => {
      if (!resource) {
        return acc;
      }
      const { data } = resource;
      let envVar: EnvVariable;
      if (resource.kind === EnvVarResourceType.ConfigMap) {
        envVar = {
          type: EnvironmentVariableType.CONFIG_MAP,
          existingName: resource.metadata.name,
          values: {
            category: ConfigMapCategory.GENERIC,
            data: data ? Object.keys(data).map((key) => ({ key, value: data[key] })) : [],
          },
        };
      } else if (isSecretKind(resource) && !isConnection(resource)) {
        envVar = {
          type: EnvironmentVariableType.SECRET,
          existingName: resource.metadata.name,
          values: {
            category: SecretCategory.GENERIC,
            data: data ? Object.keys(data).map((key) => ({ key, value: atob(data[key]) })) : [],
          },
        };
      } else {
        return acc;
      }
      return [...acc, envVar];
    }, []);

    // Also reconstruct existing secret references from env[].valueFrom.secretKeyRef
    const existingSecretVars = getExistingSecretEnvVarsFromEnv(notebook);

    return [...envFromVars, ...existingSecretVars];
  });
};

export const useNotebookEnvVariables = (
  notebook?: NotebookKind,
  excludedResources: string[] = [],
): [
  envVariables: EnvVariable[],
  setEnvVariables: (envVars: EnvVariable[]) => void,
  envVariablesLoaded: boolean,
  deletedConfigMaps: string[],
  deletedSecrets: string[],
] => {
  const [envVariables, setEnvVariables] = React.useState<EnvVariable[]>([]);
  const [envVariablesLoaded, setEnvVariablesLoaded] = React.useState<boolean>(false);
  const callback = React.useCallback(() => {
    if (!notebook) {
      return Promise.reject(new NotReadyError('No notebook'));
    }

    return fetchNotebookEnvVariables(notebook);
  }, [notebook]);

  const [existingEnvVariables, existingEnvVariablesLoaded] = useFetchState(callback, []);
  const { deletedConfigMaps, deletedSecrets } = getDeletedConfigMapOrSecretVariables(
    notebook,
    existingEnvVariables,
    excludedResources,
  );
  React.useEffect(() => {
    setEnvVariables(existingEnvVariables);
    setEnvVariablesLoaded(existingEnvVariablesLoaded);
  }, [existingEnvVariables, existingEnvVariablesLoaded]);

  return [envVariables, setEnvVariables, envVariablesLoaded, deletedConfigMaps, deletedSecrets];
};
