import React from 'react';
import { Button, Modal, ModalVariant } from '@patternfly/react-core';
import { deleteBYONImage } from '../../services/imagesService';
import { BYONImage } from 'types';
export type ImportImageModalProps = {
  isOpen: boolean;
  image: BYONImage;
  onDeleteHandler: () => void;
  onCloseHandler: () => void;
};
export const DeleteImageModal: React.FC<ImportImageModalProps> = ({
  isOpen,
  image,
  onDeleteHandler,
  onCloseHandler,
}) => {
  return (
    <Modal
      variant={ModalVariant.medium}
      title="Delete notebook image"
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={onCloseHandler}
      actions={[
        <Button
          key="confirm"
          variant="danger"
          onClick={() => {
            if (image) {
              deleteBYONImage(image).then(() => {
                onDeleteHandler();
                onCloseHandler();
              });
            }
          }}
        >
          Delete
        </Button>,
        <Button key="cancel" variant="link" onClick={onCloseHandler}>
          Cancel
        </Button>,
      ]}
    >
      Do you wish to permanently delete <b>{image?.name}</b>?
    </Modal>
  );
};

export default DeleteImageModal;
