import React from 'react';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { Connection } from '#~/concepts/connectionTypes/types';
import DeleteModal from '#~/pages/projects/components/DeleteModal';
import {
  useRelatedNotebooks,
  ConnectedNotebookContext,
} from '#~/pages/projects/notebook/useRelatedNotebooks';
import { useInferenceServicesForConnection } from '#~/pages/projects/useInferenceServicesForConnection';
import { deleteSecret, removeNotebookSecret } from '#~/api';
import ConnectedResourcesDeleteModal from '#~/pages/projects/components/ConnectedResourcesDeleteModal';

type Props = {
  namespace: string;
  deleteConnection: Connection;
  onClose: (deleted?: boolean) => void;
};

export const ConnectionsDeleteModal: React.FC<Props> = ({ deleteConnection, onClose }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const { notebooks: connectedNotebooks, loaded } = useRelatedNotebooks(
    ConnectedNotebookContext.EXISTING_DATA_CONNECTION,
    deleteConnection.metadata.name,
  );
  const connectedModels = useInferenceServicesForConnection(deleteConnection);

  return (
    <DeleteModal
      title="Delete connection?"
      onClose={onClose}
      submitButtonLabel="Delete"
      onDelete={() => {
        setIsDeleting(true);
        setError(undefined);
        Promise.all(
          connectedNotebooks.map((notebook) =>
            removeNotebookSecret(
              notebook.metadata.name,
              notebook.metadata.namespace,
              deleteConnection.metadata.name,
            ),
          ),
        )
          .then(() =>
            deleteSecret(deleteConnection.metadata.namespace, deleteConnection.metadata.name),
          )
          .then(() => {
            onClose(true);
          })
          .catch((e) => {
            setError(e);
            setIsDeleting(false);
          });
      }}
      deleting={isDeleting}
      error={error}
      deleteName={getDisplayNameFromK8sResource(deleteConnection)}
    >
      The <b>{getDisplayNameFromK8sResource(deleteConnection)}</b> connection will be deleted, and
      its dependent resources will stop working.
      <ConnectedResourcesDeleteModal
        connectedNotebooks={connectedNotebooks}
        connectedModels={connectedModels}
        loaded={loaded}
        namespace={deleteConnection.metadata.namespace}
      />
    </DeleteModal>
  );
};
