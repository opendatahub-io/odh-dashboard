import * as React from 'react';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { DeleteModal } from '@odh-dashboard/ui-core';
import {
  isModelServingDeleteModal,
  Deployment,
  type ModelServingDeleteModalComponentProps,
} from '@odh-dashboard/model-serving/extension-points';
import { useResolvedDeploymentExtension } from '../../concepts/extensionUtils';

type DeleteModelServingModalProps = {
  onClose: (deleted: boolean) => void;
  deployment: Deployment;
};

const isDeleteModalComponent = (
  value: unknown,
): value is React.ComponentType<ModelServingDeleteModalComponentProps> =>
  typeof value === 'function';

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

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const deletePrimaryResource = React.useCallback(async () => {
    if (!deleteModal) {
      throw new Error('The delete action is not available');
    }

    await deleteModal.properties.onDelete(deployment);
  }, [deleteModal, deployment]);

  const onDelete = async () => {
    if (!getDisplayNameFromK8sResource(deployment.model)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deletePrimaryResource();
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

  const DeleteModalComponent = deleteModal?.properties.DeleteModalComponent;
  const ResolvedDeleteModalComponent = isDeleteModalComponent(DeleteModalComponent)
    ? DeleteModalComponent
    : undefined;
  const deleteName = getDisplayNameFromK8sResource(deployment.model);

  if (!deleteModalLoaded || !deleteModal || !deleteName) {
    return null;
  }

  return ResolvedDeleteModalComponent ? (
    <ResolvedDeleteModalComponent
      key={`${deployment.model.metadata.namespace}/${deployment.model.metadata.name}`}
      deployment={deployment}
      onClose={onBeforeClose}
      onDelete={deletePrimaryResource}
      title={deleteModal.properties.title}
      submitButtonLabel={deleteModal.properties.submitButtonLabel}
    />
  ) : (
    <DeleteModal
      title={deleteModal.properties.title}
      onClose={() => onBeforeClose(false)}
      submitButtonLabel={deleteModal.properties.submitButtonLabel}
      onDelete={onDelete}
      deleting={isDeleting}
      error={error}
      deleteName={deleteName}
    >
      The <strong>{deleteName}</strong> model deployment and its API keys will be deleted, and its
      model endpoint will no longer be available as an AI asset or MaaS.
    </DeleteModal>
  );
};
export default DeleteModelServingModal;
