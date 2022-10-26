import * as React from 'react';
import { Alert, Button, Modal, Stack, StackItem } from '@patternfly/react-core';
import { DataConnection } from '../../../types';
import { deleteDataConnection, getDataConnectionDisplayName } from './utils';

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

  return (
    <Modal
      title="Confirm data connection delete"
      variant="small"
      isOpen={!!dataConnection}
      onClose={() => onBeforeClose(false)}
      actions={[
        <Button
          key="delete-dc"
          variant="danger"
          isDisabled={isDeleting}
          onClick={() => {
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
        >
          Delete data connection
        </Button>,
        <Button key="cancel" variant="secondary" onClick={() => onBeforeClose(false)}>
          Cancel
        </Button>,
      ]}
    >
      <Stack hasGutter>
        <StackItem>
          Are you sure you want to delete{' '}
          {dataConnection ? (
            <strong>{getDataConnectionDisplayName(dataConnection)}</strong>
          ) : (
            'this data connection'
          )}
          ?
        </StackItem>
        {error && (
          <StackItem>
            <Alert title="Error deleting data connection" isInline variant="danger">
              {error.message}
            </Alert>
          </StackItem>
        )}
      </Stack>
    </Modal>
  );
};

export default DeleteDataConnectionModal;
