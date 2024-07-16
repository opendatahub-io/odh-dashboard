import * as React from 'react';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import { deleteInferenceService, deleteServingRuntime } from '~/api';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';

type DeleteInferenceServiceModalProps = {
  inferenceService?: InferenceServiceKind;
  servingRuntime?: ServingRuntimeKind;
  onClose: (deleted: boolean) => void;
  isOpen?: boolean;
};

const DeleteInferenceServiceModal: React.FC<DeleteInferenceServiceModalProps> = ({
  inferenceService,
  servingRuntime,
  onClose,
  isOpen = false,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const displayName = inferenceService
    ? getDisplayNameFromK8sResource(inferenceService)
    : 'this deployed model';

  return (
    <DeleteModal
      title="Delete deployed model?"
      isOpen={isOpen}
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete deployed model"
      onDelete={() => {
        if (inferenceService) {
          setIsDeleting(true);
          Promise.all([
            deleteInferenceService(
              inferenceService.metadata.name,
              inferenceService.metadata.namespace,
            ),
            ...(servingRuntime
              ? [
                  deleteServingRuntime(
                    servingRuntime.metadata.name,
                    servingRuntime.metadata.namespace,
                  ),
                ]
              : []),
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
      deleteName={displayName}
    >
      This action cannot be undone.
    </DeleteModal>
  );
};

export default DeleteInferenceServiceModal;
