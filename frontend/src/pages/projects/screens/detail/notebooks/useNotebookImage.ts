import { NotebookKind } from '~/k8sTypes';
import {
  getImageStreamDisplayName,
  getImageVersionDependencies,
  getRelatedVersionDescription,
} from '~/pages/projects/screens/spawner/spawnerUtils';
import { ImageVersionDependencyType } from '~/pages/projects/screens/spawner/types';
import useNotebookImageData from './useNotebookImageData';

export type NotebookImage = {
  imageName: string;
  tagSoftware?: string;
  dependencies: ImageVersionDependencyType[];
};

const useNotebookImage = (
  notebook: NotebookKind,
): [notebookImage: NotebookImage | null, loaded: boolean] => {
  const [imageData, loaded] = useNotebookImageData(notebook);

  if (!imageData) {
    return [null, loaded];
  }

  const { imageStream, imageVersion } = imageData;

  return [
    {
      imageName: getImageStreamDisplayName(imageStream),
      tagSoftware: getRelatedVersionDescription(imageStream),
      dependencies: getImageVersionDependencies(imageVersion, false),
    },
    loaded,
  ];
};

export default useNotebookImage;
