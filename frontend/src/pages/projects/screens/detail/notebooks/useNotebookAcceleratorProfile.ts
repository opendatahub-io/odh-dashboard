import { NotebookKind } from '~/k8sTypes';
import { Notebook } from '~/types';
import useAcceleratorProfileState, {
  AcceleratorProfileState,
} from '~/utilities/useAcceleratorProfileState';

const useNotebookAcceleratorProfile = (
  notebook?: NotebookKind | Notebook | null,
): AcceleratorProfileState => {
  const name = notebook?.metadata.annotations?.['opendatahub.io/accelerator-name'];
  const resources = notebook?.spec.template.spec.containers.find(
    (container) => container.name === notebook.metadata.name,
  )?.resources;
  const tolerations = notebook?.spec.template.spec.tolerations;

  return useAcceleratorProfileState(resources, tolerations, name);
};

export default useNotebookAcceleratorProfile;
