import * as React from 'react';
import { Modal, ModalBody, ModalHeader, ModalFooter, Button } from '@patternfly/react-core';
import '#~/concepts/dashboard/ModalStyles.scss';

type ButtonAction = {
  label: string;
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'danger' | 'link';
  clickOnEnter?: boolean;
  dataTestId?: string;
};

type MessageModalProps = {
  onClose: () => void;
  contents: React.ReactNode;
  title: string;
  closeText?: string;
  buttonActions?: ButtonAction[];
  description?: React.ReactNode;
};

const MessageModal: React.FC<MessageModalProps> = ({
  onClose,
  contents,
  title,
  buttonActions,
  description,
}) => {
  return (
    <Modal
      data-testid="pipeline-server-starting-modal"
      isOpen
      variant="medium"
      onClose={onClose}
      title={title}
    >
      <ModalHeader title={title} description={description} />
      <ModalBody className="odh-modal__content-height">{contents}</ModalBody>
      <ModalFooter>
        {buttonActions?.map((action) => (
          <Button variant={action.variant} onClick={action.onClick} data-testid={action.dataTestId}>
            {action.label}
          </Button>
        ))}
      </ModalFooter>
    </Modal>
  );
};

export default MessageModal;
