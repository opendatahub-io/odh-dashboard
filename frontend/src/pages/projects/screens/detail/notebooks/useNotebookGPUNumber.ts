import { NotebookKind } from '~/k8sTypes';
import { ContainerResourceAttributes, GPUCount, PodContainer } from '~/types';

const useNotebookGPUNumber = (notebook?: NotebookKind): GPUCount => {
  const container: PodContainer | undefined = notebook?.spec.template.spec.containers.find(
    (container) => container.name === notebook.metadata.name,
  );

  const gpuNumbers = container?.resources?.limits?.[ContainerResourceAttributes.NVIDIA_GPU];

  return gpuNumbers || 0;
};

export default useNotebookGPUNumber;
