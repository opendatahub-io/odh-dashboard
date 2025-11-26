import * as React from 'react';
import { useRef, useEffect, useId } from 'react';
import { Modal, ModalBody, ModalHeader, ModalFooter, ModalProps } from '@patternfly/react-core';
import GenericModalFooter, { ButtonAction } from './GenericModalFooter';
import '#~/concepts/dashboard/ModalStyles.scss';

type GenericModalProps = {
  onClose: () => void;
  contents: React.ReactNode;
  title: string | React.ReactNode;
  closeText?: string;
  buttonActions?: ButtonAction[];
  description?: React.ReactNode;
  disableFocusTrap?: boolean;
  dataTestId?: string;
  error?: Error | React.ReactNode;
  alertTitle?: string;
  alertLinks?: React.ReactNode;
  bodyClassName?: string;
  variant?: ModalProps['variant'];
  appendTo?: HTMLElement | (() => HTMLElement);
};

type FocusableDivProps = {
  children: React.ReactNode;
  onEnterPress: () => void;
  clickEnterButtonLabel?: string;
};

const FocusableDiv: React.FC<FocusableDivProps> = ({
  children,
  onEnterPress,
  clickEnterButtonLabel,
}) => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // As soon as this mounts, move focus here instead of the close button
    divRef.current?.focus();
  }, []);

  const clickEnterButtonLabelText = clickEnterButtonLabel
    ? `Press Enter to activate the ${clickEnterButtonLabel} button.`
    : '';

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      console.log('handleKeyDown avo44a', event);
      event.preventDefault();
      event.stopPropagation();
      onEnterPress();
    }
  };

  return (
    <div
      ref={divRef}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      role="group"
      aria-label={clickEnterButtonLabelText}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        outline: 'none',
        flex: 1,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Generic Modal component with a focusable div for autofocusing on the button when the enter key is pressed;
 * This is used to make the modal more accessible for users who use keyboard navigation.
 * and easier to use in general.
 *
 * The buttons are defined via the buttonActions prop; only one button can have clickOnEnter set to true
 * (if more than one button has clickOnEnter set to true, only the first one will be autofocused on)
 *
 * for autofocusing on the button when the enter key is pressed;
 * disableFocusTrap needs to be false
 */
const GenericModal: React.FC<GenericModalProps> = ({
  onClose,
  contents,
  title,
  buttonActions,
  description,
  disableFocusTrap,
  dataTestId = 'pipeline-server-starting-modal',
  error,
  alertTitle,
  alertLinks,
  bodyClassName = 'odh-modal__content-height',
  variant = 'medium',
  appendTo,
}) => {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const headingId = useId(); // for the aria-labelledby attribute (a11y)

  const actualOnClose = () => {
    console.log('actualOnClose called');
    onClose();
  };

  const clickOnEnterIndex =
    buttonActions?.findIndex(
      (action) => action.clickOnEnter && action.isDisabled !== true && action.isLoading !== true,
    ) ?? -1;
  const hasClickOnEnter = clickOnEnterIndex !== -1;
  const clickOnEnterButtonLabel = buttonActions?.[clickOnEnterIndex]?.label;

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
    <FocusableDiv onEnterPress={handleEnterPress} clickEnterButtonLabel={clickOnEnterButtonLabel}>
      {contents}
    </FocusableDiv>
  ) : (
    contents
  );

  // todo; test that a button *without* a variant is rendered properly
  return (
    <Modal
      data-testid={dataTestId}
      isOpen
      variant={variant}
      onClose={actualOnClose}
      title={typeof title === 'string' ? title : 'Modal'}
      disableFocusTrap={disableFocusTrap}
      aria-label={typeof title === 'string' ? title : undefined}
      aria-labelledby={typeof title !== 'string' ? headingId : undefined}
      appendTo={appendTo}
    >
      <ModalHeader title={typeof title === 'string' ? title : undefined} description={description}>
        {typeof title !== 'string' ? <span id={headingId}>{title}</span> : null}
      </ModalHeader>
      <ModalBody className={bodyClassName}>{modalContents}</ModalBody>
      <ModalFooter>
        {buttonActions && (
          <GenericModalFooter
            buttonActions={buttonActions}
            buttonRefs={buttonRefs}
            error={error}
            alertTitle={alertTitle}
            alertLinks={alertLinks}
          />
        )}
      </ModalFooter>
    </Modal>
  );
};

export default GenericModal;
