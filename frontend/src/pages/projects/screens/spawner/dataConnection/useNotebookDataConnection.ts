import * as React from 'react';
import { NotebookKind } from '~/k8sTypes';
import { DataConnection, DataConnectionData } from '~/pages/projects/types';

export const getNotebookDataConnection = (
  notebook?: NotebookKind,
  dataConnections?: DataConnection[],
) => {
  const envFromList = notebook?.spec.template.spec.containers[0].envFrom || [];
  const notebookSecrets = envFromList.filter((envFrom) => envFrom.secretRef);
  const notebookDataConnection = dataConnections?.find((connection) =>
    notebookSecrets.some((secret) => connection.data.metadata.name === secret.secretRef?.name),
  );
  return notebookDataConnection;
};

export const useNotebookDataConnection = (
  notebook?: NotebookKind,
  dataConnections: DataConnection[] = [],
): [
  dataConnection: DataConnectionData,
  setDataConnection: (connection: DataConnectionData) => void,
] => {
  const [dataConnection, setDataConnection] = React.useState<DataConnectionData>({
    type: 'creating',
    enabled: false,
  });

  React.useEffect(() => {
    if (notebook) {
      // find data connection from env list
      const notebookDataConnectionSecret = getNotebookDataConnection(notebook, dataConnections)
        ?.data.metadata.name;

      if (notebookDataConnectionSecret) {
        setDataConnection({
          type: 'existing',
          enabled: true,
          existing: {
            secretRef: {
              name: notebookDataConnectionSecret,
            },
          },
        });
      }
    }
  }, [notebook, dataConnections]);

  return [dataConnection, setDataConnection];
};
