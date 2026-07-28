import { kindApiVersion } from '@odh-dashboard/k8s-core';
import {
  BYONImage,
  BYONImagePackage,
  DisplayNameAnnotation,
  ImageInfo,
  ImageStreamAnnotation,
  ImageStreamLabel,
  ImageStreamSpecTagAnnotation,
  ImageTagInfo,
  TagContent,
} from '#~/types';
import { ImageStreamKind, ImageStreamSpecTagType, ImageStreamStatusTag } from '#~/k8sTypes';
import { ImageStreamModel } from '#~/api';
import { OOTB_IMAGE_PROVIDER } from './const';

export const buildLabelSelector = (labels: Record<string, string> | string): string =>
  typeof labels === 'string'
    ? labels
    : Object.entries(labels)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');

export const IMAGE_URL_REGEXP =
  /^([\w.\-_]+(?::\d+|)(?=\/[a-z0-9._-]+\/[a-z0-9._-]+)|)(?:\/|)([a-z0-9.\-_]+(?:\/[a-z0-9.\-_]+|))(?::([\w.\-_]{1,127})|)/;

export const parseImageURL = (
  imageString: string,
): {
  fullURL: string;
  host: string | undefined;
  image: string | undefined;
  tag: string | undefined;
} => {
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

export const hasConflictName = (
  imageStreams: ImageStreamKind[],
  displayName: string,
  excludeName?: string,
): boolean =>
  imageStreams.some(({ metadata }) => {
    const name =
      metadata.annotations?.[ImageStreamAnnotation.DISP_NAME] ??
      metadata.annotations?.[DisplayNameAnnotation.DISP_NAME] ??
      metadata.name;
    return name === displayName && metadata.name !== excludeName;
  });

export const packagesToString = (packages: BYONImagePackage[]): string => {
  if (packages.length > 0) {
    let packageAsString = '[';
    packages.forEach((value, index) => {
      packageAsString = packageAsString + JSON.stringify(value);
      if (index !== packages.length - 1) {
        packageAsString = `${packageAsString},`;
      } else {
        packageAsString = `${packageAsString}]`;
      }
    });
    return packageAsString;
  }
  return '[]';
};

const getPreferredTag = (
  image: ImageStreamKind,
  isOOTBImage: boolean,
): ImageStreamSpecTagType | undefined => {
  const tags = image.spec.tags || [];
  if (!isOOTBImage) {
    return tags[0];
  }

  return (
    tags.find((t) => t.annotations?.[ImageStreamSpecTagAnnotation.RECOMMENDED] === 'true') ||
    tags.find((t) => t.annotations?.[ImageStreamSpecTagAnnotation.DEFAULT] === 'true') ||
    tags[0]
  );
};

export const mapImageStreamToBYONImage = (image: ImageStreamKind): BYONImage => {
  const { metadata } = image;
  const annotations = metadata.annotations ?? {};
  const labels = metadata.labels ?? {};
  const isOOTBImage = !isBYONImage(image);
  const tag = getPreferredTag(image, isOOTBImage);
  const tagAnnotations = tag?.annotations ?? {};

  const getProvider = (): string => {
    const creator = annotations[ImageStreamAnnotation.CREATOR];
    if (creator) {
      return creator;
    }
    return isOOTBImage ? OOTB_IMAGE_PROVIDER : '';
  };

  const getVisible = (): boolean => {
    if (isOOTBImage) {
      return annotations[ImageStreamAnnotation.HIDDEN] !== 'true';
    }
    return labels[ImageStreamLabel.NOTEBOOK] === 'true';
  };

  return {
    id: metadata.uid || '',
    name: metadata.name,
    // eslint-disable-next-line camelcase
    display_name:
      annotations[ImageStreamAnnotation.DISP_NAME] ||
      annotations[DisplayNameAnnotation.DISP_NAME] ||
      metadata.name,
    description:
      annotations[ImageStreamAnnotation.DESC] || annotations[DisplayNameAnnotation.DESC] || '',
    visible: getVisible(),
    error: isOOTBImage ? '' : getBYONImageErrorMessage(image) ?? '',
    packages: safeJSONParse<BYONImagePackage>(
      tagAnnotations[ImageStreamSpecTagAnnotation.DEPENDENCIES] || '',
    ),
    software: safeJSONParse<BYONImagePackage>(
      tagAnnotations[ImageStreamSpecTagAnnotation.SOFTWARE] || '',
    ),
    // eslint-disable-next-line camelcase
    imported_time: metadata.creationTimestamp || '',
    url: annotations[ImageStreamAnnotation.URL] || '',
    provider: getProvider(),
    recommendedAcceleratorIdentifiers: safeJSONParse<string>(
      annotations[ImageStreamAnnotation.RECOMMENDED_ACCELERATORS],
    ),
    isOOTB: isOOTBImage,
  };
};

export const mapImageStreamToImageInfo = (image: ImageStreamKind): ImageInfo => {
  const { metadata, status } = image;
  const annotations = metadata.annotations ?? {};

  return {
    name: metadata.name,
    description: annotations[ImageStreamAnnotation.DESC] || '',
    url: annotations[ImageStreamAnnotation.URL] || '',
    // eslint-disable-next-line camelcase
    display_name: annotations[ImageStreamAnnotation.DISP_NAME] || metadata.name,
    tags: getTagInfo(image),
    order: Number(annotations[ImageStreamAnnotation.IMAGE_ORDER]) || 100,
    dockerImageRepo: status?.dockerImageRepository || '',
    error: isBYONImage(image) ? getBYONImageErrorMessage(image) || '' : '',
  };
};

const getBYONImageErrorMessage = (image: ImageStreamKind) => {
  const activeTag = image.status?.tags?.find(
    (statusTag) => statusTag.tag === image.spec.tags?.[0].name,
  );
  return activeTag?.conditions?.[0]?.message;
};

const isBYONImage = (image: ImageStreamKind) =>
  image.metadata.labels?.['app.kubernetes.io/created-by'] === 'byon';

const getTagInfo = (image: ImageStreamKind): ImageTagInfo[] => {
  const tags = image.spec.tags || [];
  const statusTags = image.status?.tags || [];
  const validTags = getValidTags(tags, statusTags);
  return validTags.map((tag) => ({
    content: getTagContent(tag),
    name: tag.name,
    recommended: JSON.parse(tag.annotations?.[ImageStreamSpecTagAnnotation.RECOMMENDED] || 'false'),
    default: JSON.parse(tag.annotations?.[ImageStreamSpecTagAnnotation.DEFAULT] || 'false'),
  }));
};

const getValidTags = (
  specTags: ImageStreamSpecTagType[],
  statusTags: ImageStreamStatusTag[],
): ImageStreamSpecTagType[] => {
  const validTagNames: Set<string> = new Set(statusTags.map((st) => st.tag));
  return specTags.filter(
    (specTag) =>
      validTagNames.has(specTag.name) &&
      !specTag.annotations?.[ImageStreamSpecTagAnnotation.OUTDATED],
  );
};

const getTagContent = (tag: ImageStreamSpecTagType): TagContent => ({
  software: safeJSONParse<BYONImagePackage>(
    tag.annotations?.[ImageStreamSpecTagAnnotation.SOFTWARE] || '',
  ),
  dependencies: safeJSONParse<BYONImagePackage>(
    tag.annotations?.[ImageStreamSpecTagAnnotation.DEPENDENCIES] || '',
  ),
});

const safeJSONParse = <T>(unparsed: string): T[] => {
  try {
    const result = JSON.parse(unparsed);
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
};

export const byonDuplicatedErrorMessage = (
  image: Partial<BYONImage> & Pick<BYONImage, 'url' | 'display_name'>,
): string =>
  `Unable to add notebook image: ${kindApiVersion(ImageStreamModel)} "${
    image.display_name
  }" already exists`;
