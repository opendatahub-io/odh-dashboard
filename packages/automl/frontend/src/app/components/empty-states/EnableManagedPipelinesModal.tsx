import React from 'react';
import { Modal, ModalBody, ModalHeader, ModalFooter } from '@patternfly/react-core';
import DashboardModalFooter from '@odh-dashboard/internal/concepts/dashboard/DashboardModalFooter';
import ManagedPipelinesSettingsSection from '@odh-dashboard/internal/concepts/pipelines/content/configurePipelinesServer/ManagedPipelinesSettingsSection';

type EnableManagedPipelinesModalProps = {
  onConfirm: () => void;
  onClose: () => void;
};

const EnableManagedPipelinesModal: React.FC<EnableManagedPipelinesModalProps> = ({
  onConfirm,
  onClose,
}) => {
  const [enableManagedPipelines, setEnableManagedPipelines] = React.useState(false);

  return (
    <Modal variant="small" isOpen onClose={onClose}>
      <ModalHeader title="Enable AutoML pipelines" />
      <ModalBody>
        <p>
          Enabling managed pipelines will restart the pipeline server, which may interrupt any
          currently running pipeline jobs.
        </p>
        <div className="pf-v6-u-mt-md">
          <ManagedPipelinesSettingsSection
            variant="description"
            enableManagedPipelines={enableManagedPipelines}
            setEnableManagedPipelines={setEnableManagedPipelines}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel="Enable AutoML pipelines"
          onSubmit={onConfirm}
          isSubmitDisabled={!enableManagedPipelines}
          onCancel={onClose}
        />
      </ModalFooter>
    </Modal>
  );
};

export default EnableManagedPipelinesModal;
