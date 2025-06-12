import * as React from 'react';
import { ImageStreamKind, ImageStreamSpecTagType, NotebookKind } from '#~/k8sTypes';
import useNamespaces from '#~/pages/notebookController/useNamespaces';
import useImageStreams from '#~/pages/projects/screens/spawner/useImageStreams';
import { PodContainer } from '#~/types';
import {
  getImageStreamDisplayName,
  isBYONImageStream,
} from '#~/pages/projects/screens/spawner/spawnerUtils';
import { NotebookImageAvailability, NotebookImageStatus } from './const';
import { NotebookImageData } from './types';

export const getNotebookImageData = (
  notebook: NotebookKind,
  images: ImageStreamKind[],
): NotebookImageData[0] => {
  const container: PodContainer | undefined = notebook.spec.template.spec.containers.find(
    (currentContainer) => currentContainer.name === notebook.metadata.name,
  );
  const imageTag = container?.image.split('/').at(-1)?.split(':');
  // if image could not be parsed from the container, consider it deleted because the image tag is invalid
  if (!imageTag || imageTag.length < 2 || !container) {
    return {
      imageStatus: NotebookImageStatus.DELETED,
    };
  }

  const [imageName, versionName] = imageTag;
  const [lastImageSelectionName, lastImageSelectionTag] =
    notebook.metadata.annotations?.['notebooks.opendatahub.io/last-image-selection']?.split(':') ??
    [];

  const notebookImageInternalRegistry = getNotebookImageInternalRegistry(
    notebook,
    images,
    imageName,
    versionName,
  );
  if (
    notebookImageInternalRegistry &&
    notebookImageInternalRegistry.imageStatus !== NotebookImageStatus.DELETED
  ) {
    return notebookImageInternalRegistry;
  }
  const notebookImageNoInternalRegistry = getNotebookImageNoInternalRegistry(
    notebook,
    images,
    lastImageSelectionName,
    container.image,
  );
  if (
    notebookImageNoInternalRegistry &&
    notebookImageNoInternalRegistry.imageStatus !== NotebookImageStatus.DELETED
  ) {
    return notebookImageNoInternalRegistry;
  }
  const notebookImageNoInternalRegistryNoSHA = getNotebookImageNoInternalRegistryNoSHA(
    notebook,
    images,
    lastImageSelectionTag,
    container.image,
  );
  if (
    notebookImageNoInternalRegistryNoSHA &&
    notebookImageNoInternalRegistryNoSHA.imageStatus !== NotebookImageStatus.DELETED
  ) {
    return notebookImageNoInternalRegistryNoSHA;
  }
  return {
    imageStatus: NotebookImageStatus.DELETED,
    imageDisplayName:
      notebookImageInternalRegistry?.imageDisplayName ||
      notebookImageNoInternalRegistry?.imageDisplayName ||
      notebookImageNoInternalRegistryNoSHA?.imageDisplayName,
  };
};

const useNotebookImageData = (notebook?: NotebookKind): NotebookImageData => {
  const { dashboardNamespace } = useNamespaces();
  const namespace = notebook?.metadata.annotations?.['opendatahub.io/workbench-image-namespace']
    ? notebook.metadata.annotations['opendatahub.io/workbench-image-namespace']
    : dashboardNamespace;
  const [images, loaded, loadError] = useImageStreams(namespace, true);

  return React.useMemo(() => {
    if (!notebook || !loaded) {
      return [null, false, loadError];
    }

    const data = getNotebookImageData(notebook, images);

    if (data === null) {
      return [null, false, loadError];
    }

    return [data, true, undefined];
  }, [notebook, loaded, images, loadError]);
};

const getNotebookImageInternalRegistry = (
  notebook: NotebookKind,
  images: ImageStreamKind[],
  imageName: string,
  versionName: string,
): NotebookImageData[0] => {
  const imageStream = images.find((image) => image.metadata.name === imageName);

  if (!imageStream || isNotebookImageDeleted(notebook, imageStream)) {
    // Get the image display name from the notebook metadata if we can't find the image stream. (this is a fallback and could still be undefined)
    return getDeletedImageData(
      notebook.metadata.annotations?.['opendatahub.io/image-display-name'],
    );
  }

  const versions = imageStream.spec.tags || [];
  const imageVersion = versions.find((version) => version.name === versionName);
  const imageDisplayName = getImageStreamDisplayName(imageStream);
  if (!imageVersion) {
    return getDeletedImageData(imageDisplayName);
  }
  const imageAvailability = getImageAvailability(imageStream);
  const imageStatus = getImageStatus(imageVersion);
  const latestImageVersion = versions.find(
    (version) => version.annotations?.['opendatahub.io/workbench-image-recommended'] === 'true',
  );
  return {
    imageStream,
    imageVersion,
    imageAvailability,
    imageDisplayName,
    latestImageVersion,
    imageStatus,
  };
};

const getNotebookImageNoInternalRegistry = (
  notebook: NotebookKind,
  images: ImageStreamKind[],
  lastImageSelectionName: string,
  containerImage: string,
): NotebookImageData[0] => {
  const imageStream = images.find(
    (image) =>
      image.metadata.name === lastImageSelectionName &&
      image.spec.tags?.find((version) => version.from?.name === containerImage),
  );

  if (!imageStream || isNotebookImageDeleted(notebook, imageStream)) {
    // Get the image display name from the notebook metadata if we can't find the image stream. (this is a fallback and could still be undefined)
    return getDeletedImageData(
      notebook.metadata.annotations?.['opendatahub.io/image-display-name'],
    );
  }

  const versions = imageStream.spec.tags || [];
  const imageVersion = versions.find((version) => version.from?.name === containerImage);
  const imageDisplayName = getImageStreamDisplayName(imageStream);
  if (!imageVersion) {
    return getDeletedImageData(imageDisplayName);
  }
  const imageAvailability = getImageAvailability(imageStream);
  const imageStatus = getImageStatus(imageVersion);
  const latestImageVersion = versions.find(
    (version) => version.annotations?.['opendatahub.io/workbench-image-recommended'] === 'true',
  );
  return {
    imageStream,
    imageVersion,
    imageAvailability,
    imageDisplayName,
    latestImageVersion,
    imageStatus,
  };
};

const getNotebookImageNoInternalRegistryNoSHA = (
  notebook: NotebookKind,
  images: ImageStreamKind[],
  lastImageSelectionTag: string,
  containerImage: string,
): NotebookImageData[0] => {
  const imageStream = images.find((image) =>
    image.status?.tags?.find(
      (version) =>
        version.tag === lastImageSelectionTag &&
        version.items?.find((item) => item.dockerImageReference === containerImage),
    ),
  );

  if (!imageStream || isNotebookImageDeleted(notebook, imageStream)) {
    // Get the image display name from the notebook metadata if we can't find the image stream. (this is a fallback and could still be undefined)
    return getDeletedImageData(
      notebook.metadata.annotations?.['opendatahub.io/image-display-name'],
    );
  }

  const versions = imageStream.spec.tags || [];
  const imageVersion = versions.find((version) => version.name === lastImageSelectionTag);
  const imageDisplayName = getImageStreamDisplayName(imageStream);
  if (!imageVersion) {
    return getDeletedImageData(imageDisplayName);
  }
  const imageAvailability = getImageAvailability(imageStream);
  const imageStatus = getImageStatus(imageVersion);
  const latestImageVersion = versions.find(
    (version) => version.annotations?.['opendatahub.io/workbench-image-recommended'] === 'true',
  );
  return {
    imageStream,
    imageVersion,
    imageAvailability,
    imageDisplayName,
    latestImageVersion,
    imageStatus,
  };
};

export const getImageAvailability = (imageStream: ImageStreamKind): NotebookImageAvailability =>
  imageStream.metadata.labels?.['opendatahub.io/notebook-image'] === 'true'
    ? NotebookImageAvailability.ENABLED
    : NotebookImageAvailability.DISABLED;

export const getDeletedImageData = (
  imageDisplayName: string | undefined,
): NotebookImageData[0] => ({
  imageStatus: NotebookImageStatus.DELETED,
  imageDisplayName,
});

const getImageStatus = (imageVersion: ImageStreamSpecTagType): NotebookImageStatus | undefined => {
  if (imageVersion.annotations?.['opendatahub.io/image-tag-outdated'] === 'true') {
    return NotebookImageStatus.DEPRECATED;
  }
  if (imageVersion.annotations?.['opendatahub.io/workbench-image-recommended'] === 'true') {
    return NotebookImageStatus.LATEST;
  }
  return undefined;
};

const isNotebookImageDeleted = (notebook: NotebookKind, imageStream: ImageStreamKind) =>
  !findNotebookImageCommit(notebook, imageStream) && !isBYONImageStream(imageStream);

const findNotebookImageCommit = (notebook: NotebookKind, imageStream: ImageStreamKind) =>
  imageStream.spec.tags?.some(
    (imageTags) =>
      imageTags.annotations?.['opendatahub.io/notebook-build-commit'] ===
      notebook.metadata.annotations?.[
        'notebooks.opendatahub.io/last-image-version-git-commit-selection'
      ],
  );

export default useNotebookImageData;
