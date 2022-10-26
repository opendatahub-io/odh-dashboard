import { NotebookKind } from '../../../k8sTypes';

export const getNotebookPVCNames = (notebook: NotebookKind): string[] => {
  const volumes = notebook.spec.template.spec.volumes || [];
  return volumes
    .map<string | undefined>((volume) => volume.persistentVolumeClaim?.claimName)
    .filter((v): v is string => !!v);
};

export const getNotebookSecretNames = (notebook: NotebookKind): string[] => {
  type SecretRef = {
    secretRef: {
      name: string;
    };
  };

  const envFroms = notebook.spec.template.spec.containers[0].envFrom || [];
  return envFroms
    .filter<SecretRef>((envFrom): envFrom is SecretRef => !!envFrom.secretRef?.name)
    .map<string>(({ secretRef: { name } }) => name);
};
