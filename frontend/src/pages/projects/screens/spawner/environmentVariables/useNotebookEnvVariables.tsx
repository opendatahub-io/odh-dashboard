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
  ExistingSecretRef,
  SecretCategory,
} from '#~/pages/projects/types';
import { isConnection } from '#~/concepts/connectionTypes/utils';
import { getDeletedConfigMapOrSecretVariables, isSecretKind } from './utils';

/**
 * Parse secretKeyRef entries from the Notebook CR's env[] array.
 * Groups entries by secret name and returns them as ExistingSecretRef objects.
 */
export const parseSecretKeyRefEntries = (notebook: NotebookKind): ExistingSecretRef[] => {
  const container = notebook.spec.template.spec.containers[0];
  const envList: {
    name: string;
    value?: string;
    valueFrom?: { secretKeyRef?: { name: string; key: string; optional?: boolean } };
  }[] =
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/consistent-type-assertions
    (container.env as {
      name: string;
      value?: string;
      valueFrom?: { secretKeyRef?: { name: string; key: string; optional?: boolean } };
    }[]) ?? [];
  const secretKeyRefMap = new Map<string, string[]>();
  const keyEnvNames = new Map<string, Record<string, string>>();
  const keyOptionals = new Map<string, Record<string, boolean>>();

  envList.forEach((entry) => {
    const ref = entry.valueFrom?.secretKeyRef;
    if (ref) {
      const keys = secretKeyRefMap.get(ref.name) || [];
      keys.push(ref.key);
      secretKeyRefMap.set(ref.name, keys);

      if (entry.name !== ref.key) {
        const nameMap = keyEnvNames.get(ref.name) || {};
        nameMap[ref.key] = entry.name;
        keyEnvNames.set(ref.name, nameMap);
      }

      if (ref.optional) {
        const optMap = keyOptionals.get(ref.name) || {};
        optMap[ref.key] = true;
        keyOptionals.set(ref.name, optMap);
      }
    }
  });

  return Array.from(secretKeyRefMap.entries()).map(([secretName, selectedKeys]) => {
    const nameMap = keyEnvNames.get(secretName);
    const optMap = keyOptionals.get(secretName);
    return {
      secretName,
      selectedKeys,
      ...(nameMap && Object.keys(nameMap).length > 0 ? { keyEnvNameMap: nameMap } : {}),
      ...(optMap && Object.keys(optMap).length > 0 ? { keyOptionalMap: optMap } : {}),
    };
  });
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
    const envVars = results.reduce<EnvVariable[]>((acc, resource) => {
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

    // Parse secretKeyRef entries from env[] (existing secret references)
    const existingSecretRefs = parseSecretKeyRefEntries(notebook);
    if (existingSecretRefs.length > 0) {
      envVars.push({
        type: EnvironmentVariableType.SECRET,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecretRefs,
      });
    }

    return envVars;
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
