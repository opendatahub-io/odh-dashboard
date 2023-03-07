import * as React from 'react';
import { DATA_CONNECTION_PREFIX, getSecret } from '~/api';
import { NotebookKind, SecretKind } from '~/k8sTypes';
import { EnvVarResourceType } from '~/types';
import {
  DataConnectionData,
  EnvironmentVariableType,
  EnvVariable,
  SecretCategory,
} from '~/pages/projects/types';

export const fetchNotebookDataConnection = (
  notebook: NotebookKind,
): Promise<EnvVariable | undefined> => {
  const envFromList = notebook.spec.template.spec.containers[0].envFrom || [];
  return Promise.all(
    envFromList
      .map((envFrom) => {
        if (envFrom.secretRef) {
          return getSecret(notebook.metadata.namespace, envFrom.secretRef.name);
        }
        return Promise.resolve(undefined);
      })
      .filter((v): v is Promise<SecretKind> => !!v),
  ).then((results) => {
    const connection = results.find(
      (resource) =>
        resource &&
        resource.kind === EnvVarResourceType.Secret &&
        resource.metadata.name.startsWith(DATA_CONNECTION_PREFIX),
    );

    if (connection) {
      const data = connection.data || [];
      return {
        type: EnvironmentVariableType.SECRET,
        existingName: connection.metadata.name,
        values: {
          category: SecretCategory.AWS,
          data: Object.keys(data).map((key) => ({ key, value: atob(data[key]) })),
        },
      };
    }
    return undefined;
  });
};

export const useNotebookDataConnection = (
  notebook?: NotebookKind,
): [
  dataConnections: DataConnectionData,
  setDataConnections: (connections: DataConnectionData) => void,
] => {
  const [dataConnection, setDataConnection] = React.useState<DataConnectionData>({
    type: 'creating',
    enabled: false,
  });

  React.useEffect(() => {
    if (notebook) {
      fetchNotebookDataConnection(notebook)
        .then((connection) => {
          if (connection && connection.existingName) {
            setDataConnection({
              type: 'existing',
              enabled: true,
              existing: {
                secretRef: {
                  name: connection.existingName,
                },
              },
            });
          }
        })
        /* eslint-disable-next-line no-console */
        .catch((e) => console.error('Reading data connections failed: ', e));
    }
  }, [notebook]);

  return [dataConnection, setDataConnection];
};
