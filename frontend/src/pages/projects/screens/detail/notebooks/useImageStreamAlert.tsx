import { getImageStatus } from '~/concepts/notebooks/getImageStatus';
import { NotebookKind } from '~/k8sTypes';
import useNamespaces from '~/pages/notebookController/useNamespaces';
import useImageStreams from '~/pages/projects/screens/spawner/useImageStreams';
import { ImageStreamStatus } from '~/concepts/notebooks/types';
import { getNotebookImageData } from './useNotebookImageData';
import { NotebookImageAvailability } from './const';

export const useImageStreamAlert = (
  notebook: NotebookKind | undefined,
):
  | [notebookImageStatus: null, loaded: false, loadError?: Error]
  | [
      notebookImageStatus: ImageStreamStatus | NotebookImageAvailability | null,
      loaded: true,
      loadError: undefined,
    ] => {
  const { dashboardNamespace } = useNamespaces();
  const [images, loaded, loadError] = useImageStreams(dashboardNamespace, true);

  if (!notebook || !loaded) {
    return [null, false, loadError];
  }

  const imageData = getNotebookImageData(notebook, images);
  const notebookImageStatus = getImageStatus(imageData);

  return [notebookImageStatus ?? null, true, undefined];
};
