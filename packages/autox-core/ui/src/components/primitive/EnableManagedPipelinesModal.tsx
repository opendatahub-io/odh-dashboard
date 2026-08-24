import React from 'react';
import { Modal, ModalBody, ModalHeader, ModalFooter } from '@patternfly/react-core';
import DashboardModalFooter from '@odh-dashboard/ui-core/components/DashboardModalFooter';
import ManagedPipelinesSettingsSection from '@odh-dashboard/internal/concepts/pipelines/content/configurePipelinesServer/ManagedPipelinesSettingsSection';

type EnableManagedPipelinesModalProps = {
  productName: string;
  onConfirm: () => void;
  onClose: () => void;
};

const EnableManagedPipelinesModal: React.FC<EnableManagedPipelinesModalProps> = ({
  productName,
  onConfirm,
  onClose,
}) => {
  const [enableManagedPipelines, setEnableManagedPipelines] = React.useState(false);

  return (
    <Modal variant="small" isOpen onClose={onClose}>
      <ModalHeader title={`Enable ${productName} pipelines`} />
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
          submitLabel={`Enable ${productName} pipelines`}
          onSubmit={onConfirm}
          isSubmitDisabled={!enableManagedPipelines}
          onCancel={onClose}
        />
      </ModalFooter>
    </Modal>
  );
};

export default EnableManagedPipelinesModal;
