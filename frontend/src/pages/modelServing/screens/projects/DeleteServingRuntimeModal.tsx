import * as React from 'react';
import DeleteModal from '../../../projects/components/DeleteModal';
import { ServingRuntimeKind } from '../../../../k8sTypes';
import { deleteServingRuntime } from '../../../../api';

type DeleteServingRuntimeModalProps = {
  servingRuntime?: ServingRuntimeKind;
  onClose: (deleted: boolean) => void;
};

const DeleteServingRuntimeModal: React.FC<DeleteServingRuntimeModalProps> = ({
  servingRuntime,
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
    <DeleteModal
      title="Delete model server?"
      isOpen={!!servingRuntime}
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete model server"
      onDelete={() => {
        if (servingRuntime) {
          setIsDeleting(true);
          deleteServingRuntime(servingRuntime.metadata.name, servingRuntime.metadata.namespace)
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
      deleteName={servingRuntime?.metadata.name || 'this model server'}
    >
      This action cannot be undone.
    </DeleteModal>
  );
};

export default DeleteServingRuntimeModal;
