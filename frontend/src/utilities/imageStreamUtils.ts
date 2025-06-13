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

export const mapImageStreamToBYONImage = (image: ImageStreamKind): BYONImage => {
  const { metadata, spec } = image;
  const annotations = metadata.annotations ?? {};
  const labels = metadata.labels ?? {};
  const tag = spec.tags?.[0];
  const tagAnnotations = tag?.annotations ?? {};

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
    visible: labels[ImageStreamLabel.NOTEBOOK] === 'true',
    error: getBYONImageErrorMessage(image) ?? '',
    packages: safeJSONParse<BYONImagePackage>(
      tagAnnotations[ImageStreamSpecTagAnnotation.DEPENDENCIES] || '',
    ),
    software: safeJSONParse<BYONImagePackage>(
      tagAnnotations[ImageStreamSpecTagAnnotation.SOFTWARE] || '',
    ),
    // eslint-disable-next-line camelcase
    imported_time: metadata.creationTimestamp || '',
    url: annotations[ImageStreamAnnotation.URL] || '',
    provider: annotations[ImageStreamAnnotation.CREATOR],
    recommendedAcceleratorIdentifiers: safeJSONParse<string>(
      annotations[ImageStreamAnnotation.RECOMMENDED_ACCELERATORS],
    ),
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
