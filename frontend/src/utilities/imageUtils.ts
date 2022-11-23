import compareVersions from 'compare-versions';
import {
  BuildStatus,
  BUILD_PHASE,
  ImageInfo,
  ImageSoftwareType,
  ImageTag,
  ImageTagInfo,
  NotebookContainer,
} from '~/types';

const PENDING_PHASES = [
  BUILD_PHASE.new,
  BUILD_PHASE.pending,
  BUILD_PHASE.running,
  BUILD_PHASE.cancelled,
];
const FAILED_PHASES = [BUILD_PHASE.error, BUILD_PHASE.failed];

export const compareTagVersions = (a: ImageTagInfo, b: ImageTagInfo): number => {
  // Recommended tags should be first
  if (a.recommended) {
    return -1;
  } else if (b.recommended) {
    return 1;
  }
  if (compareVersions.validate(a.name) && compareVersions.validate(b.name)) {
    return compareVersions(b.name, a.name);
  }
  return b.name.localeCompare(a.name);
};

export const isImageBuildInProgress = (buildStatuses: BuildStatus[], image: ImageInfo): boolean => {
  const inProgressTag = image.tags?.find((tag) => {
    const imageTag = `${image.name}:${tag.name}`;
    const build = buildStatuses.find((buildStatus) => buildStatus.imageTag === imageTag);
    if (!build) {
      return false;
    }
    return PENDING_PHASES.includes(build.status);
  });
  return !!inProgressTag;
};

export const isImageTagBuildValid = (
  buildStatuses: BuildStatus[],
  image: ImageInfo,
  tag: ImageTagInfo,
): boolean => {
  const imageTag = `${image.name}:${tag.name}`;
  const build = buildStatuses.find((buildStatus) => buildStatus.imageTag === imageTag);
  if (!build) {
    return true;
  }
  return !PENDING_PHASES.includes(build.status) && !FAILED_PHASES.includes(build.status);
};

export const checkOrder = (a: ImageInfo, b: ImageInfo): number => a.order - b.order;

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

export const getDefaultTag = (
  buildStatuses: BuildStatus[],
  image: ImageInfo,
): ImageTagInfo | undefined => {
  if (!image.tags) {
    return undefined;
  }

  if (image.tags?.length <= 1) {
    return image.tags[0];
  }

  const validTags = image.tags.filter((tag) => isImageTagBuildValid(buildStatuses, image, tag));
  const tags = validTags.length ? validTags : image.tags;

  if (!tags) {
    return undefined;
  }

  // Return the recommended tag or the default tag
  const defaultTag = tags.find((tag) => tag.recommended) || tags.find((tag) => tag.default);
  if (defaultTag) {
    return defaultTag;
  }

  // Return the most recent version
  return [...tags].sort(compareTagVersions)[0];
};

export const getTagForImage = (
  buildStatuses: BuildStatus[],
  image: ImageInfo,
  selectedImage?: string,
  selectedTag?: string,
): ImageTagInfo | undefined => {
  let tag;

  if (!image.tags) {
    return undefined;
  }

  if (image.tags.length > 1) {
    if (image.name === selectedImage && selectedTag) {
      tag = image.tags.find((tag) => tag.name === selectedTag);
    } else {
      tag = getDefaultTag(buildStatuses, image);
    }
  }
  return tag || image.tags[0];
};

// Only returns a version string if there are multiple tags
export const getImageTagVersion = (
  buildStatuses: BuildStatus[],
  image: ImageInfo,
  selectedImage?: string,
  selectedTag?: string,
): string => {
  if (!image.tags) {
    return '';
  }
  if (image?.tags.length > 1) {
    const defaultTag = getDefaultTag(buildStatuses, image);
    if (image.name === selectedImage && selectedTag) {
      return selectedTag;
    }
    return defaultTag?.name ?? image.tags[0].name;
  }
  return '';
};

export const getDescriptionForTag = (imageTag?: ImageTagInfo): string => {
  if (!imageTag) {
    return '';
  }
  const softwareDescriptions = imageTag.content?.software.map((software) =>
    getNameVersionString(software),
  ) ?? [''];
  return softwareDescriptions.join(', ');
};

export const getImageAndTagByContainerEnvJupyterImage = (
  images: ImageInfo[],
  container?: NotebookContainer,
): ImageTag => {
  const imageStreamTagAndName =
    container?.env?.find((i) => i?.name === 'JUPYTER_IMAGE')?.value ?? '';
  const imageTag = imageStreamTagAndName.toString().split('/').at(-1)?.split(':');

  if (!imageTag || imageTag.length < 2) {
    return { image: undefined, tag: undefined };
  }
  const image = images.find((image) => image.name === imageTag[0]);
  const tag = image?.tags.find((tag) => tag.name === imageTag[1]);
  return { image, tag };
};
