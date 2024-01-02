import { NotebookKind } from '~/k8sTypes';
import {
  DataConnection,
  DataConnectionData,
  UpdateObjectAtPropAndValue,
} from '~/pages/projects/types';
import useGenericObjectState from '~/utilities/useGenericObjectState';

export const getNotebookDataConnection = (
  notebook?: NotebookKind,
  dataConnections?: DataConnection[],
): DataConnection | undefined => {
  const envFromList = notebook?.spec.template.spec.containers[0].envFrom || [];
  const notebookSecrets = envFromList.filter((envFrom) => envFrom.secretRef);
  const notebookDataConnection = dataConnections?.find((connection) =>
    notebookSecrets.some((secret) => connection.data.metadata.name === secret.secretRef?.name),
  );
  return notebookDataConnection;
};

export const useNotebookDataConnection = (
  dataConnections: DataConnection[],
  notebook?: NotebookKind,
): [
  dataConnection: DataConnectionData,
  setDataConnection: UpdateObjectAtPropAndValue<DataConnectionData>,
  resetDefaults: () => void,
] => {
  const notebookDataConnectionSecret = getNotebookDataConnection(notebook, dataConnections)?.data
    .metadata.name;
  const createDataState = useGenericObjectState<DataConnectionData>(
    notebookDataConnectionSecret
      ? {
          type: 'existing',
          enabled: true,
          existing: {
            secretRef: {
              name: notebookDataConnectionSecret,
            },
          },
        }
      : {
          type: 'creating',
          enabled: false,
        },
  );

  return createDataState;
};
