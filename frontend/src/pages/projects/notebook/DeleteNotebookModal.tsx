import * as React from 'react';
import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { NotebookKind } from '~/k8sTypes';
import { DATA_CONNECTION_PREFIX, deleteConfigMap, deleteNotebook, deleteSecret } from '~/api';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import { getEnvFromList } from '~/pages/projects/pvc/utils';
import { ConfigMapRef, SecretRef } from '~/pages/projects/types';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { TrackedModalProps } from '~/pages/projects/components/TrackedModal';

type DeleteNotebookModalProps = {
  notebook?: NotebookKind;
} & TrackedModalProps;

const DeleteNotebookModal: React.FC<DeleteNotebookModalProps> = ({ notebook, onClose }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const onBeforeClose = (deleted: boolean, success?: boolean, errorText?: string) => {
    onClose(deleted, success, errorText);
    setIsDeleting(false);
    setError(undefined);
  };

  const displayName = notebook ? getDisplayNameFromK8sResource(notebook) : 'this workbench';

  return (
    <DeleteModal
      title="Delete workbench?"
      isOpen={!!notebook}
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete workbench"
      trackingEventName="Workbench Deleted"
      onDelete={() => {
        if (notebook) {
          setIsDeleting(true);

          const nonDataConnectionVariables = getEnvFromList(notebook).filter(
            (envFrom) => !envFrom.secretRef?.name.includes(DATA_CONNECTION_PREFIX),
          );
          const configMapNames = nonDataConnectionVariables
            .filter((envName): envName is ConfigMapRef => !!envName.configMapRef)
            .map((data) => data.configMapRef.name);
          const secretNames = nonDataConnectionVariables
            .filter((envName): envName is SecretRef => !!envName.secretRef)
            .map((data) => data.secretRef.name);

          const { namespace } = notebook.metadata;

          const resourcesToDelete: Promise<K8sStatus>[] = [
            deleteNotebook(notebook.metadata.name, namespace),
            ...secretNames.map((name) => deleteSecret(namespace, name)),
            ...configMapNames.map((name) => deleteConfigMap(namespace, name)),
          ];
          Promise.all(resourcesToDelete)
            .then(() => {
              onBeforeClose(true);
            })
            .catch((e) => {
              setError(e);
              setIsDeleting(false);
              onBeforeClose(true, false, e);
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

export default DeleteNotebookModal;
