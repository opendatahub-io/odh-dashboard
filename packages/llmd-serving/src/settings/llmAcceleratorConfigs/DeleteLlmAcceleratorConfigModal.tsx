import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- standard delete confirmation wrapper
import DeleteModal from '@odh-dashboard/internal/pages/projects/components/DeleteModal';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import type { LLMInferenceServiceConfigKind } from '../../types';
import { deleteLLMInferenceServiceConfig } from '../../api/LLMInferenceServiceConfigs';

type DeleteLlmAcceleratorConfigModalProps = {
  config: LLMInferenceServiceConfigKind;
  onClose: (deleted: boolean) => void;
};

const DeleteLlmAcceleratorConfigModal: React.FC<DeleteLlmAcceleratorConfigModalProps> = ({
  config,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  return (
    <DeleteModal
      title="Delete LLM accelerator configuration?"
      onClose={() => onClose(false)}
      submitButtonLabel="Delete LLM accelerator configuration"
      onDelete={() => {
        setIsDeleting(true);
        setError(undefined);
        deleteLLMInferenceServiceConfig(config.metadata.name, config.metadata.namespace)
          .then(() => {
            onClose(true);
          })
          .catch((e) => {
            setError(e);
            setIsDeleting(false);
          });
      }}
      deleting={isDeleting}
      error={error}
      deleteName={getDisplayNameFromK8sResource(config)}
    >
      This action cannot be undone.
    </DeleteModal>
  );
};

export default DeleteLlmAcceleratorConfigModal;
