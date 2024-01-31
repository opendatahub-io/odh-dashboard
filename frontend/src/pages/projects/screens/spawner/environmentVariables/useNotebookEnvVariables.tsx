import * as React from 'react';
import { DATA_CONNECTION_PREFIX, getConfigMap, getSecret } from '~/api';
import { ConfigMapKind, NotebookKind, SecretKind } from '~/k8sTypes';
import { EnvVarResourceType } from '~/types';
import {
  ConfigMapCategory,
  EnvironmentVariableType,
  EnvVariable,
  SecretCategory,
} from '~/pages/projects/types';

export const fetchNotebookEnvVariables = (notebook: NotebookKind): Promise<EnvVariable[]> => {
  const envFromList = notebook.spec.template.spec.containers[0].envFrom || [];
  return Promise.all(
    envFromList
      .map((envFrom) => {
        if (envFrom.configMapRef) {
          return getConfigMap(notebook.metadata.namespace, envFrom.configMapRef.name);
        }
        if (envFrom.secretRef) {
          return getSecret(notebook.metadata.namespace, envFrom.secretRef.name);
        }
        return Promise.resolve(undefined);
      })
      .filter(
        (
          v: Promise<ConfigMapKind> | Promise<undefined> | undefined,
        ): v is Promise<SecretKind | ConfigMapKind> => !!v,
      ),
  ).then((results) =>
    results.reduce<EnvVariable[]>((acc, resource) => {
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
      } else if (
        resource.kind === EnvVarResourceType.Secret &&
        !resource.metadata.name.startsWith(DATA_CONNECTION_PREFIX)
      ) {
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
};

export const useNotebookEnvVariables = (
  notebook?: NotebookKind,
): [envVariables: EnvVariable[], setEnvVariables: (envVars: EnvVariable[]) => void] => {
  const [envVariables, setEnvVariables] = React.useState<EnvVariable[]>([]);

  React.useEffect(() => {
    if (notebook) {
      fetchNotebookEnvVariables(notebook)
        .then((envVars) => setEnvVariables(envVars))
        /* eslint-disable-next-line no-console */
        .catch((e) => console.error('Reading environment variables failed: ', e));
    }
  }, [notebook]);

  return [envVariables, setEnvVariables];
};
