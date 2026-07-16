import * as React from 'react';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import useFetchState, { NotReadyError } from '@odh-dashboard/ui-core/hooks/useFetchState';
import { getConfigMap, getSecret, K8sStatusError } from '#~/api';
import { ConfigMapKind, NotebookKind } from '#~/k8sTypes';
import { EnvVarResourceType } from '#~/types';
import {
  ConfigMapCategory,
  EnvironmentVariableType,
  EnvVariable,
  SecretCategory,
} from '#~/pages/projects/types';
import type { ExistingSecretRef } from '#~/pages/projects/types';
import { isConnection } from '#~/concepts/connectionTypes/utils';
import { getDeletedConfigMapOrSecretVariables, isSecretKind } from './utils';

export const fetchNotebookEnvVariables = (notebook: NotebookKind): Promise<EnvVariable[]> => {
  const envFromList = notebook.spec.template.spec.containers[0].envFrom || [];

  // Process envFrom entries (existing behavior, unchanged)
  const envFromPromise = Promise.all(
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
  ).then((results) =>
    results.reduce<EnvVariable[]>((acc, resource) => {
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
    }, []),
  );

  // Process env[].valueFrom.secretKeyRef entries (NEW)
  const envList = notebook.spec.template.spec.containers[0].env;
  const SYSTEM_ENV_NAMES = ['NOTEBOOK_ARGS', 'JUPYTER_IMAGE'];

  const secretKeyRefEntries = envList.filter(
    (e): e is { name: string; valueFrom: { secretKeyRef: { name: string; key: string } } } =>
      !!e.name &&
      !SYSTEM_ENV_NAMES.includes(e.name) &&
      !!e.valueFrom &&
      typeof e.valueFrom === 'object' &&
      'secretKeyRef' in e.valueFrom &&
      !!e.valueFrom.secretKeyRef,
  );

  // Group by secret name
  const secretRefsByName = new Map<string, string[]>();
  for (const entry of secretKeyRefEntries) {
    const { name: secretName, key } = entry.valueFrom.secretKeyRef;
    const keys = secretRefsByName.get(secretName) ?? [];
    keys.push(key);
    secretRefsByName.set(secretName, keys);
  }

  const secretKeyRefPromise: Promise<EnvVariable[]> =
    secretRefsByName.size === 0
      ? Promise.resolve([])
      : Promise.all(
          Array.from(secretRefsByName.entries()).map(
            async ([secretName, selectedKeys]): Promise<ExistingSecretRef> => {
              try {
                const secret = await getSecret(notebook.metadata.namespace, secretName);
                const availableKeys = secret.data ? Object.keys(secret.data) : [];
                const missingKeys = selectedKeys.filter((k) => !availableKeys.includes(k));
                return {
                  secretName,
                  allKeys:
                    missingKeys.length === 0 &&
                    selectedKeys.length === availableKeys.length &&
                    selectedKeys.every((k) => availableKeys.includes(k)),
                  selectedKeys,
                  availableKeys,
                  ...(missingKeys.length > 0 ? { missingKeys } : {}),
                };
              } catch (e) {
                if (e instanceof K8sStatusError && e.statusObject.code === 404) {
                  return {
                    secretName,
                    allKeys: false,
                    selectedKeys,
                    availableKeys: [],
                    error: 'not-found',
                  };
                }
                throw e;
              }
            },
          ),
        ).then((refs): EnvVariable[] =>
          refs.length > 0
            ? [
                {
                  type: EnvironmentVariableType.SECRET,
                  values: { category: SecretCategory.EXISTING, data: [] },
                  existingSecretRefs: refs,
                },
              ]
            : [],
        );

  return Promise.all([envFromPromise, secretKeyRefPromise]).then(
    ([envFromVars, secretKeyRefVars]) => [...envFromVars, ...secretKeyRefVars],
  );
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
