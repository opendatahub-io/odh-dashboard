import * as React from 'react';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import { InferenceServiceKind, K8sStatus, SecretKind, ServingRuntimeKind } from '~/k8sTypes';
import {
  deleteInferenceService,
  deleteRoleBinding,
  deleteSecret,
  deleteServiceAccount,
  deleteServingRuntime,
} from '~/api';
import { getTokenNames } from '~/pages/modelServing/utils';

type DeleteServingRuntimeModalProps = {
  servingRuntime?: ServingRuntimeKind;
  inferenceServices: InferenceServiceKind[];
  tokens: SecretKind[];
  onClose: (deleted: boolean) => void;
};

const DeleteServingRuntimeModal: React.FC<DeleteServingRuntimeModalProps> = ({
  servingRuntime,
  inferenceServices,
  tokens,
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
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete model server"
      onDelete={() => {
        if (servingRuntime) {
          setIsDeleting(true);

          const { serviceAccountName, roleBindingName } = getTokenNames(
            servingRuntime.metadata.name,
            servingRuntime.metadata.namespace,
          );

          Promise.all<ServingRuntimeKind | K8sStatus>([
            deleteServingRuntime(servingRuntime.metadata.name, servingRuntime.metadata.namespace),
            deleteServiceAccount(serviceAccountName, servingRuntime.metadata.namespace),
            deleteRoleBinding(roleBindingName, servingRuntime.metadata.namespace),
            ...tokens.map((token) => deleteSecret(token.metadata.namespace, token.metadata.name)),
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
          ])
            .then(() => {
              onBeforeClose(true);
            })
            .catch((e) => {
              if (e.response.status === 404) {
                onBeforeClose(true);
              } else {
                setError(e);
                setIsDeleting(false);
              }
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
