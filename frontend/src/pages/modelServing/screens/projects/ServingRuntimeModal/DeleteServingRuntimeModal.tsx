import * as React from 'react';
import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import {
  deleteInferenceService,
  deleteRoleBinding,
  deleteServiceAccount,
  deleteServingRuntime,
} from '~/api';
import { getTokenNames } from '~/pages/modelServing/utils';
import { allSettledPromises } from '~/utilities/allSettledPromises';
import { fireTrackingEvent } from '~/utilities/segmentIOUtils';
import { TrackingOutcome } from '~/types';

type DeleteServingRuntimeModalProps = {
  servingRuntime?: ServingRuntimeKind;
  inferenceServices: InferenceServiceKind[];
  onClose: (deleted: boolean) => void;
};

const DeleteServingRuntimeModal: React.FC<DeleteServingRuntimeModalProps> = ({
  servingRuntime,
  inferenceServices,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  return (
    <DeleteModal
      title="Delete model server?"
      isOpen={!!servingRuntime}
      onClose={() => {
        fireTrackingEvent('DeleteModelServer', { outcome: TrackingOutcome.cancel });
        onBeforeClose(false);
      }}
      submitButtonLabel="Delete model server"
      onDelete={() => {
        if (servingRuntime) {
          setIsDeleting(true);

          fireTrackingEvent('DeleteModelServer', {
            outcome: TrackingOutcome.submit,
          });

          const { serviceAccountName, roleBindingName } = getTokenNames(
            servingRuntime.metadata.name,
            servingRuntime.metadata.namespace,
          );

          allSettledPromises<ServingRuntimeKind | K8sStatus>([
            deleteServingRuntime(servingRuntime.metadata.name, servingRuntime.metadata.namespace),
            ...inferenceServices
              .filter(
                (inferenceService) =>
                  inferenceService.spec.predictor.model.runtime === servingRuntime.metadata.name,
              )
              .map((inferenceService) =>
                deleteInferenceService(
                  inferenceService.metadata.name,
                  inferenceService.metadata.namespace,
                ),
              ),
            // for compatibility continue to delete related resources
            deleteServiceAccount(serviceAccountName, servingRuntime.metadata.namespace),
            deleteRoleBinding(roleBindingName, servingRuntime.metadata.namespace),
          ])
            .then(() => {
              onBeforeClose(true);
            })
            .catch((e) => {
              setError(e);
              setIsDeleting(false);
            });
        }
      }}
      deleting={isDeleting}
      error={error}
      deleteName={servingRuntime?.metadata.name || 'this model server'}
    >
      This action cannot be undone.
    </DeleteModal>
  );
};

export default DeleteServingRuntimeModal;
