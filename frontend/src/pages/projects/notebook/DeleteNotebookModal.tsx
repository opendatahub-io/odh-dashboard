import * as React from 'react';
import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import {
  DATA_CONNECTION_PREFIX,
  getDisplayNameFromK8sResource,
  isGeneratedSecretName,
  K8sStatusError,
} from '@odh-dashboard/k8s-core';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { NotebookKind } from '#~/k8sTypes';
import { deleteConfigMap, deleteNotebook, deleteSecret, isGeneratedConfigMapName } from '#~/api';
import DeleteModal from '#~/pages/projects/components/DeleteModal';
import { getEnvFromList } from '#~/pages/projects/pvc/utils';
import { ConfigMapRef, SecretRef } from '#~/pages/projects/types';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import {
  getWorkbenchKueueTrackingProperties,
  WorkbenchTrackingEvent,
} from '#~/concepts/kueue/workbenchTracking';

type DeleteNotebookModalProps = {
  notebook: NotebookKind;
  onClose: (deleted: boolean) => void;
};

const DeleteNotebookModal: React.FC<DeleteNotebookModalProps> = ({ notebook, onClose }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const { kueueStatusByNotebookName } = React.useContext(ProjectDetailsContext);
  const kueueStatus = kueueStatusByNotebookName[notebook.metadata.name] ?? null;

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const displayName = getDisplayNameFromK8sResource(notebook);

  return (
    <DeleteModal
      title="Delete workbench?"
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete workbench"
      onDelete={() => {
        setIsDeleting(true);

        const nonDataConnectionVariables = getEnvFromList(notebook).filter(
          (envFrom) => !envFrom.secretRef?.name.includes(DATA_CONNECTION_PREFIX),
        );
        const configMapNames = nonDataConnectionVariables
          .filter(
            (envName): envName is ConfigMapRef =>
              !!envName.configMapRef && isGeneratedConfigMapName(envName.configMapRef.name),
          )
          .map((data) => data.configMapRef.name);
        const secretNames = nonDataConnectionVariables
          .filter(
            (envName): envName is SecretRef =>
              !!envName.secretRef && isGeneratedSecretName(envName.secretRef.name),
          )
          .map((data) => data.secretRef.name);

        const { namespace } = notebook.metadata;

        const resourcesToDelete: Promise<K8sStatus>[] = [
          deleteNotebook(notebook.metadata.name, namespace),
          ...secretNames.map((name) => deleteSecret(namespace, name)),
          ...configMapNames.map((name) => deleteConfigMap(namespace, name)),
        ];
        Promise.all(resourcesToDelete)
          .then(() => {
            fireFormTrackingEvent(WorkbenchTrackingEvent.Deleted, {
              outcome: TrackingOutcome.submit,
              success: true,
              projectName: namespace,
              notebookName: notebook.metadata.name,
              ...getWorkbenchKueueTrackingProperties({
                kueueStatus,
                isStarting: false,
                isRunning: false,
                isStopping: false,
              }),
            });
            onBeforeClose(true);
          })
          .catch((e) => {
            fireFormTrackingEvent(WorkbenchTrackingEvent.Deleted, {
              outcome: TrackingOutcome.submit,
              success: false,
              error: e instanceof K8sStatusError ? `k8s_${e.statusObject.code}` : 'unknown_error',
              projectName: namespace,
              notebookName: notebook.metadata.name,
              ...getWorkbenchKueueTrackingProperties({ kueueStatus }),
            });
            setError(e);
            setIsDeleting(false);
          });
      }}
      deleting={isDeleting}
      error={error}
      deleteName={displayName}
    >
      This action cannot be undone.
    </DeleteModal>
  );
};

export default DeleteNotebookModal;
