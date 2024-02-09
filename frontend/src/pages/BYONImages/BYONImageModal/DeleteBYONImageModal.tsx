import React from 'react';
import { deleteBYONImage } from '~/services/imagesService';
import { BYONImage } from '~/types';
import DeleteModal from '~/pages/projects/components/DeleteModal';

export type DeleteBYONImageModalProps = {
  image?: BYONImage;
  onClose: (deleted: boolean) => void;
};

const DeleteBYONImageModal: React.FC<DeleteBYONImageModalProps> = ({ image, onClose }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const deleteName = image?.display_name || 'this notebook image';

  return (
    <DeleteModal
      title="Delete notebook image?"
      isOpen={!!image}
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete notebook image"
      onDelete={() => {
        if (image) {
          setIsDeleting(true);
          deleteBYONImage(image)
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
      deleteName={deleteName}
    >
      This action cannot be undone.
    </DeleteModal>
  );
};

export default DeleteBYONImageModal;
