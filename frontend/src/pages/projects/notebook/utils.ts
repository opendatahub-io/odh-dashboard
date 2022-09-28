import { NotebookKind } from '../../../k8sTypes';

export const hasStopAnnotation = (notebook: NotebookKind): boolean => {
  return !!notebook.metadata.annotations?.['kubeflow-resource-stopped'];
};
