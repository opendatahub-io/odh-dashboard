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

  // Read env[].valueFrom.secretKeyRef entries
  const container = notebook.spec.template.spec.containers[0];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: container.env may be undefined at runtime
  const envList = container.env || [];

  // Group by secret name
  const secretRefMap = new Map<string, string[]>();
  for (const entry of envList) {
    if ('valueFrom' in entry && entry.valueFrom) {
      const vf = entry.valueFrom;
      if ('secretKeyRef' in vf && typeof vf.secretKeyRef === 'object' && vf.secretKeyRef !== null) {
        const skr = vf.secretKeyRef;
        if ('name' in skr && 'key' in skr) {
          const secretName = String(skr.name);
          const key = String(skr.key);
          if (!secretRefMap.has(secretName)) {
            secretRefMap.set(secretName, []);
          }
          const keys = secretRefMap.get(secretName);
          if (keys) {
            keys.push(key);
          }
        }
      }
    }
  }

  if (secretRefMap.size === 0) {
    return envFromPromise;
  }

  // Fetch each secret to get all available keys
  const existingSecretPromise = Promise.all(
    Array.from(secretRefMap.entries()).map(async ([secretName, selectedKeys]) => {
      try {
        const secret = await getSecret(notebook.metadata.namespace, secretName);
        const allKeys = secret.data ? Object.keys(secret.data) : [];
        return { secretName, selectedKeys, allKeys, status: 'loaded' as const };
      } catch (e: unknown) {
        if (
          typeof e === 'object' &&
          e !== null &&
          'statusObject' in e &&
          typeof e.statusObject === 'object' &&
          e.statusObject !== null &&
          'code' in e.statusObject &&
          e.statusObject.code === 404
        ) {
          return { secretName, selectedKeys, allKeys: [], status: 'not-found' as const };
        }
        return { secretName, selectedKeys, allKeys: [], status: 'error' as const };
      }
    }),
  ).then((results): EnvVariable | null => {
    if (results.length === 0) {
      return null;
    }
    const existingSecrets: ExistingSecretRef[] = results.map((r) => ({
      secretName: r.secretName,
      selectedKeys: r.selectedKeys,
      allKeys: r.allKeys.length > 0 ? r.allKeys : r.selectedKeys,
    }));
    return {
      type: EnvironmentVariableType.SECRET,
      values: { category: SecretCategory.EXISTING, data: [] },
      existingSecrets,
    };
  });

  return Promise.all([envFromPromise, existingSecretPromise]).then(
    ([envFromVars, existingSecretVar]) => {
      if (existingSecretVar) {
        return [...envFromVars, existingSecretVar];
      }
      return envFromVars;
    },
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
