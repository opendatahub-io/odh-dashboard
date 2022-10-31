import * as React from 'react';
import { DataConnection, DataConnectionType } from '../../../types';
import {
  deleteDataConnection,
  getDataConnectionDisplayName,
  getDataConnectionResourceName,
} from './utils';
import DeleteModal from '../../../components/DeleteModal';
import useRelatedNotebooks, {
  ConnectedNotebookContext,
} from '../../../notebook/useRelatedNotebooks';
import { removeNotebookSecret } from '../../../../../api';
import DeleteModalConnectedAlert from '../../../components/DeleteModalConnectedAlert';

type DeleteDataConnectionModalProps = {
  dataConnection?: DataConnection;
  onClose: (deleted: boolean) => void;
};

const DeleteDataConnectionModal: React.FC<DeleteDataConnectionModalProps> = ({
  dataConnection,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const resourceName = dataConnection ? getDataConnectionResourceName(dataConnection) : '';
  const {
    notebooks: connectedNotebooks,
    loaded: notebookLoaded,
    error: notebookError,
  } = useRelatedNotebooks(ConnectedNotebookContext.DATA_CONNECTION, resourceName);

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const displayName = dataConnection
    ? getDataConnectionDisplayName(dataConnection)
    : 'this data connection';

  return (
    <DeleteModal
      title="Delete data connection?"
      isOpen={!!dataConnection}
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete data connection"
      onDelete={() => {
        if (dataConnection) {
          setIsDeleting(true);
          Promise.all(
            connectedNotebooks.map((notebook) => {
              if (dataConnection.type === DataConnectionType.AWS) {
                removeNotebookSecret(
                  notebook.metadata.name,
                  notebook.metadata.namespace,
                  resourceName,
                );
              }
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
        }
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
