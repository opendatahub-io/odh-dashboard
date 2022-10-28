import * as React from 'react';
import { DataConnection } from '../../../types';
import { deleteDataConnection, getDataConnectionDisplayName } from './utils';
import DeleteModal from '../../../components/DeleteModal';

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
      title="Delete Data Connection?"
      isOpen={!!dataConnection}
      onClose={() => onBeforeClose(false)}
      onDelete={() => {
        if (dataConnection) {
          setIsDeleting(true);
          deleteDataConnection(dataConnection)
            .then(() => {
              onBeforeClose(true);
            })
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
      This action cannot be undone.
    </DeleteModal>
  );
};

export default DeleteDataConnectionModal;
