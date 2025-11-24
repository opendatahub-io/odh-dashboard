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

type FocusableDivProps = {
  children: React.ReactNode;
  onEnterPress: () => void;
};

const FocusableDiv: React.FC<FocusableDivProps> = ({ children, onEnterPress }) => {
  const divRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
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
 * for autofocusing on the button when the enter key is pressed;
 * disableFocusTrap needs to be false
 * @param param0 for
 * @returns
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
  const buttonRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const clickOnEnterIndex = buttonActions?.findIndex((action) => action.clickOnEnter) ?? -1;
  const hasClickOnEnter = clickOnEnterIndex !== -1;

  const handleEnterPress = () => {
    console.log('handleEnterPress (clicked here avo44a)', clickOnEnterIndex);
    const button = buttonRefs.current[clickOnEnterIndex];
    if (button) {
      // Focus the button to show visual feedback
      button.focus();

      // Store original styles
      const originalTransform = button.style.transform;
      const originalTransition = button.style.transition;

      // Add press effect
      button.style.transition = 'transform 0.1s ease';
      button.style.transform = 'scale(0.95)';

      // Wait for animation to be visible before executing action
      setTimeout(() => {
        button.style.transform = originalTransform;
        setTimeout(() => {
          button.style.transition = originalTransition;
          buttonActions?.[clickOnEnterIndex]?.onClick();
        }, 100);
      }, 100);
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
export { FocusableDiv };
