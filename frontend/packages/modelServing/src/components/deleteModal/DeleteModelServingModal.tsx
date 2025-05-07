import * as React from 'react';
import DeleteModal from '@odh-dashboard/internal/pages/projects/components/DeleteModal';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { isModelServingDeleteModal, ModelServingDeleteModal, ModelServingDeployedModel } from '@odh-dashboard/model-serving/extension-points';

type DeleteModelServingModalProps = {
  onClose: (deleted: boolean) => void;
}

const DeleteModelServingModal: React.FC<DeleteModelServingModalProps> = ({onClose}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  // TODO: Remove hardcoded platform selection when implementing model mesh
  const selectedPlatform = 'kserve';

  // TODO: Remove when we can pass in the deployedModel from the row 
  const deployedModel: ModelServingDeployedModel = {
    type: 'model-serving.platform/deployed-model',
    properties: {
      platform: 'kserve',
      resourceName: 'test-model',
      displayName: 'Test Model',
      namespace: 'refactor-proj',
    },
  };

  const deleteModal= useExtensions<ModelServingDeleteModal>(
    isModelServingDeleteModal(selectedPlatform),
  );

  let onDelete = () => {};
  let title = '';
  let submitButtonLabel = '';

  if (deleteModal.length === 1) {
    title = deleteModal[0].properties.title;
    submitButtonLabel = deleteModal[0].properties.submitButtonLabel;
    onDelete = async () => {
      if (!deployedModel.properties.resourceName) {
        return;
      }
  
      setIsDeleting(true);
      try {
        await deleteModal[0].properties.onDelete(deployedModel);
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
  }

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  return (
    <DeleteModal
      title={title}
      onClose={() => onBeforeClose(false)}
      submitButtonLabel={submitButtonLabel}
      onDelete={onDelete}
      deleting={isDeleting}
      error={error}
      deleteName={deployedModel.properties.resourceName}
    >
      This action cannot be undone.
    </DeleteModal>
  );
};
export default DeleteModelServingModal;


