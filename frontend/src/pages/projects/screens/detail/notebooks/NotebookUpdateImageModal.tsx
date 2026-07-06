import * as React from 'react';
import {
  Modal,
  ModalBody,
  ModalHeader,
  ModalVariant,
  StackItem,
  Stack,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { NotebookKind } from '#~/k8sTypes';
import { NotebookState } from '#~/pages/projects/notebook/types';
import { NotebookUpdateImageCard } from './NotebookUpdateImageCard';
import NotebookUpdateImageModalFooter from './NotebookUpdateImageModalFooter';
import { NotebookImage } from './types';
import { NotebookImageStatus } from './const';

type NotebookUpdateImageModalProps = {
  notebookState: NotebookState;
  notebook: NotebookKind;
  notebookImage: NotebookImage;
  onModalClose: () => void;
  setIsUpdating: React.Dispatch<React.SetStateAction<boolean>>;
};

const NotebookUpdateImageModal: React.FC<NotebookUpdateImageModalProps> = ({
  notebookState,
  notebook,
  notebookImage,
  onModalClose,
  setIsUpdating,
}) => {
  const currentImageCard = 'current-image-card';
  const latestImageCard = 'latest-image-card';

  const [imageCard, setImageCard] = React.useState(currentImageCard);

  const onImageChange = (event: React.FormEvent<HTMLInputElement>) => {
    setImageCard(event.currentTarget.id);
  };

  return (
    <Modal
      isOpen
      variant={ModalVariant.small}
      aria-labelledby="scrollable-modal-title"
      aria-describedby="modal-box-body-scrollable"
      onClose={onModalClose}
    >
      <ModalHeader title="Update to the latest version?" labelId="scrollable-modal-title" />
      <ModalBody tabIndex={0} id="modal-box-body-scrollable" aria-label="Scrollable modal content">
        <Stack hasGutter>
          <StackItem>
            <p>
              Updating to the latest image version will restart the{' '}
              <b>{notebook.metadata.annotations?.['openshift.io/display-name']}</b> workbench.
            </p>
          </StackItem>
          <Flex>
            <FlexItem>
              <NotebookUpdateImageCard
                id="current-outdated-image"
                cardSelectorLabel={currentImageCard}
                imageCard={imageCard}
                imageVersion={
                  notebookImage.imageStatus !== NotebookImageStatus.DELETED
                    ? notebookImage.imageVersion
                    : undefined
                }
                onImageChange={onImageChange}
                title="Current version"
              />
            </FlexItem>
            <FlexItem>
              <NotebookUpdateImageCard
                id="latest-image"
                cardSelectorLabel={latestImageCard}
                imageCard={imageCard}
                imageVersion={
                  notebookImage.imageStatus !== 'Deleted'
                    ? notebookImage.latestImageVersion
                    : undefined
                }
                onImageChange={onImageChange}
                title="Latest version"
              />
            </FlexItem>
          </Flex>
        </Stack>
      </ModalBody>
      <NotebookUpdateImageModalFooter
        notebookState={notebookState}
        notebook={notebook}
        notebookImage={notebookImage}
        imageCard={imageCard}
        currentImageCard={currentImageCard}
        onModalClose={onModalClose}
        setIsUpdating={setIsUpdating}
      />
    </Modal>
  );
};

export default NotebookUpdateImageModal;
