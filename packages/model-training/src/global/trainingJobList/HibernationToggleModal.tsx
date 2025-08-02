import * as React from 'react';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Stack,
  StackItem,
  Alert,
} from '@patternfly/react-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import DashboardModalFooter from '@odh-dashboard/internal/concepts/dashboard/DashboardModalFooter';
import { PyTorchJobKind } from '../../k8sTypes';

type HibernationToggleModalProps = {
  job?: PyTorchJobKind;
  isHibernated: boolean;
  isToggling: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const HibernationToggleModal: React.FC<HibernationToggleModalProps> = ({
  job,
  isHibernated,
  isToggling,
  onClose,
  onConfirm,
}) => {
  if (!job) {
    return null;
  }

  const displayName = getDisplayNameFromK8sResource(job);
  const action = isHibernated ? 'resume' : 'hibernate';
  const actionLabel = isHibernated ? 'Resume' : 'Hibernate';

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen
      onClose={onClose}
      data-testid="hibernation-toggle-modal"
    >
      <ModalHeader
        title={`${actionLabel} training job`}
        titleIconVariant={isHibernated ? 'info' : 'warning'}
      />
      <ModalBody>
        Are you sure you want to {action} the training job <strong>"{displayName}"</strong>?
        <br />
        <br />
        {isHibernated
          ? `The job will be resumed and resources will be allocated to continue training.`
          : `The job will be paused and resources will be freed up. The job can be resumed later
              from where it left off.`}
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          onCancel={onClose}
          onSubmit={onConfirm}
          submitLabel={actionLabel}
          submitButtonVariant={isHibernated ? 'primary' : 'secondary'}
          isSubmitLoading={isToggling}
          isSubmitDisabled={isToggling}
          isCancelDisabled={isToggling}
        />
      </ModalFooter>
    </Modal>
  );
};

export default HibernationToggleModal;
