const K8S_STORAGE_QUANTITY_REGEX = /^\d+(\.\d+)?(Gi|Mi|Ti|G|M|T)$/;
const K8S_NAME_REGEX = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const K8S_DNS_SUBDOMAIN_REGEX = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;
const MAX_DNS1123_LABEL_LENGTH = 63;
const MAX_DNS_SUBDOMAIN_LENGTH = 253;

const translateImageSegmentToK8sName = (name: string): string => {
  const translatedName = name
    .toLowerCase()
    .replace(/\s/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-*/, '')
    .replace(/-*$/, '')
    .replace(/[-]+/g, '-');

  if (/^\d+/.test(translatedName)) {
    return `a-${translatedName}`;
  }

  return translatedName;
};

const getImageNameFromLastSegment = (segment: string): string => {
  const digestSeparatorIndex = segment.indexOf('@');
  if (digestSeparatorIndex !== -1) {
    return segment.slice(0, digestSeparatorIndex);
  }

  const tagSeparatorIndex = segment.lastIndexOf(':');
  if (tagSeparatorIndex !== -1) {
    return segment.slice(0, tagSeparatorIndex);
  }

  return segment;
};

const isDigestPinnedImage = (containerImage: string): boolean => {
  const lastSegment = containerImage.split('/').pop() ?? containerImage;
  return lastSegment.includes('@');
};

export const deriveAgentNameFromImage = (containerImage: string): string => {
  const trimmedImage = containerImage.trim();
  if (!trimmedImage) {
    return '';
  }

  const lastSegment = trimmedImage.split('/').filter(Boolean).pop() ?? trimmedImage;

  return translateImageSegmentToK8sName(getImageNameFromLastSegment(lastSegment));
};

export const stripContainerImageTag = (containerImage: string): string => {
  const trimmed = containerImage.trim();
  if (!trimmed) {
    return '';
  }

  if (isDigestPinnedImage(trimmed)) {
    return trimmed;
  }

  const parts = trimmed.split('/');
  const lastSegment = parts[parts.length - 1];
  const tagSeparatorIndex = lastSegment.lastIndexOf(':');
  if (tagSeparatorIndex === -1) {
    return trimmed;
  }

  parts[parts.length - 1] = lastSegment.slice(0, tagSeparatorIndex);
  return parts.join('/');
};

export const buildFullImageReference = (containerImage: string, imageTag: string): string => {
  const imageWithoutTag = stripContainerImageTag(containerImage);
  const trimmedTag = imageTag.trim();

  if (!imageWithoutTag) {
    return '';
  }

  if (isDigestPinnedImage(imageWithoutTag)) {
    return imageWithoutTag;
  }

  return trimmedTag ? `${imageWithoutTag}:${trimmedTag}` : imageWithoutTag;
};

export const isValidK8sStorageQuantity = (size: string): boolean =>
  K8S_STORAGE_QUANTITY_REGEX.test(size.trim());

export const isValidAgentName = (name: string): boolean => {
  const trimmed = name.trim();
  return (
    trimmed.length > 0 && trimmed.length <= MAX_DNS1123_LABEL_LENGTH && K8S_NAME_REGEX.test(trimmed)
  );
};

export const isValidPullSecretName = (name: string): boolean => {
  const trimmed = name.trim();
  if (trimmed === '') {
    return true;
  }
  return trimmed.length <= MAX_DNS_SUBDOMAIN_LENGTH && K8S_DNS_SUBDOMAIN_REGEX.test(trimmed);
};
