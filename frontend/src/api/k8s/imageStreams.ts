import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  K8sStatus,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { ImageStreamKind, K8sAPIOptions } from '#~/k8sTypes.ts';
import { applyK8sAPIOptions } from '#~/api/apiMergeUtils.ts';
import { ImageStreamModel } from '#~/api';
import {
  buildLabelSelector,
  findNameConflict,
  mapImageStreamToBYONImage,
  packagesToString,
  parseImageURL,
} from '#~/utilities/imageStreamUtils.ts';
import { BYONImage } from '#~/types.ts';
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

// TODO: Replace hardcoded labels
export const assembleImageStream = (
  namespace: string,
  image: Partial<BYONImage> & Pick<BYONImage, 'url' | 'display_name'>,
): ImageStreamKind => {
  const name = image.name || `custom-${translateDisplayNameForK8s(image.display_name)}`;
  const { fullURL, tag } = parseImageURL(image.url);

  const labels: Record<string, string> = {
    'app.kubernetes.io/created-by': 'byon',
    'opendatahub.io/notebook-image': 'true',
    'opendatahub.io/dashboard': 'true',
  };

  const annotations: Record<string, string> = {
    'opendatahub.io/notebook-image-name': image.display_name,
    ...(fullURL && { 'opendatahub.io/notebook-image-url': fullURL }),
    ...(image.description && { 'opendatahub.io/notebook-image-desc': image.description }),
    ...(image.provider && { 'opendatahub.io/notebook-image-creator': image.provider }),
    ...(image.recommendedAcceleratorIdentifiers && {
      'opendatahub.io/recommended-accelerators': JSON.stringify(
        image.recommendedAcceleratorIdentifiers,
      ),
    }),
  };

  const tagAnnotations: Record<string, string> = {
    ...(fullURL && { 'openshift.io/imported-from': fullURL }),
    ...(image.software &&
      image.software.length > 0 && {
        'opendatahub.io/notebook-software': packagesToString(image.software),
      }),
    ...(image.packages &&
      image.packages.length > 0 && {
        'opendatahub.io/notebook-python-dependencies': packagesToString(image.packages),
      }),
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

export const createImageStream = async (
  namespace: string,
  image: Partial<BYONImage> & Pick<BYONImage, 'display_name' | 'url'>, // TODO: get all the required fields
): Promise<ImageStreamKind> => {
  const labels: Record<string, string> = {
    'app.kubernetes.io/created-by': 'byon',
    'opendatahub.io/notebook-image': 'true',
    'opendatahub.io/dashboard': 'true',
  };

  const name = image.name || `custom-${translateDisplayNameForK8s(image.display_name)}`;
  const imageStreams = await listImageStreams(namespace, labels);
  const conflict = findNameConflict(imageStreams, image.display_name);
  if (conflict) {
    throw new Error(`Duplicated name. Unable to add notebook image: ${image.display_name}`);
  }
  const isExistingImage = imageStreams.some((imageStream) => imageStream.metadata.name === name);
  if (isExistingImage) {
    throw new Error(`Duplicated name. Unable to add notebook image: ${image.display_name}`);
  }

  const payload: ImageStreamKind = assembleImageStream(namespace, image);

  return k8sCreateResource<ImageStreamKind>({
    model: ImageStreamModel,
    resource: payload,
  });
};

export const updateImageStream = async (
  namespace: string,
  image: Partial<BYONImage> & Pick<BYONImage, 'name' | 'display_name'>,
  opts?: K8sAPIOptions,
): Promise<ImageStreamKind> => {
  const labels = {
    'app.kubernetes.io/created-by': 'byon',
    'opendatahub.io/notebook-image': 'true',
  };

  const imageStreams = await listImageStreams(namespace, labels);
  const conflict = findNameConflict(imageStreams, image.display_name, image.name);
  if (conflict) {
    throw new Error(`Duplicate name. Unable to update notebook image: ${image.display_name}`);
  }

  const current = await getImageStream(namespace, image.name);

  const assembled = assembleImageStream(namespace, {
    ...mapImageStreamToBYONImage(current),
    ...image,
  });

  current.metadata.annotations = {
    ...current.metadata.annotations,
    ...(assembled.metadata.annotations ?? {}),
  };

  if (assembled.metadata.labels?.['opendatahub.io/notebook-image']) {
    current.metadata.labels = {
      ...current.metadata.labels,
      'opendatahub.io/notebook-image': assembled.metadata.labels['opendatahub.io/notebook-image'],
    };
  }

  const tag = current.spec.tags?.[0];
  const assembledTag = assembled.spec.tags?.[0];
  if (tag?.annotations && assembledTag?.annotations) {
    if (assembledTag.annotations['opendatahub.io/notebook-python-dependencies']) {
      tag.annotations['opendatahub.io/notebook-python-dependencies'] =
        assembledTag.annotations['opendatahub.io/notebook-python-dependencies'];
    }
    if (assembledTag.annotations['opendatahub.io/notebook-software']) {
      tag.annotations['opendatahub.io/notebook-software'] =
        assembledTag.annotations['opendatahub.io/notebook-software'];
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
