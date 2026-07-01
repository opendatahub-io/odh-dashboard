import * as React from 'react';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { getConfigMap, getSecret } from '#~/api';
import { ConfigMapKind, NotebookKind } from '#~/k8sTypes';
import { EnvVarResourceType } from '#~/types';
import {
  ConfigMapCategory,
  EnvironmentVariableType,
  EnvVariable,
  SecretCategory,
} from '#~/pages/projects/types';
import useFetchState, { NotReadyError } from '#~/utilities/useFetchState';
import { isConnection } from '#~/concepts/connectionTypes/utils';
import { getDeletedConfigMapOrSecretVariables, isSecretKind } from './utils';

export const fetchNotebookEnvVariables = (notebook: NotebookKind): Promise<EnvVariable[]> => {
  const container = notebook.spec.template.spec.containers[0];
  const envFromList = container.envFrom || [];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- env can be undefined in K8s API responses
  const envList = container.env || [];

  // Process envFrom entries (existing behavior)
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

  // Process env entries with valueFrom.secretKeyRef (new behavior)
  const secretKeyRefEntries = envList.filter(
    (envVar) => envVar.valueFrom && 'secretKeyRef' in envVar.valueFrom,
  );

  // Group by secret name
  const groupedBySecret = secretKeyRefEntries.reduce<
    Record<string, { name: string; key: string }[]>
  >((acc, envVar) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const secretRef = envVar.valueFrom.secretKeyRef as { name: string; key: string };
    const secretName = secretRef.name;
    const existing = acc[secretName] ?? [];
    return {
      ...acc,
      [secretName]: [...existing, { name: envVar.name, key: secretRef.key }],
    };
  }, {});

  const existingSecretEnvVars: EnvVariable[] = Object.entries(groupedBySecret).map(
    ([secretName, keys]) => ({
      type: EnvironmentVariableType.SECRET,
      existingName: undefined,
      values: {
        category: SecretCategory.EXISTING,
        secretName,
        data: keys.map(({ key }) => ({ key, value: '' })),
        allKeys: false,
      },
    }),
  );

  return envFromPromise.then((envFromVars) => [...envFromVars, ...existingSecretEnvVars]);
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
