import { NotebookKind } from '~/k8sTypes';
import {
  getImageStreamDisplayName,
  getImageVersionDependencies,
  getImageVersionSoftwareString,
} from '~/pages/projects/screens/spawner/spawnerUtils';
import useNotebookImageData from './useNotebookImageData';
import { NotebookImageAvailability } from './const';
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

  const { imageDisplayName, imageAvailability } = data;

  // if the image is deleted, return the image name if it is available (based on notebook annotations)
  if (imageAvailability === NotebookImageAvailability.DELETED) {
    return [
      {
        imageDisplayName,
        imageAvailability,
      },
      true,
      undefined,
    ];
  }

  const { imageStream, imageVersion } = data;

  return [
    {
      imageDisplayName: getImageStreamDisplayName(imageStream),
      tagSoftware: getImageVersionSoftwareString(imageVersion),
      dependencies: getImageVersionDependencies(imageVersion, false),
      imageAvailability,
    },
    true,
    undefined,
  ];
};

export default useNotebookImage;
