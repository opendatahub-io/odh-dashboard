import * as React from 'react';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import { deleteInferenceService, deletePvc, deleteServingRuntime } from '~/api';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { isProjectNIMSupported } from '~/pages/modelServing/screens/projects/nimUtils';

type DeleteInferenceServiceModalProps = {
  inferenceService?: InferenceServiceKind;
  servingRuntime?: ServingRuntimeKind;
  onClose: (deleted: boolean) => void;
  isOpen?: boolean;
};

const DeleteInferenceServiceModal: React.FC<DeleteInferenceServiceModalProps> = ({
  inferenceService,
  servingRuntime,
  onClose,
  isOpen = false,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const { projects } = React.useContext(ProjectsContext);
  const project = projects.find(byName(inferenceService?.metadata.namespace)) ?? null;
  const isKServeNIMEnabled = project ? isProjectNIMSupported(project) : false;

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const displayName = inferenceService
    ? getDisplayNameFromK8sResource(inferenceService)
    : 'this deployed model';

  return (
    <DeleteModal
      title="Delete deployed model?"
      isOpen={isOpen}
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete deployed model"
      onDelete={() => {
        if (inferenceService) {
          setIsDeleting(true);
          const pvcName = servingRuntime?.spec.volumes?.find(
            (vol) => vol.persistentVolumeClaim?.claimName,
          )?.persistentVolumeClaim?.claimName;
          Promise.all([
            deleteInferenceService(
              inferenceService.metadata.name,
              inferenceService.metadata.namespace,
            ),
            ...(servingRuntime
              ? [
                  deleteServingRuntime(
                    servingRuntime.metadata.name,
                    servingRuntime.metadata.namespace,
                  ),
                ]
              : []),
            ...(isKServeNIMEnabled && pvcName
              ? [deletePvc(pvcName, inferenceService.metadata.namespace)]
              : []),
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
      deleteName={displayName}
    >
      This action cannot be undone.
    </DeleteModal>
  );
};

export default DeleteInferenceServiceModal;
