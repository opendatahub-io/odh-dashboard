import { IMAGE_ANNOTATIONS } from '../../../utils/constants';
import { convertLabelsToString } from '../../../utils/componentUtils';
import { translateDisplayNameForK8s } from '../../../utils/resourceUtils';
import {
  ImageStreamTag,
  ImageTagInfo,
  ImageInfo,
  ImageStream,
  TagContent,
  KubeFastifyInstance,
  BYONImagePackage,
  BYONImage,
} from '../../../types';
import { FastifyRequest } from 'fastify';
import createError from 'http-errors';

export const IMAGE_URL_REGEXP =
  /^([\w.\-_]+(?::\d+|)(?=\/[a-z0-9._-]+\/[a-z0-9._-]+)|)(?:\/|)([a-z0-9.\-_]+(?:\/[a-z0-9.\-_]+|))(?::([\w.\-_]{1,127})|)/;

/**
 * This function uses a regex to match the image location string
 * The match result will return an array of 4 elements:
 * Full URL, host, repo/image and tag(if any)
 * @param imageString
 */
export const parseImageURL = (
  imageString: string,
): { fullURL: string; host: string; image: string; tag: string } => {
  const trimmedString = imageString.trim();
  const result = trimmedString.match(IMAGE_URL_REGEXP);
  if (!result) {
    return {
      fullURL: trimmedString,
      host: undefined,
      image: undefined,
      tag: undefined,
    };
  }
  return {
    fullURL: trimmedString,
    host: result[1],
    image: result[2],
    tag: result[3],
  };
};

export const getImageList = async (
  fastify: KubeFastifyInstance,
  labels: { [key: string]: string },
): Promise<BYONImage[] | ImageInfo[]> => {
  const imageStreamList = await Promise.resolve(getImageStreams(fastify, labels));
  // Return BYON structured response if BYON label is included
  if (labels['app.kubernetes.io/created-by'] === 'byon') {
    const BYONImageList: BYONImage[] = [
      ...imageStreamList.map((is) => mapImageStreamToBYONImage(is)),
    ];
    return BYONImageList;
  }
  // Return ImageInfo structure if request does not have BYON label
  else {
    const imageInfoList = imageStreamList.map((imageStream) => {
      return processImageInfo(imageStream);
    });
    return imageInfoList;
  }
};

const getImage = async (fastify: KubeFastifyInstance, imageName: string): Promise<ImageStream> => {
  return fastify.kube.customObjectsApi
    .getNamespacedCustomObject(
      'image.openshift.io',
      'v1',
      fastify.kube.namespace,
      'imagestreams',
      imageName,
    )
    .then((res) => {
      return res.body as ImageStream;
    });
};

export const getImageInfo = async (
  fastify: KubeFastifyInstance,
  imageName: string,
): Promise<ImageInfo> => {
  return getImage(fastify, imageName).then((res) => {
    return processImageInfo(res);
  });
};

const getImageStreams = async (
  fastify: KubeFastifyInstance,
  labels: { [key: string]: string },
): Promise<ImageStream[]> => {
  const labelString = convertLabelsToString(labels);
  const requestPromise = fastify.kube.customObjectsApi
    .listNamespacedCustomObject(
      'image.openshift.io',
      'v1',
      fastify.kube.namespace,
      'imagestreams',
      undefined,
      undefined,
      undefined,
      labelString,
    )
    .then((res) => {
      const list = (
        res?.body as {
          items: ImageStream[];
        }
      ).items;
      return list;
    })
    .catch((e) => {
      fastify.log.error(e);
      return [];
    });
  return await requestPromise;
};

const isBYONImage = (imageStream: ImageStream) =>
  imageStream.metadata.labels?.['app.kubernetes.io/created-by'] === 'byon';

const getBYONImageErrorMessage = (imageStream: ImageStream) => {
  // there will be always only 1 tag in the spec for BYON images
  // status tags could be more than one
  const activeTag = imageStream.status?.tags?.find(
    (statusTag) => statusTag.tag === imageStream.spec.tags?.[0].name,
  );
  return activeTag?.conditions?.[0]?.message;
};

export const processImageInfo = (imageStream: ImageStream): ImageInfo => {
  const annotations = imageStream.metadata.annotations || {};

  const imageInfo: ImageInfo = {
    name: imageStream.metadata.name,
    description: annotations[IMAGE_ANNOTATIONS.DESC] || '',
    url: annotations[IMAGE_ANNOTATIONS.URL] || '',
    display_name: annotations[IMAGE_ANNOTATIONS.DISP_NAME] || imageStream.metadata.name,
    tags: getTagInfo(imageStream),
    order: +annotations[IMAGE_ANNOTATIONS.IMAGE_ORDER] || 100,
    dockerImageRepo: imageStream.status?.dockerImageRepository || '',
    error: isBYONImage(imageStream) && getBYONImageErrorMessage(imageStream),
  };

  return imageInfo;
};

// Check for existence in status.tags
const checkTagExistence = (tag: ImageStreamTag, imageStream: ImageStream): boolean => {
  if (imageStream.status) {
    const tags = imageStream.status.tags;
    if (tags) {
      for (let i = 0; i < tags.length; i++) {
        if (tags[i].tag === tag.name) {
          return true;
        }
      }
    }
  }
  return false;
};

const getTagInfo = (imageStream: ImageStream): ImageTagInfo[] => {
  const tagInfoArray: ImageTagInfo[] = [];
  const tags = imageStream.spec.tags;
  if (!tags?.length) {
    console.error(`${imageStream.metadata.name} does not have any tags.`);
    return;
  }
  tags.forEach((tag) => {
    let tagAnnotations;
    if (tag.annotations != null) {
      tagAnnotations = tag.annotations;
    } else {
      tag.annotations = {};
      tagAnnotations = {};
    }
    if (!checkTagExistence(tag, imageStream)) {
      return; //Skip tag
    }
    if (tagAnnotations[IMAGE_ANNOTATIONS.OUTDATED]) {
      return; // tag is outdated - we want to keep it around for existing notebooks, not for new ones
    }

    //TODO: add build status
    const tagInfo: ImageTagInfo = {
      content: getTagContent(tag),
      name: tag.name,
      recommended: JSON.parse(tagAnnotations[IMAGE_ANNOTATIONS.RECOMMENDED] || 'false'),
      default: JSON.parse(tagAnnotations[IMAGE_ANNOTATIONS.DEFAULT] || 'false'),
    };
    tagInfoArray.push(tagInfo);
  });
  return tagInfoArray;
};

const getTagContent = (tag: ImageStreamTag): TagContent => {
  const content: TagContent = {
    software: jsonParsePackage(tag.annotations[IMAGE_ANNOTATIONS.SOFTWARE]),
    dependencies: jsonParsePackage(tag.annotations[IMAGE_ANNOTATIONS.DEPENDENCIES]),
  };
  return content;
};

const packagesToString = (packages: BYONImagePackage[]): string => {
  if (packages.length > 0) {
    let packageAsString = '[';
    packages.forEach((value, index) => {
      packageAsString = packageAsString + JSON.stringify(value);
      if (index !== packages.length - 1) {
        packageAsString = packageAsString + `,`;
      } else {
        packageAsString = packageAsString + ']';
      }
    });
    return packageAsString;
  }
  return '[]';
};
const mapImageStreamToBYONImage = (is: ImageStream): BYONImage => ({
  id: is.metadata.uid,
  name: is.metadata.name,
  display_name:
    is.metadata.annotations['opendatahub.io/notebook-image-name'] ||
    is.metadata.annotations['openshift.io/display-name'] ||
    is.metadata.name,
  description:
    is.metadata.annotations['opendatahub.io/notebook-image-desc'] ||
    is.metadata.annotations['openshift.io/description'] ||
    '',
  visible: is.metadata.labels['opendatahub.io/notebook-image'] === 'true',
  error: getBYONImageErrorMessage(is),
  packages: jsonParsePackage(
    is.spec.tags?.[0]?.annotations?.['opendatahub.io/notebook-python-dependencies'],
  ),
  software: jsonParsePackage(is.spec.tags?.[0]?.annotations?.['opendatahub.io/notebook-software']),
  imported_time: is.metadata.creationTimestamp,
  url: is.metadata.annotations['opendatahub.io/notebook-image-url'],
  provider: is.metadata.annotations['opendatahub.io/notebook-image-creator'],
  recommendedAcceleratorIdentifiers: jsonParseRecommendedIdentifiers(
    is.metadata.annotations['opendatahub.io/recommended-accelerators'],
  ),
});

export const postImage = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ success: boolean; error: string }> => {
  const customObjectsApi = fastify.kube.customObjectsApi;
  const namespace = fastify.kube.namespace;
  const body = request.body as BYONImage;
  const inputURL = body.url;
  const { fullURL, host, tag } = parseImageURL(inputURL);
  if (!host) {
    fastify.log.error('Invalid repository URL unable to add notebook image');
    return { success: false, error: 'Invalid repository URL: ' + fullURL };
  }
  const labels = {
    'app.kubernetes.io/created-by': 'byon',
    'opendatahub.io/notebook-image': 'true',
    'opendatahub.io/dashboard': 'true',
  };
  const imageStreams = (await getImageStreams(fastify, labels)) as ImageStream[];
  const name = body.name || `custom-${translateDisplayNameForK8s(body.display_name)}`;
  const existingImage = imageStreams.find((is) => is.metadata.name === name);

  if (existingImage) {
    fastify.log.error('Duplicate name unable to add notebook image');
    return {
      success: false,
      error: 'Duplicated name. Unable to add notebook image: ' + body.display_name,
    };
  }

  const payload: ImageStream = {
    kind: 'ImageStream',
    apiVersion: 'image.openshift.io/v1',
    metadata: {
      annotations: {
        'opendatahub.io/notebook-image-desc': body.description || '',
        'opendatahub.io/notebook-image-name': body.display_name,
        'opendatahub.io/notebook-image-url': fullURL,
        'opendatahub.io/notebook-image-creator': body.provider,
        'opendatahub.io/recommended-accelerators': JSON.stringify(
          body.recommendedAcceleratorIdentifiers ?? [],
        ),
      },
      name,
      namespace: namespace,
      labels: labels,
    },
    spec: {
      lookupPolicy: {
        local: true,
      },
      tags: [
        {
          annotations: {
            'opendatahub.io/notebook-software': packagesToString(body.software),
            'opendatahub.io/notebook-python-dependencies': packagesToString(body.packages),
            'openshift.io/imported-from': fullURL,
          },
          from: {
            kind: 'DockerImage',
            name: fullURL,
          },
          name: tag || 'latest',
        },
      ],
    },
  };

  try {
    await customObjectsApi.createNamespacedCustomObject(
      'image.openshift.io',
      'v1',
      namespace,
      'imagestreams',
      payload,
    );
    return { success: true, error: null };
  } catch (e) {
    if (e.response?.statusCode !== 404) {
      fastify.log.error(e, 'Unable to add notebook image');
      return { success: false, error: 'Unable to add notebook image: ' + e.response.body.message };
    }
  }
};

export const deleteImage = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ success: boolean; error: string }> => {
  const customObjectsApi = fastify.kube.customObjectsApi;
  const namespace = fastify.kube.namespace;
  const params = request.params as { image: string };

  try {
    await customObjectsApi
      .deleteNamespacedCustomObject(
        'image.openshift.io',
        'v1',
        namespace,
        'imagestreams',
        params.image,
      )
      .catch((e) => {
        throw createError(e.statusCode, e?.body?.message);
      });
    return { success: true, error: null };
  } catch (e) {
    if (e.response?.statusCode !== 404) {
      fastify.log.error(e, 'Unable to delete notebook image.');
      return { success: false, error: 'Unable to delete notebook image: ' + e.message };
    }
  }
};

export const updateImage = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ success: boolean; error: string }> => {
  const customObjectsApi = fastify.kube.customObjectsApi;
  const namespace = fastify.kube.namespace;
  const params = request.params as { image: string };
  const body = request.body as BYONImage;
  const labels = {
    'app.kubernetes.io/created-by': 'byon',
    'opendatahub.io/notebook-image': 'true',
  };

  const imageStreams = await getImageStreams(fastify, labels);
  const validName = imageStreams.filter(
    (is) =>
      is.metadata.annotations['opendatahub.io/notebook-image-name'] === body.display_name &&
      is.metadata.name !== body.name,
  );

  if (validName.length > 0) {
    fastify.log.error('Duplicate name unable to add notebook image.');
    return { success: false, error: 'Unable to add notebook image: ' + body.name };
  }

  try {
    const imageStream = await customObjectsApi
      .getNamespacedCustomObject(
        'image.openshift.io',
        'v1',
        namespace,
        'imagestreams',
        params.image,
      )
      .then((r) => r.body as ImageStream)
      .catch((e) => {
        throw createError(e.statusCode, e?.body?.message);
      });

    if (body.packages && imageStream.spec.tags) {
      imageStream.spec.tags[0].annotations['opendatahub.io/notebook-python-dependencies'] =
        JSON.stringify(body.packages);
    }

    if (body.software && imageStream.spec.tags) {
      imageStream.spec.tags[0].annotations['opendatahub.io/notebook-software'] = JSON.stringify(
        body.software,
      );
    }

    if (body.visible !== undefined) {
      if (body.visible) {
        imageStream.metadata.labels['opendatahub.io/notebook-image'] = 'true';
      } else {
        imageStream.metadata.labels['opendatahub.io/notebook-image'] = 'false';
      }
    }
    if (body.display_name) {
      imageStream.metadata.annotations['opendatahub.io/notebook-image-name'] = body.display_name;
    }

    if (body.description !== undefined) {
      imageStream.metadata.annotations['opendatahub.io/notebook-image-desc'] = body.description;
    }

    if (body.recommendedAcceleratorIdentifiers !== undefined) {
      imageStream.metadata.annotations['opendatahub.io/recommended-accelerators'] = JSON.stringify(
        body.recommendedAcceleratorIdentifiers,
      );
    }

    await customObjectsApi
      .patchNamespacedCustomObject(
        'image.openshift.io',
        'v1',
        namespace,
        'imagestreams',
        params.image,
        imageStream,
        undefined,
        undefined,
        undefined,
        {
          headers: { 'Content-Type': 'application/merge-patch+json' },
        },
      )
      .catch((e) => console.error(e));

    return { success: true, error: null };
  } catch (e) {
    if (e.response?.statusCode !== 404) {
      fastify.log.error(e, 'Unable to update notebook image.');
      return { success: false, error: 'Unable to update notebook image: ' + e.message };
    }
  }
};

const jsonParsePackage = (unparsedPackage: string): BYONImagePackage[] => {
  try {
    return JSON.parse(unparsedPackage) || [];
  } catch {
    return [];
  }
};

const jsonParseRecommendedIdentifiers = (unparsedRecommendations: string): string[] => {
  try {
    return JSON.parse(unparsedRecommendations) || [];
  } catch {
    return [];
  }
};
