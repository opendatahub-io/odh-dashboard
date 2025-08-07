import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  K8sStatus,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { ImageStreamKind, K8sAPIOptions, KnownLabels } from '#~/k8sTypes.ts';
import { applyK8sAPIOptions } from '#~/api/apiMergeUtils.ts';
import { ImageStreamModel } from '#~/api';
import {
  buildLabelSelector,
  byonDuplicatedErrorMessage,
  hasConflictName,
  mapImageStreamToBYONImage,
  packagesToString,
  parseImageURL,
} from '#~/utilities/imageStreamUtils.ts';
import {
  BYONImage,
  ImageStreamAnnotation,
  ImageStreamLabel,
  ImageStreamSpecTagAnnotation,
} from '#~/types.ts';
import { kindApiVersion, translateDisplayNameForK8s } from '#~/concepts/k8s/utils.ts';

export const listImageStreams = async (
  namespace?: string,
  labels?: string | Record<string, string>,
  opts?: K8sAPIOptions,
): Promise<ImageStreamKind[]> => {
  const queryOptions = {
    ...(namespace && { ns: namespace }),
    ...(labels && {
      queryParams: {
        labelSelector: buildLabelSelector(labels),
      },
    }),
  };

  const listResource = await k8sListResource<ImageStreamKind>(
    applyK8sAPIOptions(
      {
        model: ImageStreamModel,
        queryOptions,
      },
      opts,
    ),
  );
  return listResource.items;
};

export const getImageStream = (namespace: string, name: string): Promise<ImageStreamKind> =>
  k8sGetResource<ImageStreamKind>({
    model: ImageStreamModel,
    queryOptions: { name, ns: namespace },
  });

export const deleteImageStream = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<ImageStreamKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: ImageStreamModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );

export const assembleBYONImageStream = (
  namespace: string,
  image: Partial<BYONImage> & Pick<BYONImage, 'url' | 'display_name'>,
): ImageStreamKind => {
  const name = image.name || `custom-${translateDisplayNameForK8s(image.display_name)}`;
  const { fullURL, tag } = parseImageURL(image.url);

  const labels: Record<string, string> = {
    [ImageStreamLabel.IMAGE_TYPE]: 'byon',
    [ImageStreamLabel.NOTEBOOK]: image.visible !== undefined ? image.visible.toString() : 'true',
    [KnownLabels.DASHBOARD_RESOURCE]: 'true',
  };

  const annotations: Record<string, string> = {
    [ImageStreamAnnotation.DISP_NAME]: image.display_name,
    ...(fullURL && { [ImageStreamAnnotation.URL]: fullURL }),
    [ImageStreamAnnotation.DESC]: image.description || '',
    ...(image.provider && { [ImageStreamAnnotation.CREATOR]: image.provider }),
    ...(image.recommendedAcceleratorIdentifiers && {
      [ImageStreamAnnotation.RECOMMENDED_ACCELERATORS]: JSON.stringify(
        image.recommendedAcceleratorIdentifiers,
      ),
    }),
  };

  const tagAnnotations: Record<string, string> = {
    ...(fullURL && { [ImageStreamSpecTagAnnotation.IMPORT_URL]: fullURL }),
    [ImageStreamSpecTagAnnotation.SOFTWARE]: packagesToString(image.software || []),
    [ImageStreamSpecTagAnnotation.DEPENDENCIES]: packagesToString(image.packages || []),
  };

  return {
    apiVersion: kindApiVersion(ImageStreamModel),
    kind: ImageStreamModel.kind,
    metadata: {
      name,
      namespace,
      labels,
      annotations,
    },
    spec: {
      lookupPolicy: { local: true },
      tags: [
        {
          name: tag ?? 'latest',
          ...(fullURL && { from: { kind: 'DockerImage', name: fullURL } }),
          annotations: tagAnnotations,
        },
      ],
    },
  };
};

export const createBYONImageStream = async (
  namespace: string,
  image: Partial<BYONImage> & Pick<BYONImage, 'display_name' | 'url'>,
): Promise<ImageStreamKind> => {
  const labels: Record<string, string> = {
    [ImageStreamLabel.IMAGE_TYPE]: 'byon',
    [ImageStreamLabel.NOTEBOOK]: 'true',
    [KnownLabels.DASHBOARD_RESOURCE]: 'true',
  };

  const name = image.name || `custom-${translateDisplayNameForK8s(image.display_name)}`;
  const imageStreams = await listImageStreams(namespace, labels);
  const conflict = hasConflictName(imageStreams, image.display_name);
  if (conflict) {
    throw new Error(byonDuplicatedErrorMessage(image));
  }
  const isExistingImage = imageStreams.some((imageStream) => imageStream.metadata.name === name);
  if (isExistingImage) {
    throw new Error(byonDuplicatedErrorMessage(image));
  }

  const payload: ImageStreamKind = assembleBYONImageStream(namespace, image);

  return k8sCreateResource<ImageStreamKind>({
    model: ImageStreamModel,
    resource: payload,
  });
};

export const updateBYONImageStream = async (
  namespace: string,
  image: Partial<BYONImage> & Pick<BYONImage, 'name'>,
  opts?: K8sAPIOptions,
): Promise<ImageStreamKind> => {
  const labels = {
    [ImageStreamLabel.IMAGE_TYPE]: 'byon',
    [ImageStreamLabel.NOTEBOOK]: 'true',
  };

  const imageStreams = await listImageStreams(namespace, labels);
  if (image.display_name) {
    const hasConflict = hasConflictName(imageStreams, image.display_name, image.name);
    if (hasConflict) {
      throw new Error(`Duplicate name. Unable to update notebook image: ${image.display_name}`);
    }
  }

  const current = await getImageStream(namespace, image.name);

  const assembled = assembleBYONImageStream(namespace, {
    ...mapImageStreamToBYONImage(current),
    ...image,
  });

  current.metadata.annotations = {
    ...current.metadata.annotations,
    ...(assembled.metadata.annotations ?? {}),
  };

  if (assembled.metadata.labels?.[ImageStreamLabel.NOTEBOOK]) {
    current.metadata.labels = {
      ...current.metadata.labels,
      [ImageStreamLabel.NOTEBOOK]: assembled.metadata.labels[ImageStreamLabel.NOTEBOOK],
    };
  }

  const tag = current.spec.tags?.[0];
  const assembledTag = assembled.spec.tags?.[0];
  if (tag?.annotations && assembledTag?.annotations) {
    if (assembledTag.annotations[ImageStreamSpecTagAnnotation.DEPENDENCIES]) {
      tag.annotations[ImageStreamSpecTagAnnotation.DEPENDENCIES] =
        assembledTag.annotations[ImageStreamSpecTagAnnotation.DEPENDENCIES];
    }
    if (assembledTag.annotations[ImageStreamSpecTagAnnotation.SOFTWARE]) {
      tag.annotations[ImageStreamSpecTagAnnotation.SOFTWARE] =
        assembledTag.annotations[ImageStreamSpecTagAnnotation.SOFTWARE];
    }
  }

  return k8sUpdateResource<ImageStreamKind>(
    applyK8sAPIOptions(
      {
        model: ImageStreamModel,
        resource: current,
      },
      opts,
    ),
  );
};
