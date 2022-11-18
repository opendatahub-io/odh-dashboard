import * as React from 'react';
import DeleteModal from '../../../projects/components/DeleteModal';
import { getInferenceServiceDisplayName } from './utils';
import { InferenceServiceKind } from '../../../../k8sTypes';
import { deleteInferenceService } from '../../../../api';

type DeleteInferenceServiceModalProps = {
  inferenceService?: InferenceServiceKind;
  onClose: (deleted: boolean) => void;
};

const DeleteInferenceServiceModal: React.FC<DeleteInferenceServiceModalProps> = ({
  inferenceService,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const displayName = inferenceService
    ? getInferenceServiceDisplayName(inferenceService)
    : 'this deployed model';

  return (
    <DeleteModal
      title="Delete deployed model?"
      isOpen={!!inferenceService}
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete deployed model"
      onDelete={() => {
        if (inferenceService) {
          setIsDeleting(true);
          deleteInferenceService(
            inferenceService.metadata.name,
            inferenceService.metadata.namespace,
          )
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
