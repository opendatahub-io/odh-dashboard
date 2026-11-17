import React from 'react';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { deleteSecret } from '@odh-dashboard/k8s-core/api/secrets';
import type { ConnectedResourceLabel } from '@odh-dashboard/plugin-core/extension-points';
import { Connection } from '#~/concepts/connectionTypes/types';
import DeleteModal from '#~/pages/projects/components/DeleteModal';
import {
  useRelatedNotebooks,
  ConnectedNotebookContext,
} from '#~/pages/projects/notebook/useRelatedNotebooks';
import { removeNotebookSecret } from '#~/api';
import ConnectedResourcesDeleteModal from '#~/pages/projects/components/ConnectedResourcesDeleteModal';

type Props = {
  namespace: string;
  deleteConnection: Connection;
  connectedResources: ConnectedResourceLabel[];
  onClose: (deleted?: boolean) => void;
};

export const ConnectionsDeleteModal: React.FC<Props> = ({
  deleteConnection,
  connectedResources,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const { notebooks: connectedNotebooks, loaded } = useRelatedNotebooks(
    ConnectedNotebookContext.EXISTING_DATA_CONNECTION,
    deleteConnection.metadata.name,
  );

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
        connectedResources={connectedResources}
        loaded={loaded}
        namespace={deleteConnection.metadata.namespace}
      />
    </DeleteModal>
  );
};
