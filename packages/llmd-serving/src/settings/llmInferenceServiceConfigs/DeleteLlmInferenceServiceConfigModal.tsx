import * as React from 'react';
import { useTrackEvent } from '@odh-dashboard/analytics/react';
import DeleteModal from '@odh-dashboard/ui-core/components/DeleteModal';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { TrackingOutcome } from '@odh-dashboard/analytics/types';
import type { LLMInferenceServiceConfigKind } from '../../types';
import { deleteLLMInferenceServiceConfig } from '../../api/LLMInferenceServiceConfigs';
import { fireLlmInferenceServiceConfigDeleted } from '../../tracking/llmdTrackingConstants';

type DeleteLlmInferenceServiceConfigModalProps = {
  config: LLMInferenceServiceConfigKind;
  onClose: (deleted: boolean) => void;
};

const DeleteLlmInferenceServiceConfigModal: React.FC<DeleteLlmInferenceServiceConfigModalProps> = ({
  config,
  onClose,
}) => {
  const trackEvent = useTrackEvent();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  return (
    <DeleteModal
      title="Delete LLM inference service configuration?"
      onClose={() => {
        fireLlmInferenceServiceConfigDeleted(trackEvent, { outcome: TrackingOutcome.cancel });
        onClose(false);
      }}
      submitButtonLabel="Delete LLM inference service configuration"
      onDelete={() => {
        setIsDeleting(true);
        setError(undefined);
        deleteLLMInferenceServiceConfig(config.metadata.name, config.metadata.namespace)
          .then(() => {
            fireLlmInferenceServiceConfigDeleted(trackEvent, {
              outcome: TrackingOutcome.submit,
              success: true,
            });
            onClose(true);
          })
          .catch((e) => {
            fireLlmInferenceServiceConfigDeleted(trackEvent, {
              outcome: TrackingOutcome.submit,
              success: false,
            });
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

export default DeleteLlmInferenceServiceConfigModal;
