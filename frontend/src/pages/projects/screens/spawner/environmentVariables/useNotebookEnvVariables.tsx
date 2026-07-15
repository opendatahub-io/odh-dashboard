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

const SYSTEM_ENV_NAMES = new Set(['NOTEBOOK_ARGS', 'JUPYTER_IMAGE']);

export const fetchNotebookEnvVariables = (notebook: NotebookKind): Promise<EnvVariable[]> => {
  const envFromList = notebook.spec.template.spec.containers[0].envFrom || [];

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

  // Parse env[].valueFrom.secretKeyRef entries
  // Defensive fallback: manually-crafted CRs may omit the env field entirely
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const envList = notebook.spec.template.spec.containers[0].env ?? [];

  // Group by secret name
  const secretKeyRefGroups = new Map<string, string[]>();
  for (const envEntry of envList) {
    if (SYSTEM_ENV_NAMES.has(envEntry.name) || !envEntry.valueFrom) {
      continue;
    }
    const { secretKeyRef } = envEntry.valueFrom;
    if (
      !secretKeyRef ||
      typeof secretKeyRef !== 'object' ||
      !('name' in secretKeyRef) ||
      !('key' in secretKeyRef)
    ) {
      continue;
    }
    const secretName = String(secretKeyRef.name);
    const keyName = String(secretKeyRef.key);
    const existing = secretKeyRefGroups.get(secretName) || [];
    existing.push(keyName);
    secretKeyRefGroups.set(secretName, existing);
  }

  // Convert to EnvVariable[]
  const existingSecretVars: EnvVariable[] = Array.from(secretKeyRefGroups.entries()).map(
    ([secretName, keys]) => ({
      type: EnvironmentVariableType.SECRET,
      existingName: secretName,
      values: {
        category: SecretCategory.EXISTING,
        data: keys.map((key) => ({ key, value: '' })),
      },
    }),
  );

  return envFromPromise.then((envFromVars) => [...envFromVars, ...existingSecretVars]);
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
