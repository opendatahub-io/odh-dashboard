import * as React from 'react';
import { useRef, useEffect, useId } from 'react';
import {
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  Button,
  ButtonProps,
  ModalProps,
  ModalHeaderProps,
} from '@patternfly/react-core';
import '#~/concepts/dashboard/ModalStyles.scss';

export type ButtonAction = {
  label: string;
  onClick: () => void;
  variant?: ButtonProps['variant'];
  clickOnEnter?: boolean;
  dataTestId?: string;
};

type ContentModalProps = {
  onClose: () => void;
  contents: React.ReactNode;
  title: string | React.ReactNode;
  buttonActions?: ButtonAction[];
  description?: React.ReactNode;
  disableFocusTrap?: boolean;
  dataTestId?: string;
  bodyClassName?: string;
  variant?: ModalProps['variant'];
  bodyLabel?: string;
  titleIconVariant?: ModalHeaderProps['titleIconVariant'];
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
    : undefined;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      // Don't capture Enter for textareas (they need it for newlines)
      if (event.target instanceof HTMLTextAreaElement) {
        return;
      }
      // Don't capture Enter for buttons - let them handle it natively
      // This ensures that when a button is focused, Enter activates it
      // Exception: If it's a tab that's already selected, capture Enter since
      // pressing Enter on an already-selected tab is a no-op
      if (event.target instanceof HTMLButtonElement) {
        const isTab = event.target.getAttribute('role') === 'tab';
        const isAlreadySelected = event.target.getAttribute('aria-selected') === 'true';
        if (!isTab || !isAlreadySelected) {
          return;
        }
      }
      // Don't capture Enter for links - let them navigate
      if (event.target instanceof HTMLAnchorElement) {
        return;
      }
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
      {...(clickEnterButtonLabelText && { 'aria-label': clickEnterButtonLabelText })}
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

// all buttons are always 'on'/enabled in this modal
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
const ContentModal: React.FC<ContentModalProps> = ({
  onClose,
  contents,
  title,
  buttonActions,
  description,
  disableFocusTrap,
  dataTestId = 'content-modal',
  bodyClassName = 'odh-modal__content-height',
  variant = 'medium',
  bodyLabel,
  titleIconVariant,
}) => {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const enterPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headingId = useId(); // for the aria-labelledby attribute (a11y)

  const clickOnEnterIndex = buttonActions?.findIndex((action) => action.clickOnEnter) ?? -1;
  const hasClickOnEnter = clickOnEnterIndex !== -1;
  const clickOnEnterButtonLabel = buttonActions?.[clickOnEnterIndex]?.label;

  // Clear the enter press timeout on unmount to prevent stale callbacks
  useEffect(
    () => () => {
      if (enterPressTimeoutRef.current !== null) {
        clearTimeout(enterPressTimeoutRef.current);
      }
    },
    [],
  );

  const handleEnterPress = () => {
    const button = buttonRefs.current[clickOnEnterIndex];
    if (button) {
      // Focus the button to show visual feedback
      button.focus();

      // Clear any existing timeout before setting a new one
      if (enterPressTimeoutRef.current !== null) {
        clearTimeout(enterPressTimeoutRef.current);
      }

      // the timeout allows the user to see the button being pressed; else the modal just closes
      enterPressTimeoutRef.current = setTimeout(() => {
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

  return (
    <Modal
      data-testid={dataTestId}
      isOpen
      variant={variant}
      onClose={onClose}
      disableFocusTrap={disableFocusTrap}
      aria-label={typeof title === 'string' ? title : undefined}
      aria-labelledby={typeof title !== 'string' ? headingId : undefined}
    >
      <ModalHeader
        title={typeof title === 'string' ? title : undefined}
        description={typeof title === 'string' ? description : undefined}
        titleIconVariant={titleIconVariant}
        data-testid="generic-modal-header"
      >
        {typeof title !== 'string' && (
          <>
            <span id={headingId}>{title}</span>
            {description && <div style={{ marginTop: '8px' }}>{description}</div>}
          </>
        )}
      </ModalHeader>
      <ModalBody className={bodyClassName} aria-label={bodyLabel}>
        {modalContents}
      </ModalBody>
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

export default ContentModal;
