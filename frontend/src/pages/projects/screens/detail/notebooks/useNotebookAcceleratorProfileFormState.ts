import { NotebookKind } from '~/k8sTypes';
import { Notebook } from '~/types';
import useAcceleratorProfileFormState, {
  UseAcceleratorProfileFormResult,
} from '~/utilities/useAcceleratorProfileFormState';

const useNotebookAcceleratorProfileFormState = (
  notebook?: NotebookKind | Notebook | null,
): UseAcceleratorProfileFormResult => {
  const name = notebook?.metadata.annotations?.['opendatahub.io/accelerator-name'];
  const resources = notebook?.spec.template.spec.containers.find(
    (container) => container.name === notebook.metadata.name,
  )?.resources;
  const tolerations = notebook?.spec.template.spec.tolerations;

  return useAcceleratorProfileFormState(resources, tolerations, name);
};

export default useNotebookAcceleratorProfileFormState;
