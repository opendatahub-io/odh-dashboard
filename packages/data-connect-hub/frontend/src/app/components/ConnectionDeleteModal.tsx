import React from 'react';
import { DeleteModal } from '@odh-dashboard/ui-core';
import { deleteConnection } from '~/app/api/dch';
import type { Connection } from '~/app/types';

type ConnectionDeleteModalProps = {
  connection: Connection;
  namespace: string;
  onClose: () => void;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

const ConnectionDeleteModal: React.FC<ConnectionDeleteModalProps> = ({
  connection,
  namespace,
  onClose,
  onSuccess,
  onError,
}) => {
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const operationRef = React.useRef(0);

  React.useEffect(
    () => () => {
      operationRef.current += 1;
    },
    [],
  );

  const handleClose = () => {
    operationRef.current += 1;
    setDeleting(false);
    setError(undefined);
    onClose();
  };

  const handleDelete = async () => {
    if (deleting) {
      return;
    }

    const operation = ++operationRef.current;
    setDeleting(true);
    setError(undefined);
    try {
      await deleteConnection('')({}, namespace, connection.metadata.id);
      if (operationRef.current !== operation) {
        return;
      }
      setDeleting(false);
      handleClose();
      onSuccess?.();
    } catch (failure) {
      if (operationRef.current !== operation) {
        return;
      }
      const deleteError =
        failure instanceof Error ? failure : new Error('Unable to delete connection');
      setDeleting(false);
      setError(deleteError);
      onError?.(deleteError);
    }
  };

  return (
    <DeleteModal
      title={`Permanently delete connection "${connection.resource.name}"?`}
      deleteName={connection.resource.name}
      deleting={deleting}
      error={error}
      onClose={handleClose}
      onDelete={() => void handleDelete()}
    >
      Deleting this connection will not delete the external data source, but any linked data assets
      will lose access. Additional active workloads or resources using this connection may also lose
      access.
    </DeleteModal>
  );
};

export default ConnectionDeleteModal;
