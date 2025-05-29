import { NotebookKind } from '#~/k8sTypes';
import { EnvironmentFromVariable, SecretRef } from '#~/pages/projects/types';

export const getNotebookPVCNames = (notebook: NotebookKind): string[] => {
  const volumes = notebook.spec.template.spec.volumes || [];
  return volumes
    .map<string | undefined>((volume) => volume.persistentVolumeClaim?.claimName)
    .filter((v): v is string => !!v);
};

export const getEnvFromList = (notebook: NotebookKind): EnvironmentFromVariable[] =>
  notebook.spec.template.spec.containers[0].envFrom || [];

export const getSecretsFromList = (notebook: NotebookKind): SecretRef[] =>
  getEnvFromList(notebook).filter<SecretRef>(
    (envFrom): envFrom is SecretRef => !!envFrom.secretRef?.name,
  );

export const getNotebookSecretNames = (notebook: NotebookKind): string[] =>
  getSecretsFromList(notebook).map<string>(({ secretRef: { name } }) => name);

export const hasEnvFrom = (notebook: NotebookKind): boolean => getEnvFromList(notebook).length > 0;
