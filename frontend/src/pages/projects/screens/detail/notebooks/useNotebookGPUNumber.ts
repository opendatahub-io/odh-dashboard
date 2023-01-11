import { NotebookKind } from '../../../../../k8sTypes';
import { NotebookContainer } from '../../../../../types';
import { LIMIT_NOTEBOOK_IMAGE_GPU } from '../../../../../utilities/const';

const useNotebookGPUNumber = (notebook?: NotebookKind): number => {
  const container: NotebookContainer | undefined = notebook?.spec.template.spec.containers.find(
    (container) => container.name === notebook.metadata.name,
  );

  const gpuNumbers = container?.resources?.limits?.[LIMIT_NOTEBOOK_IMAGE_GPU];

  return gpuNumbers || 0;
};

export default useNotebookGPUNumber;
