import * as React from 'react';
import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { NotebookKind } from '#~/k8sTypes';
import {
  DATA_CONNECTION_PREFIX,
  deleteConfigMap,
  deleteNotebook,
  deleteSecret,
  isGeneratedConfigMapName,
  isGeneratedSecretName,
} from '#~/api';
import DeleteModal from '#~/pages/projects/components/DeleteModal';
import { getEnvFromList } from '#~/pages/projects/pvc/utils';
import { ConfigMapRef, SecretRef } from '#~/pages/projects/types';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';

type DeleteNotebookModalProps = {
  notebook: NotebookKind;
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
            onBeforeClose(true);
          })
          .catch((e) => {
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
