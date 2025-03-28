import { ImageStreamKind, ImageStreamSpecTagType, NotebookKind } from '~/k8sTypes';
import { PodContainer } from '~/types';

export const getCurrentAndLatestNotebookImageVersionData = (
  notebook: NotebookKind,
  images: ImageStreamKind[],
): {
  currentImageVersion: ImageStreamSpecTagType;
  latestImageVersion: ImageStreamSpecTagType;
  imageStream: ImageStreamKind;
} | null => {
  const container: PodContainer | undefined = notebook.spec.template.spec.containers.find(
    (currentContainer) => currentContainer.name === notebook.metadata.name,
  );
  const imageTag = container?.image.split('/').at(-1)?.split(':');

  // if image could not be parsed from the container, consider it deleted because the image tag is invalid
  if (!imageTag || imageTag.length < 2 || !container) {
    return null;
  }

  const [imageName, versionName] = imageTag;
  const [lastImageSelectionName, lastImageSelectionTag] =
    notebook.metadata.annotations?.['notebooks.opendatahub.io/last-image-selection']?.split(':') ??
    [];

  const notebookImageInternalRegistry = getNotebookImageInternalRegistry(
    images,
    imageName,
    versionName,
  );
  if (notebookImageInternalRegistry) {
    return notebookImageInternalRegistry;
  }
  const notebookImageNoInternalRegistry = getNotebookImageNoInternalRegistry(
    images,
    lastImageSelectionName,
    container.image,
  );
  if (notebookImageNoInternalRegistry) {
    return notebookImageNoInternalRegistry;
  }
  const notebookImageNoInternalRegistryNoSHA = getNotebookImageNoInternalRegistryNoSHA(
    images,
    lastImageSelectionTag,
    container.image,
  );
  if (notebookImageNoInternalRegistryNoSHA) {
    return notebookImageNoInternalRegistryNoSHA;
  }
  return null;
};

const getNotebookImageInternalRegistry = (
  images: ImageStreamKind[],
  imageName: string,
  versionName: string,
): {
  currentImageVersion: ImageStreamSpecTagType;
  latestImageVersion: ImageStreamSpecTagType;
  imageStream: ImageStreamKind;
} | null => {
  const imageStream = images.find((image) => image.metadata.name === imageName);
  const versions = imageStream?.spec.tags || [];
  const currentImageVersion = versions.find((version) => version.name === versionName);
  const latestImageVersion = versions.find(
    (version) => version.annotations?.['opendatahub.io/workbench-image-recommended'] === 'true',
  );
  if (!currentImageVersion || !latestImageVersion || !imageStream) {
    return null;
  }
  return { currentImageVersion, latestImageVersion, imageStream };
};

const getNotebookImageNoInternalRegistry = (
  images: ImageStreamKind[],
  lastImageSelectionName: string,
  containerImage: string,
): {
  currentImageVersion: ImageStreamSpecTagType;
  latestImageVersion: ImageStreamSpecTagType;
  imageStream: ImageStreamKind;
} | null => {
  const imageStream = images.find(
    (image) =>
      image.metadata.name === lastImageSelectionName &&
      image.spec.tags?.find((version) => version.from?.name === containerImage),
  );

  const versions = imageStream?.spec.tags || [];

  const currentImageVersion = versions.find((version) => version.from?.name === containerImage);
  const latestImageVersion = versions.find(
    (version) => version.annotations?.['opendatahub.io/workbench-image-recommended'] === 'true',
  );

  if (!currentImageVersion || !latestImageVersion || !imageStream) {
    return null;
  }

  return { currentImageVersion, latestImageVersion, imageStream };
};

const getNotebookImageNoInternalRegistryNoSHA = (
  images: ImageStreamKind[],
  lastImageSelectionTag: string,
  containerImage: string,
): {
  currentImageVersion: ImageStreamSpecTagType;
  latestImageVersion: ImageStreamSpecTagType;
  imageStream: ImageStreamKind;
} | null => {
  const imageStream = images.find((image) =>
    image.status?.tags?.find(
      (version) =>
        version.tag === lastImageSelectionTag &&
        version.items?.find((item) => item.dockerImageReference === containerImage),
    ),
  );

  const versions = imageStream?.spec.tags || [];
  const currentImageVersion = versions.find((version) => version.name === lastImageSelectionTag);
  const latestImageVersion = versions.find(
    (version) => version.annotations?.['opendatahub.io/workbench-image-recommended'] === 'true',
  );

  if (!currentImageVersion || !latestImageVersion || !imageStream) {
    return null;
  }

  return { currentImageVersion, latestImageVersion, imageStream };
};
