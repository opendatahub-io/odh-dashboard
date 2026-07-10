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

export const fetchNotebookEnvVariables = (notebook: NotebookKind): Promise<EnvVariable[]> => {
  const envFromList = notebook.spec.template.spec.containers[0].envFrom || [];

  // Process envFrom entries
  const envFromPromises = envFromList
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
    );

  return Promise.all(envFromPromises).then((envFromResults) => {
    // Process envFrom results
    const envFromVariables = envFromResults.reduce<EnvVariable[]>((acc, resource) => {
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

    // Process env entries with valueFrom.secretKeyRef
    const envList = notebook.spec.template.spec.containers[0].env;
    const secretEnvVars = envList.filter(
      (envVar) =>
        envVar.valueFrom?.secretKeyRef &&
        envVar.name !== 'NOTEBOOK_ARGS' &&
        envVar.name !== 'JUPYTER_IMAGE',
    );

    // Group secret env vars by secret name
    const secretGroups = secretEnvVars.reduce<Record<string, { name: string; key: string }[]>>(
      (acc, envVar) => {
        const secretKeyRef = envVar.valueFrom?.secretKeyRef;
        if (!secretKeyRef) {
          return acc;
        }
        const secretName = secretKeyRef.name;
        const secretKey = secretKeyRef.key;

        if (!(secretName in acc)) {
          acc[secretName] = [];
        }
        acc[secretName].push({ name: envVar.name, key: secretKey });

        return acc;
      },
      {},
    );

    // Create EnvVariable entries for each secret
    const secretEnvVariables = Object.entries(secretGroups).map(([secretName, entries]) => ({
      type: EnvironmentVariableType.SECRET,
      existingName: secretName,
      values: {
        category: SecretCategory.EXISTING,
        data: entries.map(({ name }) => ({ key: name, value: '' })),
      },
    }));

    return [...envFromVariables, ...secretEnvVariables];
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
