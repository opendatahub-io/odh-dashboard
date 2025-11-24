import * as React from 'react';
import { useRef, useEffect } from 'react';
import { Modal, ModalBody, ModalHeader, ModalFooter, Button } from '@patternfly/react-core';
import '#~/concepts/dashboard/ModalStyles.scss';

// todo: deal with the scss above; remove it?????
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

type FocusableDivProps = {
  children: React.ReactNode;
  onEnterPress: () => void;
};

const FocusableDiv: React.FC<FocusableDivProps> = ({ children, onEnterPress }) => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // As soon as this mounts, move focus here instead of the close button
    divRef.current?.focus();
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      onEnterPress();
    }
  };

  return (
    <div ref={divRef} onKeyDown={handleKeyDown} tabIndex={-1}>
      {children}
    </div>
  );
};

/**
 * Generic Modal component with a focusable div for autofocusing on the button when the enter key is pressed;
 * This is used to make the modal more accessible for users who use keyboard navigation.
 *
 * The buttons are defined via the buttonActions prop; only one button can have clickOnEnter set to true
 * (if more than one button has clickOnEnter set to true, only the first one will be autofocused on)
 *
 * for autofocusing on the button when the enter key is pressed;
 * disableFocusTrap needs to be false
 */
const MessageModal: React.FC<MessageModalProps> = ({
  onClose,
  contents,
  title,
  buttonActions,
  description,
  disableFocusTrap,
  dataTestId = 'pipeline-server-starting-modal',
}) => {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const clickOnEnterIndex = buttonActions?.findIndex((action) => action.clickOnEnter) ?? -1;
  const hasClickOnEnter = clickOnEnterIndex !== -1;

  const handleEnterPress = () => {
    const button = buttonRefs.current[clickOnEnterIndex];
    if (button) {
      // Focus the button to show visual feedback
      button.focus();

      // the timeout allows the user to see the button being pressed; else the modal just closes
      setTimeout(() => {
        buttonActions?.[clickOnEnterIndex]?.onClick();
      }, 200);
    }
  };

  const modalContents = hasClickOnEnter ? (
    <FocusableDiv onEnterPress={handleEnterPress}>{contents}</FocusableDiv>
  ) : (
    contents
  );

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
      <ModalBody className="odh-modal__content-height">{modalContents}</ModalBody>
      <ModalFooter>
        {buttonActions?.map((action, index) => (
          <Button
            key={`${action.label}-${index}`}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
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
