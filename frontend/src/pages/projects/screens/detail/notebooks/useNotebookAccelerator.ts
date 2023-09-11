import { NotebookKind } from '~/k8sTypes';
import { Notebook } from '~/types';
import useAcceleratorState, { AcceleratorState } from '~/utilities/useAcceleratorState';
import { GenericObjectState } from '~/utilities/useGenericObjectState';

const useNotebookAccelerator = (
  notebook?: NotebookKind | Notebook | null,
): GenericObjectState<AcceleratorState> => {
  const acceleratorName = notebook?.metadata.annotations?.['opendatahub.io/accelerator-name'];
  const resources = notebook?.spec.template.spec.containers.find(
    (container) => container.name === notebook.metadata.name,
  )?.resources;
  const tolerations = notebook?.spec.template.spec.tolerations;

  return useAcceleratorState(resources, tolerations, acceleratorName);
};

export default useNotebookAccelerator;
