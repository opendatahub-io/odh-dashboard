import { NotebookKind } from '../../../../../k8sTypes';
import { GPUCount, NotebookContainer } from '../../../../../types';

const useNotebookGPUNumber = (notebook?: NotebookKind): GPUCount => {
  const container: NotebookContainer | undefined = notebook?.spec.template.spec.containers.find(
    (container) => container.name === notebook.metadata.name,
  );

  const gpuNumbers = container?.resources?.limits?.['nvidia.com/gpu'];

  return gpuNumbers || 0;
};

export default useNotebookGPUNumber;
