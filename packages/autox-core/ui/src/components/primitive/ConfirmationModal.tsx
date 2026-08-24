import * as React from 'react';
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalProps } from '@patternfly/react-core';
import DashboardModalFooter from '@odh-dashboard/ui-core/components/DashboardModalFooter';

interface ConfirmationModalProps {
  title: string;
  children: React.ReactNode;
  submitLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  isSubmitDisabled?: boolean;
  variant?: ModalProps['variant'];
}

/**
 * A generic modal shell: title + arbitrary body content + a submit/cancel
 * footer. Carries no domain vocabulary of its own — callers supply the title,
 * body content, and submit behavior via props.
 */
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  children,
  submitLabel,
  onConfirm,
  onClose,
  isSubmitDisabled,
  variant = 'small',
}) => (
  <Modal variant={variant} isOpen onClose={onClose}>
    <ModalHeader title={title} />
    <ModalBody>{children}</ModalBody>
    <ModalFooter>
      <DashboardModalFooter
        submitLabel={submitLabel}
        onSubmit={onConfirm}
        isSubmitDisabled={isSubmitDisabled}
        onCancel={onClose}
      />
    </ModalFooter>
  </Modal>
);

export default ConfirmationModal;
