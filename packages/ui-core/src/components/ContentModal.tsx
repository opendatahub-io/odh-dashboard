import * as React from 'react';
import { useId } from 'react';
import {
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  Button,
  ButtonProps,
  ModalProps,
  ModalHeaderProps,
  Alert,
  Stack,
  StackItem,
  ActionList,
  ActionListGroup,
  ActionListItem,
} from '@patternfly/react-core';
import './ModalStyles.scss';

export type ButtonAction = {
  label: string;
  onClick: () => void;
  variant?: ButtonProps['variant'];
  dataTestId?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
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
  noBodyPadding?: boolean;
  variant?: ModalProps['variant'];
  bodyLabel?: string;
  titleIconVariant?: ModalHeaderProps['titleIconVariant'];
  /** When true, apply a scoped CSS override so PF modal title text wraps instead of ellipsis. */
  wrapTitle?: boolean;
  error?: Error | React.ReactNode;
  alertTitle?: string;
  alertLinks?: React.ReactNode;
};

// all buttons are always 'on'/enabled in this modal
/**
 * Generic Modal component for better accessibility.
 * This is used to make the modal more accessible for users who use keyboard navigation.
 * and easier to use in general.
 *
 * The buttons are defined via the buttonActions prop
 *
 * originally, the 'cancel' button was meant to be activated upon enter, but that is not standard UX;
 * and the 'escape' button already closes the dialog; which is standard. (this is implemented by patternfly)
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
  noBodyPadding,
  variant = 'medium',
  bodyLabel,
  titleIconVariant,
  wrapTitle = false,
  error,
  alertTitle,
  alertLinks,
}) => {
  const headingId = useId(); // used for aria-labelledby (a11y)
  const descriptionId = useId(); // used for aria-describedby (a11y)

  return (
    <Modal
      className={wrapTitle ? 'odh-content-modal--wrap-title' : undefined}
      data-testid={dataTestId}
      isOpen
      variant={variant}
      onClose={onClose}
      disableFocusTrap={disableFocusTrap}
      aria-labelledby={headingId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <ModalHeader
        title={title}
        labelId={headingId}
        description={description ? <div id={descriptionId}>{description}</div> : undefined}
        titleIconVariant={titleIconVariant}
        data-testid="generic-modal-header"
      />
      <ModalBody
        className={`${bodyClassName}${noBodyPadding ? ' pf-v6-u-p-0' : ''}`}
        aria-label={bodyLabel}
      >
        {contents}
      </ModalBody>
      {(error || (buttonActions && buttonActions.length > 0)) && (
        <ModalFooter>
          <Stack hasGutter style={{ flex: 'auto' }}>
            {error && (
              <StackItem>
                <Alert
                  data-testid="error-message-alert"
                  variant="danger"
                  isInline
                  title={alertTitle}
                  actionLinks={alertLinks}
                >
                  {error instanceof Error ? error.message : error}
                </Alert>
              </StackItem>
            )}
            {buttonActions && buttonActions.length > 0 && (
              <StackItem>
                <ActionList>
                  <ActionListGroup>
                    {buttonActions.map((action, index) => (
                      <ActionListItem key={`${action.label}-${index}`}>
                        <Button
                          variant={action.variant}
                          onClick={action.onClick}
                          data-testid={action.dataTestId}
                          isLoading={action.isLoading}
                          isDisabled={action.isDisabled}
                        >
                          {action.label}
                        </Button>
                      </ActionListItem>
                    ))}
                  </ActionListGroup>
                </ActionList>
              </StackItem>
            )}
          </Stack>
        </ModalFooter>
      )}
    </Modal>
  );
};

export default ContentModal;
