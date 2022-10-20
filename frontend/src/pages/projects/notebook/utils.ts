import { NotebookKind } from '../../../k8sTypes';

export const hasStopAnnotation = (notebook: NotebookKind): boolean => {
  return !!notebook.metadata.annotations?.['kubeflow-resource-stopped'];
};

export const getNotebookMountPaths = (notebook?: NotebookKind): string[] => {
  if (!notebook) {
    return [];
  }

  return notebook.spec.template.spec.containers
    .map((container) => container.volumeMounts?.map((volumeMount) => volumeMount.mountPath) || [])
    .flat();
};
