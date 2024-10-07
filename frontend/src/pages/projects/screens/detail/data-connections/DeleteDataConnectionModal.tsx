import * as React from 'react';
import { DataConnection, DataConnectionType } from '~/pages/projects/types';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import {
  useRelatedNotebooks,
  ConnectedNotebookContext,
} from '~/pages/projects/notebook/useRelatedNotebooks';
import { removeNotebookSecret } from '~/api';
import DeleteModalConnectedAlert from '~/pages/projects/components/DeleteModalConnectedAlert';
import {
  deleteDataConnection,
  getDataConnectionDisplayName,
  getDataConnectionResourceName,
} from './utils';

type DeleteDataConnectionModalProps = {
  dataConnection: DataConnection;
  onClose: (deleted: boolean) => void;
};

const DeleteDataConnectionModal: React.FC<DeleteDataConnectionModalProps> = ({
  dataConnection,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const resourceName = getDataConnectionResourceName(dataConnection);
  const {
    notebooks: connectedNotebooks,
    loaded: notebookLoaded,
    error: notebookError,
  } = useRelatedNotebooks(ConnectedNotebookContext.EXISTING_DATA_CONNECTION, resourceName);

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const displayName = getDataConnectionDisplayName(dataConnection);

  return (
    <DeleteModal
      title="Delete data connection?"
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete data connection"
      onDelete={() => {
        setIsDeleting(true);
        Promise.all(
          connectedNotebooks.map((notebook) => {
            if (dataConnection.type === DataConnectionType.AWS) {
              return removeNotebookSecret(
                notebook.metadata.name,
                notebook.metadata.namespace,
                resourceName,
              );
            }
            return null;
          }),
        )
          .then(() =>
            deleteDataConnection(dataConnection).then(() => {
              onBeforeClose(true);
            }),
          )
          .catch((e) => {
            setError(e);
            setIsDeleting(false);
          });
      }}
      deleting={isDeleting}
      error={error}
      deleteName={displayName}
    >
      <DeleteModalConnectedAlert
        connectedNotebooks={connectedNotebooks}
        error={notebookError}
        loaded={notebookLoaded}
      />
    </DeleteModal>
  );
};

export default DeleteDataConnectionModal;
