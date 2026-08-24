import * as React from 'react';
import ManagedPipelinesSettingsSection from '@odh-dashboard/internal/concepts/pipelines/content/configurePipelinesServer/ManagedPipelinesSettingsSection';
import { ConfirmationModal } from '../primitive';

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
    <ConfirmationModal
      title={`Enable ${productName} pipelines`}
      submitLabel={`Enable ${productName} pipelines`}
      onConfirm={onConfirm}
      onClose={onClose}
      isSubmitDisabled={!enableManagedPipelines}
    >
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
    </ConfirmationModal>
  );
};

export default EnableManagedPipelinesModal;
