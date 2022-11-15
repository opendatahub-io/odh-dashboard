import * as React from 'react';
import { K8sStatus, NotebookKind } from '../../../k8sTypes';
import { getNotebookDisplayName } from '../utils';
import {
  DATA_CONNECTION_PREFIX,
  deleteConfigMap,
  deleteNotebook,
  deleteSecret,
} from '../../../api';
import DeleteModal from '../components/DeleteModal';
import { getEnvFromList } from '../pvc/utils';
import { ConfigMapRef, SecretRef } from '../types';

type DeleteNotebookModalProps = {
  notebook?: NotebookKind;
  onClose: (deleted: boolean) => void;
};

const DeleteNotebookModal: React.FC<DeleteNotebookModalProps> = ({ notebook, onClose }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const displayName = notebook ? getNotebookDisplayName(notebook) : 'this workbench';

  return (
    <DeleteModal
      title="Delete workbench?"
      isOpen={!!notebook}
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete workbench"
      onDelete={() => {
        if (notebook) {
          setIsDeleting(true);

          const nonDataConnectionVariables = getEnvFromList(notebook).filter(
            (envFrom) => !envFrom.secretRef?.name?.includes(DATA_CONNECTION_PREFIX),
          );
          const configMapNames = nonDataConnectionVariables
            .filter((envName): envName is ConfigMapRef => !!envName.configMapRef)
            .map((data) => data.configMapRef.name);
          const secretNames = nonDataConnectionVariables
            .filter((envName): envName is SecretRef => !!envName.secretRef)
            .map((data) => data.secretRef.name);

          const namespace = notebook.metadata.namespace;

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
