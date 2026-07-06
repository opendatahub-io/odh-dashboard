import React from 'react';
import { ConnectionTypeConfigMapObj } from '#~/concepts/connectionTypes/types';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import DeleteModal from '#~/pages/projects/components/DeleteModal';
import { deleteConnectionType } from '#~/services/connectionTypesService';

type DeleteConnectionTypeModalProps = {
  connectionType: ConnectionTypeConfigMapObj;
  onClose: (deleted: boolean) => void;
};

const DeleteConnectionTypeModal: React.FC<DeleteConnectionTypeModalProps> = ({
  connectionType,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const deleteName = getDisplayNameFromK8sResource(connectionType);

  return (
    <DeleteModal
      title="Delete connection type?"
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete"
      onDelete={() => {
        setIsDeleting(true);
        deleteConnectionType(connectionType.metadata.name).then(() => {
          onBeforeClose(true);
        });
      }}
      deleting={isDeleting}
      error={error}
      deleteName={deleteName}
    >
      The <b>{deleteName}</b> connection type will be deleted. Existing connections of this type
      will not be affected.
    </DeleteModal>
  );
};

export default DeleteConnectionTypeModal;
