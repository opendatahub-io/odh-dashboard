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
import { ImageStreamKind, ImageStreamSpecTagType, NotebookKind } from '~/k8sTypes';
import { NotebookUpdateImageCard } from './NotebookUpdateImageCard';
import NotebookUpdateImageModalFooter from './NotebookUpdateImageModalFooter';

type NotebookUpdateImageModalProps = {
  notebook: NotebookKind;
  notebookImageVersionData: {
    currentImageVersion: ImageStreamSpecTagType;
    latestImageVersion: ImageStreamSpecTagType;
    imageStream: ImageStreamKind;
  };
  onModalClose: () => void;
};

const NotebookUpdateImageModal: React.FC<NotebookUpdateImageModalProps> = ({
  notebook,
  notebookImageVersionData,
  onModalClose,
}) => {
  const currentImageCard = 'current-image-card';
  const latestImageCard = 'latest-image-card';

  const [imageCard, setImageCard] = React.useState(currentImageCard);

  const onImageChange = (event: React.FormEvent<HTMLInputElement>) => {
    setImageCard(event.currentTarget.id);
  };

  const { currentImageVersion, latestImageVersion } = notebookImageVersionData;

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
                imageVersion={currentImageVersion}
                onImageChange={onImageChange}
                title="Current version"
              />
            </FlexItem>
            <FlexItem>
              <NotebookUpdateImageCard
                id="latest-image"
                cardSelectorLabel={latestImageCard}
                imageCard={imageCard}
                imageVersion={latestImageVersion}
                onImageChange={onImageChange}
                title="Latest version"
              />
            </FlexItem>
          </Flex>
        </Stack>
      </ModalBody>
      <NotebookUpdateImageModalFooter
        notebook={notebook}
        notebookImageVersionData={notebookImageVersionData}
        imageCard={imageCard}
        currentImageCard={currentImageCard}
        onModalClose={onModalClose}
      />
    </Modal>
  );
};

export default NotebookUpdateImageModal;
