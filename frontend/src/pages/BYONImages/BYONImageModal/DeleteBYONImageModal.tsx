import React from 'react';
import { BYONImage } from '#~/types';
import DeleteModal from '#~/pages/projects/components/DeleteModal';
import { useDashboardNamespace } from '#~/redux/selectors';
import { deleteImageStream } from '#~/api/k8s/imageStreams.ts';

export type DeleteBYONImageModalProps = {
  image: BYONImage;
  onClose: (deleted: boolean) => void;
};

const DeleteBYONImageModal: React.FC<DeleteBYONImageModalProps> = ({ image, onClose }) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const deleteName = image.display_name;

  return (
    <DeleteModal
      title="Delete notebook image?"
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete notebook image"
      onDelete={() => {
        setIsDeleting(true);
        deleteImageStream(image.name, dashboardNamespace)
          .then(() => {
            onBeforeClose(true);
          })
          .catch((e) => {
            setError(e);
            setIsDeleting(false);
          });
      }}
      deleting={isDeleting}
      error={error}
      deleteName={deleteName}
    >
      This action cannot be undone.
    </DeleteModal>
  );
};

export default DeleteBYONImageModal;
