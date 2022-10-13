import { NotebookContainer } from '../../../../../types';
import { NotebookKind } from '../../../../../k8sTypes';
import useImageStreams from '../../spawner/useImageStreams';
import {
  getImageStreamDisplayName,
  getImageVersionDependencies,
  getRelatedVersionDescription,
} from '../../spawner/spawnerUtils';
import useNamespaces from '../../../../notebookController/useNamespaces';
import { ImageVersionDependencyType } from '../../spawner/types';

export type WorkspaceImage = {
  imageName: string;
  tagSoftware?: string;
  dependencies: ImageVersionDependencyType[];
};

const useWorkspaceImage = (
  notebook: NotebookKind,
): [workspaceImage: WorkspaceImage | null, loaded: boolean] => {
  const { dashboardNamespace } = useNamespaces();
  const [images, loaded] = useImageStreams(dashboardNamespace);

  if (!loaded) {
    return [null, false];
  }

  const container: NotebookContainer | undefined = notebook?.spec.template.spec.containers.find(
    (container) => container.name === notebook.metadata.name,
  );
  const imageTag = container?.image.split('/').at(-1)?.split(':');

  if (!imageTag || imageTag.length < 2 || !container) {
    return [null, true];
  }

  const [imageName, versionName] = imageTag;
  const imageStream = images.find((image) => image.metadata.name === imageName);

  if (!imageStream) {
    return [null, true];
  }

  const versions = imageStream.spec.tags || [];
  const imageVersion = versions.find((version) => version.name === versionName);

  if (!imageVersion) {
    return [null, true];
  }

  return [
    {
      imageName: getImageStreamDisplayName(imageStream),
      tagSoftware: getRelatedVersionDescription(imageStream),
      dependencies: getImageVersionDependencies(imageVersion, false),
    },
    loaded,
  ];
};

export default useWorkspaceImage;
