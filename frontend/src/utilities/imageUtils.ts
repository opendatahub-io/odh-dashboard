import compareVersions from 'compare-versions';
import {
  Container,
  ImageSoftwareType,
  ImageStream,
  ImageStreamStatusTag,
  ImageStreamTag,
  ImageTagType,
  ImageType,
} from '../types';
import {
  ANNOTATION_NOTEBOOK_IMAGE_NAME,
  ANNOTATION_NOTEBOOK_IMAGE_ORDER,
  ANNOTATION_NOTEBOOK_IMAGE_TAG_DEFAULT,
  ANNOTATION_NOTEBOOK_IMAGE_TAG_DEPENDENCIES,
  ANNOTATION_NOTEBOOK_IMAGE_TAG_RECOMMENDED,
  ANNOTATION_NOTEBOOK_IMAGE_TAG_SOFTWARE,
} from './const';

const runningStatuses = ['pending', 'running', 'cancelled'];
const failedStatuses = ['error', 'failed'];

export const compareTagVersions = (a: ImageStreamTag, b: ImageStreamTag): number => {
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

export const getImageStreamDisplayName = (imageStream: ImageStream): string =>
  imageStream.metadata.annotations?.[ANNOTATION_NOTEBOOK_IMAGE_NAME] ?? '';

export const getTagForImageStream = (
  imageStream: ImageStream,
  selectedImage?: string,
  selectedTag?: string,
): ImageStreamTag | undefined => {
  if (imageStream.metadata.name === selectedImage && selectedTag) {
    const statusTag = imageStream.status?.tags?.find((tag) => tag.tag === selectedTag);
    if (statusTag) {
      return getTagByTagNameAndImageStream(imageStream, statusTag.tag);
    }
  }
  return getDefaultTagByImageStream(imageStream);
};

// Only returns a version string if there are multiple tags
export const getImageStreamTagVersion = (
  imageStream: ImageStream,
  selectedImage?: string,
  selectedTag?: string,
): string => {
  const tags = imageStream.status?.tags;
  if (!tags) {
    return '';
  }
  if (tags.length > 1) {
    const defaultTag = getDefaultTagByImageStream(imageStream);
    if (imageStream.metadata.name === selectedImage && selectedTag) {
      return `${selectedTag} ${selectedTag === defaultTag?.name ? ' (default)' : ''}`;
    }
    return defaultTag?.name ?? tags[0].tag;
  }
  return '';
};

export const checkImageStreamOrder = (a: ImageStream, b: ImageStream): number =>
  Number(a.metadata.annotations?.[ANNOTATION_NOTEBOOK_IMAGE_ORDER]) -
  Number(b.metadata.annotations?.[ANNOTATION_NOTEBOOK_IMAGE_ORDER]);

export const getTagDescription = (tag?: ImageStreamTag): string => {
  const software = tag?.annotations?.[ANNOTATION_NOTEBOOK_IMAGE_TAG_SOFTWARE];
  if (!software) {
    return '';
  }
  const softwareDescriptions = JSON.parse(software).map((notebookTagSoftware: ImageSoftwareType) =>
    getNameVersionString(notebookTagSoftware),
  );
  return softwareDescriptions.join(', ');
};

export const getTagDependencies = (tag?: ImageStreamTag): ImageSoftwareType[] => {
  const dependencies = tag?.annotations?.[ANNOTATION_NOTEBOOK_IMAGE_TAG_DEPENDENCIES];
  if (!dependencies) {
    return [];
  }
  return JSON.parse(dependencies);
};

export const getImageStreamByContainer = (
  imageStreams: ImageStream[],
  container: Container,
): ImageStream | undefined =>
  imageStreams.find((imageStream) =>
    imageStream.spec?.tags?.find((tag) => tag.from?.name === container.image),
  );

export const getTagByTagNameAndImageStream = (
  imageStream: ImageStream,
  tagName: string,
): ImageStreamTag | undefined => imageStream.spec?.tags?.find((tag) => tag.name === tagName);

export const getTagsByStatusTags = (
  imageStream: ImageStream,
  statusTags: ImageStreamStatusTag[],
): ImageStreamTag[] => {
  const tags: ImageStreamTag[] = [];
  statusTags.forEach((statusTag) => {
    const tag = getTagByTagNameAndImageStream(imageStream, statusTag.tag);
    if (tag) {
      tags.push(tag);
    }
  });
  return tags;
};

export const getDefaultTagByImageStream = (
  imageStream: ImageStream,
): ImageStreamTag | undefined => {
  const statusTags = imageStream.status?.tags;
  if (!statusTags) {
    return undefined;
  }

  const tags = getTagsByStatusTags(imageStream, statusTags);

  if (tags.length <= 1) {
    return tags[0];
  }

  // do this later (may need the API call to build.openshift.io/v1);
  // const validTags = tags.filter((tag) => isImageTagBuildValid(tag));
  // const tags = validTags.length ? validTags : image.tags;

  // Return the recommended tag or the default tag
  const defaultTag = tags.find(
    (tag) =>
      tag?.annotations?.[ANNOTATION_NOTEBOOK_IMAGE_TAG_RECOMMENDED] ||
      tag?.annotations?.[ANNOTATION_NOTEBOOK_IMAGE_TAG_DEFAULT],
  );

  if (defaultTag) {
    return defaultTag;
  }

  // Return the most recent version
  return tags.sort(compareTagVersions)[0];
};
