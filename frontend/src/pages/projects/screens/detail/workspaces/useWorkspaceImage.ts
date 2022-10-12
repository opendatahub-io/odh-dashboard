import { getDescriptionForTag, getImageTagByContainer } from '../../../../../utilities/imageUtils';
import { useWatchImages } from '../../../../../utilities/useWatchImages';
import { NameVersionPair, NotebookContainer } from '../../../../../types';
import { NotebookKind } from '../../../../../k8sTypes';

export type WorkspaceImage = {
  imageName: string;
  tagSoftware: string;
  packages: NameVersionPair[];
};

const useWorkspaceImage = (
  notebook: NotebookKind,
): [workspaceImage: WorkspaceImage | null, loaded: boolean] => {
  const { images, loaded } = useWatchImages();

  if (!loaded) {
    return [null, false];
  }

  const container: NotebookContainer | undefined = notebook?.spec.template.spec.containers.find(
    (container) => container.name === notebook.metadata.name,
  );
  const { image, tag } = getImageTagByContainer(images, container);
  const packages = tag?.content.dependencies ?? [];
  const tagSoftware = getDescriptionForTag(tag);

  if (!image) {
    return [null, true];
  }

  return [{ imageName: image.display_name, tagSoftware, packages }, loaded];
};

export default useWorkspaceImage;
