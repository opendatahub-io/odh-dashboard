import * as React from 'react';
import { getConfigMap, getSecret } from '#~/api';
import { ConfigMapKind, NotebookKind, SecretKind } from '#~/k8sTypes';
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

const RESERVED_ENV_NAMES = new Set(['NOTEBOOK_ARGS', 'JUPYTER_IMAGE']);

const getSecretKeyRef = (
  valueFrom: Record<string, unknown> | undefined,
): { name: string; key: string } | undefined => {
  if (!valueFrom || typeof valueFrom !== 'object') {
    return undefined;
  }
  const skr = valueFrom.secretKeyRef;
  if (!skr || typeof skr !== 'object') {
    return undefined;
  }
  const record: Record<string, unknown> = Object.assign({}, skr);
  if (typeof record.name === 'string' && typeof record.key === 'string') {
    return { name: record.name, key: record.key };
  }
  return undefined;
};

const parseExistingSecretKeyRefs = (notebook: NotebookKind): EnvVariable[] => {
  const envList = notebook.spec.template.spec.containers[0].env;
  const grouped = new Map<string, string[]>();

  for (const entry of envList) {
    const ref = getSecretKeyRef(entry.valueFrom);
    if (ref && !RESERVED_ENV_NAMES.has(entry.name)) {
      const keys = grouped.get(ref.name) ?? [];
      keys.push(ref.key);
      grouped.set(ref.name, keys);
    }
  }

  return [...grouped.entries()].map(
    ([secretName, keys]): EnvVariable => ({
      type: EnvironmentVariableType.EXISTING_SECRET,
      existingSecretRef: {
        secretName,
        selectedKeys: keys,
        allKeys: true,
      },
    }),
  );
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

    const secretKeyRefVars = parseExistingSecretKeyRefs(notebook);
    return [...envFromVars, ...secretKeyRefVars];
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
