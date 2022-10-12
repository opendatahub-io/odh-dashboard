import { NotebookKind } from '../../../k8sTypes';

export const getNotebookPVCNames = (notebook: NotebookKind): string[] => {
  const volumes = notebook.spec.template.spec.volumes || [];
  return volumes
    .map<string | undefined>((volume) => volume.persistentVolumeClaim?.claimName)
    .filter((v): v is string => !!v);
};
