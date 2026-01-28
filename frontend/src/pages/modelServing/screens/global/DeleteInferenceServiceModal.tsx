import * as React from 'react';
import DeleteModal from '#~/pages/projects/components/DeleteModal';
import { InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import { deleteInferenceService, deleteNIMService, deleteServingRuntime } from '#~/api';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import {
  getNIMResourcesToDelete,
  isProjectNIMSupported,
} from '#~/pages/modelServing/screens/projects/nimUtils';
import { getNIMServiceOwner } from './nimOperatorUtils';

type DeleteInferenceServiceModalProps = {
  inferenceService?: InferenceServiceKind;
  servingRuntime?: ServingRuntimeKind;
  onClose: (deleted: boolean) => void;
};

const DeleteInferenceServiceModal: React.FC<DeleteInferenceServiceModalProps> = ({
  inferenceService,
  servingRuntime,
  onClose,
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

  const onDelete = async () => {
    if (!inferenceService) {
      return;
    }

    setIsDeleting(true);
    try {
      // Check if this InferenceService is managed by the NIM Operator
      const nimServiceOwner = getNIMServiceOwner(inferenceService);

      if (nimServiceOwner) {
        // NIM Operator deployment: Delete the NIMService CR
        // The NIM Operator will handle cascading deletion of the InferenceService
        // Note: We still need to clean up Dashboard-managed resources (PVCs, secrets)
        const nimResourcesToDelete =
          isKServeNIMEnabled && project && servingRuntime
            ? await getNIMResourcesToDelete(project.metadata.name, servingRuntime)
            : [];

        await Promise.all([
          deleteNIMService(nimServiceOwner.name, inferenceService.metadata.namespace),
          ...nimResourcesToDelete,
        ]);
      } else {
        // Legacy NIM deployment (no NIM Operator): Delete InferenceService and ServingRuntime
        const nimResourcesToDelete =
          isKServeNIMEnabled && project && servingRuntime
            ? await getNIMResourcesToDelete(project.metadata.name, servingRuntime)
            : [];

        await Promise.all([
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
          ...nimResourcesToDelete,
        ]);
      }

      onBeforeClose(true);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e);
      } else {
        setError(new Error('An unknown error occurred'));
      }
      setIsDeleting(false);
    }
  };

  return (
    <DeleteModal
      title="Delete model deployment?"
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete model deployment"
      onDelete={onDelete}
      deleting={isDeleting}
      error={error}
      deleteName={displayName}
    >
      This action cannot be undone.
    </DeleteModal>
  );
};
export default DeleteInferenceServiceModal;
