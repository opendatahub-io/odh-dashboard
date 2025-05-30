import compareVersions from 'compare-versions';
import type { ImageStreamStatusTag } from '#~/types';
import { NotebookSize, Volume, VolumeMount } from '#~/types';
import { BuildKind, ImageStreamKind, ImageStreamSpecTagType, K8sDSGResource } from '#~/k8sTypes';
import {
  ConfigMapCategory,
  EnvVariable,
  EnvVariableDataEntry,
  SecretCategory,
  StartNotebookData,
} from '#~/pages/projects/types';
import { AWS_FIELDS } from '#~/pages/projects/dataConnections/const';
import { FieldOptions } from '#~/components/FieldList';
import { isK8sNameDescriptionDataValid } from '#~/concepts/k8s/K8sNameDescriptionField/utils';
import { formatMemory } from '#~/utilities/valueUnits';
import {
  BuildStatus,
  ImageVersionDependencyType,
  ImageVersionSelectOptionObjectType,
} from './types';
import { FAILED_PHASES, PENDING_PHASES, IMAGE_ANNOTATIONS } from './const';

/******************* Common utils *******************/
export const getVersion = (version?: string | number, prefix?: string): string => {
  if (!version) {
    return '';
  }
  if (typeof version === 'number') {
    return `${prefix || ''}${version}`;
  }
  const versionString =
    version.startsWith('v') || version.startsWith('V') ? version.slice(1) : version;

  return `${prefix || ''}${versionString}`;
};

export const getNameVersionString = (software: ImageVersionDependencyType): string =>
  `${software.name} ${getVersion(software.version, 'v')}`;

export const getMatchingImageStreamStatusTag = (
  imageStream: ImageStreamKind,
  imageVersion: ImageStreamSpecTagType,
): ImageStreamStatusTag | undefined => {
  const statusTag = imageStream.status?.tags?.find((tag) => tag.tag === imageVersion.name);
  if (!statusTag || !statusTag.items) {
    return undefined;
  }
  return {
    tag: statusTag.tag,
    items: statusTag.items,
  };
};

export const getImageVersionBuildDate = (
  imageVersion: ImageStreamSpecTagType,
  imageStreamStatusTag: ImageStreamStatusTag | undefined,
): string | undefined =>
  imageStreamStatusTag?.items.find((item) => item.dockerImageReference === imageVersion.from?.name)
    ?.created;

/******************* PF Select related utils *******************/
/**
 * Create object for PF Select component to use
 * `toString` decides the text shown for the select option
 */
export const getImageVersionSelectOptionObject = (
  imageStream: ImageStreamKind,
  imageVersion: ImageStreamSpecTagType,
): ImageVersionSelectOptionObjectType => ({
  imageStreamTag: getMatchingImageStreamStatusTag(imageStream, imageVersion),
  imageVersion,
  toString: () =>
    `${imageVersion.name}${checkVersionRecommended(imageVersion) ? ' (Recommended)' : ''}`,
});

export const isImageVersionSelectOptionObject = (
  object: unknown,
): object is ImageVersionSelectOptionObjectType =>
  typeof object === 'object' &&
  object !== null &&
  'imageVersion' in object &&
  object.imageVersion !== undefined;
/******************* Compare utils for sorting *******************/
const getBuildNumber = (build: BuildKind): number => {
  const buildNumber = build.metadata.annotations?.['openshift.io/build.number'] || '-1';
  return parseInt(buildNumber, 10);
};

export const compareBuilds = (b1: BuildKind, b2: BuildKind): number => {
  const b1Pending = PENDING_PHASES.includes(b1.status.phase);
  const b2Pending = PENDING_PHASES.includes(b2.status.phase);

  if (b1Pending && !b2Pending) {
    return -1;
  }
  if (b2Pending && !b1Pending) {
    return 1;
  }
  return getBuildNumber(b1) - getBuildNumber(b2);
};

export const compareTagVersions = (
  a: ImageStreamSpecTagType,
  b: ImageStreamSpecTagType,
): number => {
  // Recommended tags should be first
  if (checkVersionRecommended(a)) {
    return -1;
  }
  if (checkVersionRecommended(b)) {
    return 1;
  }
  if (compareVersions.validate(a.name) && compareVersions.validate(b.name)) {
    return compareVersions(b.name, a.name);
  }
  return b.name.localeCompare(a.name);
};

export const compareImageVersionOrder = (
  a: ImageStreamSpecTagType,
  b: ImageStreamSpecTagType,
): number => compareTagVersions(a, b);

export const compareImageStreamOrder = (a: ImageStreamKind, b: ImageStreamKind): number =>
  getImageSteamOrder(a) - getImageSteamOrder(b);

/******************* ImageStream and ImageVersion utils *******************/
export const getImageStreamDisplayName = (imageStream: ImageStreamKind): string =>
  imageStream.metadata.annotations?.[IMAGE_ANNOTATIONS.DISP_NAME] || imageStream.metadata.name;

export const getImageStreamDescription = (imageStream: ImageStreamKind): string =>
  imageStream.metadata.annotations?.[IMAGE_ANNOTATIONS.DESC] || '';

export const getImageSteamOrder = (imageStream: ImageStreamKind): number =>
  parseInt(imageStream.metadata.annotations?.[IMAGE_ANNOTATIONS.IMAGE_ORDER] || '100');

export const getCompatibleIdentifiers = (object: ImageStreamKind | K8sDSGResource): string[] => {
  try {
    const annotation = object.metadata.annotations?.['opendatahub.io/recommended-accelerators'];
    // in the format of ["foo.com/gpu", "bar.com/gpu"]
    if (annotation) {
      const identifiers = JSON.parse(annotation);
      if (Array.isArray(identifiers)) {
        return identifiers;
      }
    }
  } catch (error) {
    // catch invalid json in metadata
  }
  return [];
};

export const isCompatibleWithIdentifier = (
  identifier?: string,
  obj?: ImageStreamKind | K8sDSGResource,
): boolean => {
  if (!obj || !identifier) {
    return false;
  }

  return getCompatibleIdentifiers(obj).some((cr) => cr === identifier);
};

/**
 * Parse annotation software field or dependencies field from long string to array
 */
export const getImageVersionDependencies = (
  imageVersion: ImageStreamSpecTagType,
  isSoftware = false,
): ImageVersionDependencyType[] => {
  const depString = isSoftware
    ? imageVersion.annotations?.[IMAGE_ANNOTATIONS.SOFTWARE] || ''
    : imageVersion.annotations?.[IMAGE_ANNOTATIONS.DEPENDENCIES] || '';
  let dependencies: ImageVersionDependencyType[] | undefined;
  try {
    dependencies = JSON.parse(depString);
  } catch (e) {
    if (depString.includes('[')) {
      // It was intended to be an array but failed to parse, log the error
      /* eslint-disable-next-line no-console */
      console.error(`JSON parse error when parsing ${imageVersion.name}`);
    }
    dependencies = [];
  }
  return dependencies || [];
};

/**
 * Get the long string of the software that the version is using
 */
export const getImageVersionSoftwareString = (imageVersion: ImageStreamSpecTagType): string => {
  const dependencies = getImageVersionDependencies(imageVersion, true);
  const softwareString = dependencies.map((software) => getNameVersionString(software));
  return softwareString.join(', ');
};

const isOutdated = (version: ImageStreamSpecTagType): boolean =>
  !!version.annotations?.[IMAGE_ANNOTATIONS.OUTDATED];

/**
 * Get all the `imageStream.spec.tags` and filter the ones exists in `imageStream.status.tags`
 */
export const getExistingVersionsForImageStream = (
  imageStream: ImageStreamKind,
): ImageStreamSpecTagType[] => {
  const allVersions = imageStream.spec.tags || [];
  return allVersions
    .filter((version) => !isOutdated(version))
    .filter((version) => checkVersionExistence(imageStream, version));
};

/**
 * Takes an ImageStream and returns the related description we show next to the name
 */
export const getRelatedVersionDescription = (imageStream: ImageStreamKind): string | undefined => {
  const versions = getExistingVersionsForImageStream(imageStream);
  return versions.length === 1 ? getImageVersionSoftwareString(versions[0]) : undefined;
};

/**
 * Get all the existing tags and check their build status, filter out the available ones
 */
export const getAvailableVersionsForImageStream = (
  imageStream: ImageStreamKind,
  buildStatuses: BuildStatus[],
): ImageStreamSpecTagType[] => {
  const existingVersions = getExistingVersionsForImageStream(imageStream);
  return existingVersions.filter((version) =>
    checkTagBuildValid(buildStatuses, imageStream, version),
  );
};

/**
 * Get the recommended tag or the default tag
 * if no recommended or default, return the latest version
 */
export const getDefaultVersionForImageStream = (
  imageStream: ImageStreamKind,
  buildStatuses: BuildStatus[],
): ImageStreamSpecTagType | undefined => {
  const availableVersions = getAvailableVersionsForImageStream(imageStream, buildStatuses);
  if (availableVersions.length === 0) {
    return undefined;
  }

  const sortedVersions = availableVersions.toSorted(compareTagVersions);

  // Return the most recent version
  return sortedVersions[0];
};

/******************* Deployment Size utils *******************/
export const getSizeDescription = (size: NotebookSize): string =>
  `Limits: ${size.resources.limits?.cpu || '??'} CPU, ` +
  `${formatMemory(size.resources.limits?.memory) || '??'} Memory ` +
  `Requests: ${size.resources.requests?.cpu || '??'} CPU, ` +
  `${formatMemory(size.resources.requests?.memory) || '??'} Memory`;

/******************* Checking utils *******************/
/**
 * Check if there is 1 or more versions available for an image stream
 */
export const checkImageStreamAvailability = (
  imageStream: ImageStreamKind,
  buildStatuses: BuildStatus[],
): boolean => {
  const tags = getAvailableVersionsForImageStream(imageStream, buildStatuses);
  return tags.length !== 0;
};

export const checkTagBuildValid = (
  buildStatuses: BuildStatus[],
  imageStream: ImageStreamKind,
  imageVersion: ImageStreamSpecTagType,
): boolean => {
  const imageStreamVersion = `${imageStream.metadata.name}:${imageVersion.name}`;
  const build = buildStatuses.find(
    (buildStatus) => buildStatus.imageStreamVersion === imageStreamVersion,
  );
  if (!build) {
    return true;
  }
  return !PENDING_PHASES.includes(build.status) && !FAILED_PHASES.includes(build.status);
};

export const checkVersionExistence = (
  imageStream: ImageStreamKind,
  imageVersion: ImageStreamSpecTagType,
): boolean => {
  const versions = imageStream.status?.tags || [];
  return versions.some((version) => version.tag === imageVersion.name);
};

export const checkVersionRecommended = (imageVersion: ImageStreamSpecTagType): boolean =>
  imageVersion.annotations?.[IMAGE_ANNOTATIONS.RECOMMENDED] === 'true';

export const isValidGenericKey = (key: string): boolean => !!key;

export const isAWSValid = (
  values: EnvVariableDataEntry[],
  additionalRequiredFields?: string[],
): boolean =>
  values.every(({ key, value }) =>
    getAdditionalRequiredAWSFields(additionalRequiredFields)
      .filter((field) => field.isRequired)
      .map((field) => field.key)
      .includes(key)
      ? !!value
      : true,
  );

export const getAdditionalRequiredAWSFields = (
  additionalRequiredFields?: string[],
): FieldOptions[] =>
  additionalRequiredFields
    ? AWS_FIELDS.map((field) =>
        additionalRequiredFields.includes(field.key) ? { ...field, isRequired: true } : field,
      )
    : AWS_FIELDS;

export const isEnvVariableDataValid = (envVariables: EnvVariable[]): boolean => {
  if (envVariables.length === 0) {
    return true;
  }

  const hasValidValuesForType = (
    values: EnvVariableDataEntry[],
    type: ConfigMapCategory | SecretCategory,
  ) => {
    if (values.length === 0) {
      // No entries -- they have partial form structure
      return false;
    }

    switch (type) {
      case ConfigMapCategory.GENERIC:
      case SecretCategory.GENERIC:
      case ConfigMapCategory.UPLOAD:
      case SecretCategory.UPLOAD:
        return values.every(({ key, value }) => isValidGenericKey(key) && !!value);
      case SecretCategory.AWS:
        return isAWSValid(values);
      default:
        return false;
    }
  };

  const isValid = envVariables.every(
    (envVar) =>
      !!envVar.type &&
      !!envVar.values &&
      !!envVar.values.category &&
      hasValidValuesForType(envVar.values.data, envVar.values.category),
  );

  return isValid;
};

export const checkRequiredFieldsForNotebookStart = (
  startNotebookData: StartNotebookData,
  envVariables: EnvVariable[],
): boolean => {
  const { projectName, notebookData, image } = startNotebookData;
  const isNotebookDataValid = !!(
    projectName &&
    isK8sNameDescriptionDataValid(notebookData) &&
    image.imageStream &&
    image.imageVersion
  );

  return isNotebookDataValid && isEnvVariableDataValid(envVariables);
};

export const isBYONImageStream = (imageStream: ImageStreamKind): boolean =>
  imageStream.metadata.labels?.['app.kubernetes.io/created-by'] === 'byon';

export const isInvalidBYONImageStream = (imageStream: ImageStreamKind): boolean => {
  // there will be always only 1 tag in the spec for BYON images
  // status tags could be more than one
  const activeTag = imageStream.status?.tags?.find(
    (statusTag) => statusTag.tag === imageStream.spec.tags?.[0].name,
  );
  return isBYONImageStream(imageStream) && (activeTag === undefined || activeTag.items === null);
};

export const getPvcVolumeDetails = (
  pvcVolumeList: { volumes: Volume[]; volumeMounts: VolumeMount[] }[],
): {
  volumes: Volume[];
  volumeMounts: VolumeMount[];
} =>
  pvcVolumeList.reduce(
    (acc, response) => {
      if (response.volumes.length) {
        acc.volumes = acc.volumes.concat(response.volumes);
      } else {
        acc.volumes = response.volumes;
      }

      if (response.volumeMounts.length) {
        acc.volumeMounts = acc.volumeMounts.concat(response.volumeMounts);
      } else {
        acc.volumeMounts = response.volumeMounts;
      }

      return acc;
    },
    {
      volumes: [],
      volumeMounts: [],
    },
  );
