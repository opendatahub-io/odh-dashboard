import compareVersions from 'compare-versions';
import { ImageSoftwareType, ImageTagType, ImageType } from '../types';

const runningStatuses = ['pending', 'running', 'cancelled'];
const failedStatuses = ['error', 'failed'];

export const compareTagVersions = (a: ImageTagType, b: ImageTagType): number => {
  if (compareVersions.validate(a.name) && compareVersions.validate(b.name)) {
    return compareVersions(b.name, a.name);
  }
  return b.name.localeCompare(a.name);
};

export const isImageBuildInProgress = (image: ImageType): boolean => {
  const inProgressTag = image.tags?.find((tag) =>
    runningStatuses.includes(tag.build_status?.toLowerCase() ?? ''),
  );
  return !!inProgressTag;
};

export const isImageTagBuildValid = (tag: ImageTagType): boolean => {
  return (
    !runningStatuses.includes(tag.build_status?.toLowerCase() ?? '') &&
    !failedStatuses.includes(tag.build_status?.toLowerCase() ?? '')
  );
};

export const getVersion = (version?: string, prefix?: string): string => {
  if (!version) {
    return '';
  }
  const versionString =
    version.startsWith('v') || version.startsWith('V') ? version.slice(1) : version;

  return `${prefix ? prefix : ''}${versionString}`;
};

export const getNameVersionString = (software: ImageSoftwareType): string =>
  `${software.name}${getVersion(software.version, ' v')}`;

export const getDescriptionForTag = (imageTag?: ImageTagType): string => {
  if (!imageTag) {
    return '';
  }
  const softwareDescriptions = imageTag.content?.software.map((software) =>
    getNameVersionString(software),
  ) ?? [''];
  return softwareDescriptions.join(', ');
};

export const getDefaultTag = (image: ImageType): ImageTagType | undefined => {
  if (!image.tags) {
    return undefined;
  }

  if (image.tags?.length <= 1) {
    return image.tags[0];
  }

  const validTags = image.tags.filter((tag) => isImageTagBuildValid(tag));
  const tags = validTags.length ? validTags : image.tags;

  // Return the recommended tag or the default tag
  const defaultTag = tags.find((tag) => tag.recommended) || tags.find((tag) => tag.default);
  if (defaultTag) {
    return defaultTag;
  }

  // Return the most recent version
  return tags.sort(compareTagVersions)[0];
};

export const getTagForImage = (
  image: ImageType,
  selectedImage?: string,
  selectedTag?: string,
): ImageTagType | undefined => {
  let tag;

  if (!image.tags) {
    return undefined;
  }

  if (image.tags.length > 1) {
    if (image.name === selectedImage && selectedTag) {
      tag = image.tags.find((tag) => tag.name === selectedTag);
    } else {
      tag = getDefaultTag(image);
    }
  }
  return tag || image.tags[0];
};

// Only returns a version string if there are multiple tags
export const getImageTagVersion = (
  image: ImageType,
  selectedImage?: string,
  selectedTag?: string,
): string => {
  if (!image.tags) {
    return '';
  }
  if (image?.tags.length > 1) {
    const defaultTag = getDefaultTag(image);
    if (image.name === selectedImage && selectedTag) {
      return `${selectedTag} ${selectedTag === defaultTag?.name ? ' (default)' : ''}`;
    }
    return defaultTag?.name ?? image.tags[0].name;
  }
  return '';
};
