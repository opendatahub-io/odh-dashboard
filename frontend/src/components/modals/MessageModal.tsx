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
  title: string | React.ReactNode;
  closeText?: string;
  buttonActions?: ButtonAction[];
  description?: React.ReactNode;
  disableFocusTrap?: boolean;
  dataTestId?: string;
};

const MessageModal: React.FC<MessageModalProps> = ({
  onClose,
  contents,
  title,
  buttonActions,
  description,
  disableFocusTrap,
  dataTestId = 'pipeline-server-starting-modal',
}) => {
  return (
    <Modal
      data-testid={dataTestId}
      isOpen
      variant="medium"
      onClose={onClose}
      title={typeof title === 'string' ? title : 'Modal'}
      disableFocusTrap={disableFocusTrap}
    >
      <ModalHeader title={typeof title === 'string' ? title : undefined} description={description}>
        {typeof title !== 'string' ? title : null}
      </ModalHeader>
      <ModalBody className="odh-modal__content-height">{contents}</ModalBody>
      <ModalFooter>
        {buttonActions?.map((action, index) => (
          <Button
            key={`${action.label}-${index}`}
            variant={action.variant}
            onClick={action.onClick}
            data-testid={action.dataTestId}
          >
            {action.label}
          </Button>
        ))}
      </ModalFooter>
    </Modal>
  );
};

export default MessageModal;
