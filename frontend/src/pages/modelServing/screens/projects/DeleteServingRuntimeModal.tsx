import * as React from 'react';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import { K8sStatus, SecretKind, ServingRuntimeKind } from '~/k8sTypes';
import { deleteSecret, deleteServingRuntime } from '~/api';

type DeleteServingRuntimeModalProps = {
  servingRuntime?: ServingRuntimeKind;
  tokens: SecretKind[];
  onClose: (deleted: boolean) => void;
};

const DeleteServingRuntimeModal: React.FC<DeleteServingRuntimeModalProps> = ({
  servingRuntime,
  tokens,
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
          Promise.all<ServingRuntimeKind | K8sStatus>([
            deleteServingRuntime(servingRuntime.metadata.name, servingRuntime.metadata.namespace),
            ...tokens.map((token) => deleteSecret(token.metadata.namespace, token.metadata.name)),
          ])

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
