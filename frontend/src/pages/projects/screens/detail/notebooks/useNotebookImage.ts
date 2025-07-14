import { NotebookKind } from '#~/k8sTypes';
import {
  getImageStreamDisplayName,
  getImageVersionDependencies,
  getImageVersionSoftwareString,
} from '#~/pages/projects/screens/spawner/spawnerUtils';
import useNotebookImageData from './useNotebookImageData';
import { NotebookImageStatus } from './const';
import { NotebookImage } from './types';

const useNotebookImage = (
  notebook: NotebookKind | undefined,
):
  | [notebookImage: null, loaded: false, loadError?: Error]
  | [notebookImage: NotebookImage, loaded: true, loadError: undefined] => {
  const [data, loaded, loadError] = useNotebookImageData(notebook);

  if (!notebook || !loaded) {
    return [null, false, loadError];
  }

  const { imageDisplayName, imageStatus } = data;

  // if the image is deleted, return the image name if it is available (based on notebook annotations)
  if (imageStatus === NotebookImageStatus.DELETED) {
    return [
      {
        imageDisplayName,
        imageStatus,
      },
      true,
      undefined,
    ];
  }

  const { imageStream, imageAvailability, imageVersion, latestImageVersion } = data;

  return [
    {
      imageDisplayName: getImageStreamDisplayName(imageStream),
      tagSoftware: getImageVersionSoftwareString(imageVersion),
      dependencies: getImageVersionDependencies(imageVersion, false),
      imageAvailability,
      imageStatus,
      imageStream,
      imageVersion,
      latestImageVersion,
    },
    true,
    undefined,
  ];
};

export default useNotebookImage;
