import * as React from 'react';
import DeleteModal from '@odh-dashboard/internal/pages/projects/components/DeleteModal';
import { Bullseye, Spinner } from '@patternfly/react-core';
import {
  isModelServingDeleteModal,
  Deployment,
} from '@odh-dashboard/model-serving/extension-points';
import { useResolvedPlatformExtension } from '../../concepts/extensionUtils';
import { ModelServingPlatform } from '../../concepts/useProjectServingPlatform';

type DeleteModelServingModalProps = {
  onClose: (deleted: boolean) => void;
  deployment: Deployment;
  servingPlatform: ModelServingPlatform;
};

const DeleteModelServingModal: React.FC<DeleteModelServingModalProps> = ({
  onClose,
  deployment,
  servingPlatform,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const [deleteModal, deleteModalLoaded] = useResolvedPlatformExtension(
    isModelServingDeleteModal,
    servingPlatform,
  );

  const onDelete = async () => {
    if (!deployment.model.metadata.name) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteModal?.properties.onDelete(deployment);
      onBeforeClose(true);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e);
      } else {
        setError(new Error('An unknown error occurred'));
      }
      setIsDeleting(false);
    }
  };

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  return !deleteModalLoaded || !deleteModal ? (
    <Bullseye>
      <Spinner />
    </Bullseye>
  ) : (
    deployment.model.metadata.name && (
      <DeleteModal
        title={deleteModal.properties.title}
        onClose={() => onBeforeClose(false)}
        submitButtonLabel={deleteModal.properties.submitButtonLabel}
        onDelete={onDelete}
        deleting={isDeleting}
        error={error}
        deleteName={deployment.model.metadata.name}
      >
        This action cannot be undone.
      </DeleteModal>
    )
  );
};
export default DeleteModelServingModal;
