import * as React from 'react';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import DeleteModal from '@odh-dashboard/internal/pages/projects/components/DeleteModal';
import {
  isModelServingDeleteModal,
  Deployment,
} from '@odh-dashboard/model-serving/extension-points';
import { useResolvedDeploymentExtension } from '../../concepts/extensionUtils';

type DeleteModelServingModalProps = {
  onClose: (deleted: boolean) => void;
  deployment: Deployment;
};

const DeleteModelServingModal: React.FC<DeleteModelServingModalProps> = ({
  onClose,
  deployment,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const [deleteModal, deleteModalLoaded] = useResolvedDeploymentExtension(
    isModelServingDeleteModal,
    deployment,
  );

  const onDelete = async () => {
    if (!getDisplayNameFromK8sResource(deployment.model)) {
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

  return !deleteModalLoaded || !deleteModal
    ? null
    : getDisplayNameFromK8sResource(deployment.model) && (
        <DeleteModal
          title={deleteModal.properties.title}
          onClose={() => onBeforeClose(false)}
          submitButtonLabel={deleteModal.properties.submitButtonLabel}
          onDelete={onDelete}
          deleting={isDeleting}
          error={error}
          deleteName={getDisplayNameFromK8sResource(deployment.model)}
        >
          This action cannot be undone.
        </DeleteModal>
      );
};
export default DeleteModelServingModal;
