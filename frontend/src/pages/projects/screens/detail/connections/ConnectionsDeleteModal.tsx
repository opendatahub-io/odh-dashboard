import React from 'react';
import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { Connection } from '~/concepts/connectionTypes/types';
import DeleteModal from '~/pages/projects/components/DeleteModal';

type Props = {
  deleteConnection: Connection;
  onClose: (deleted?: boolean) => void;
  onDelete: () => Promise<K8sStatus>;
};

export const ConnectionsDeleteModal: React.FC<Props> = ({
  deleteConnection,
  onClose,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error>();

  return (
    <DeleteModal
      title="Delete connection?"
      isOpen
      onClose={onClose}
      submitButtonLabel="Delete"
      onDelete={() => {
        setIsDeleting(true);
        setError(undefined);

        onDelete()
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
    </DeleteModal>
  );
};
