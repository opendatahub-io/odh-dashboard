import React from 'react';
import { Button, Modal, ModalVariant } from '@patternfly/react-core';
import { deleteNotebook } from '../../services/notebookImageService';
import { Notebook } from 'types';
export type ImportImageModalProps = {
  isOpen: boolean;
  notebook: Notebook;
  onDeleteHandler: () => void;
  onCloseHandler: () => void;
};
export const DeleteImageModal: React.FC<ImportImageModalProps> = ({
  isOpen,
  notebook,
  onDeleteHandler,
  onCloseHandler,
}) => {
  return (
    <Modal
      variant={ModalVariant.medium}
      title="Delete Notebook image"
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={onCloseHandler}
      actions={[
        <Button
          key="confirm"
          variant="danger"
          onClick={() => {
            if (notebook) {
              deleteNotebook(notebook).then(() => {
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
      Do you wish to permanently delete <b>{notebook?.name}</b>?
    </Modal>
  );
};

export default DeleteImageModal;
