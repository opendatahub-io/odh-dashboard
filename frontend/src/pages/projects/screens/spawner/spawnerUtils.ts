import * as React from 'react';
import compareVersions from 'compare-versions';
import { NotebookSize, Volume, VolumeMount } from '../../../../types';
import { BuildKind, ImageStreamKind, ImageStreamSpecTagType } from '../../../../k8sTypes';
import { FAILED_PHASES, PENDING_PHASES } from './const';
import {
  BuildStatus,
  ImageStreamSelectOptionObjectType,
  ImageVersionDependencyType,
  ImageVersionSelectOptionObjectType,
} from './types';
import {
  ConfigMapCategory,
  EnvVariable,
  EnvVariableDataEntry,
  SecretCategory,
  StartNotebookData,
  StorageData,
  StorageType,
} from '../../types';
import { ROOT_MOUNT_PATH } from '../../pvc/const';
import { AWS_KEYS, AWS_REQUIRED_KEYS } from '../../dataConnections/const';

/******************* Common utils *******************/
export const useMergeDefaultPVCName = (
  storageData: StorageData,
  defaultPVCName: string,
): StorageData => {
  const modifiedRef = React.useRef(false);

  if (modifiedRef.current || storageData.creating.nameDesc.name) {
    modifiedRef.current = true;
    return storageData;
  }

  return {
    ...storageData,
    creating: {
      ...storageData.creating,
      nameDesc: {
        ...storageData.creating.nameDesc,
        name: storageData.creating.nameDesc.name || defaultPVCName,
      },
    },
  };
};

export const getVersion = (version?: string, prefix?: string): string => {
  if (!version) {
    return '';
  }
  const versionString =
    version.startsWith('v') || version.startsWith('V') ? version.slice(1) : version;

  return `${prefix ? prefix : ''}${versionString}`;
};

export const getNameVersionString = (software: ImageVersionDependencyType): string =>
  `${software.name} ${getVersion(software.version, 'v')}`;

/******************* PF Select related utils *******************/
/**
 * Create object for PF Select component to use
 * `toString` decides the text shown for the select option
 */
export const getImageStreamSelectOptionObject = (
  imageStream: ImageStreamKind,
): ImageStreamSelectOptionObjectType => ({
  imageStream,
  toString: () => getImageStreamDisplayName(imageStream),
});
export const getImageVersionSelectOptionObject = (
  imageStream: ImageStreamKind,
  imageVersion: ImageStreamSpecTagType,
): ImageVersionSelectOptionObjectType => ({
  imageVersion,
  toString: () =>
    `${imageVersion.name}${checkVersionRecommended(imageVersion) ? ' (Recommended)' : ''}`,
});
export const isImageStreamSelectOptionObject = (
  object: unknown,
): object is ImageStreamSelectOptionObjectType => {
  return (object as ImageStreamSelectOptionObjectType).imageStream !== undefined;
};
export const isImageVersionSelectOptionObject = (
  object: unknown,
): object is ImageVersionSelectOptionObjectType => {
  return (object as ImageVersionSelectOptionObjectType).imageVersion !== undefined;
};

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
  imageStream.metadata.annotations?.['opendatahub.io/notebook-image-name'] ||
  imageStream.metadata.name;

export const getImageStreamDescription = (imageStream: ImageStreamKind): string =>
  imageStream.metadata.annotations?.['opendatahub.io/notebook-image-desc'] || '';

export const getImageSteamOrder = (imageStream: ImageStreamKind): number =>
  parseInt(imageStream.metadata.annotations?.['opendatahub.io/notebook-image-order'] || '100');

/**
 * Parse annotation software field or dependencies field from long string to array
 */
export const getImageVersionDependencies = (
  imageVersion: ImageStreamSpecTagType,
  isSoftware = false,
): ImageVersionDependencyType[] => {
  const depString = isSoftware
    ? imageVersion.annotations?.['opendatahub.io/notebook-software'] || ''
    : imageVersion.annotations?.['opendatahub.io/notebook-python-dependencies'] || '';
  let dependencies: ImageVersionDependencyType[];
  try {
    dependencies = JSON.parse(depString);
  } catch (e) {
    if (depString.includes('[')) {
      // It was intended to be an array but failed to parse, log the error
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

/**
 * Get all the `imageStream.spec.tags` and filter the ones exists in `imageStream.status.tags`
 */
export const getExistingVersionsForImageStream = (
  imageStream: ImageStreamKind,
): ImageStreamSpecTagType[] => {
  const allVersions = imageStream.spec.tags || [];
  return allVersions.filter((version) => checkVersionExistence(imageStream, version));
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

  const sortedVersions = [...availableVersions].sort(compareTagVersions);

  const defaultVersion = sortedVersions.find(
    (version) =>
      version.annotations?.['opendatahub.io/notebook-image-recommended'] ||
      version.annotations?.['opendatahub.io/default-image'],
  );
  if (defaultVersion) {
    return defaultVersion;
  }

  // Return the most recent version
  return sortedVersions[0];
};

/******************* Deployment Size utils *******************/
export const getSizeDescription = (size: NotebookSize): string =>
  `Limits: ${size.resources.limits?.cpu || '??'} CPU, ` +
  `${size.resources.limits?.memory || '??'} Memory ` +
  `Requests: ${size.resources.requests?.cpu || '??'} CPU, ` +
  `${size.resources.requests?.memory || '??'} Memory`;

/******************* Storage utils *******************/
export const getVolumesByStorageData = (
  storageData: StorageData,
): { volumes: Volume[]; volumeMounts: VolumeMount[] } => {
  const { storageType, existing } = storageData;
  const volumes: Volume[] = [];
  const volumeMounts: VolumeMount[] = [];

  if (storageType === StorageType.EXISTING_PVC) {
    const { storage } = existing;
    if (storage) {
      volumes.push({ name: storage, persistentVolumeClaim: { claimName: storage } });
      volumeMounts.push({ mountPath: ROOT_MOUNT_PATH, name: storage });
    }
  }

  return { volumes, volumeMounts };
};

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
  !!imageVersion.annotations?.['opendatahub.io/notebook-image-recommended'];

export const isValidGenericKey = (key: string): boolean => !!key;

export const isAWSValid = (values: EnvVariableDataEntry[]): boolean =>
  values.every(({ key, value }) => (AWS_REQUIRED_KEYS.includes(key as AWS_KEYS) ? !!value : true));

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
  storageData: StorageData,
  envVariables: EnvVariable[],
): boolean => {
  const { projectName, notebookName, notebookSize, image } = startNotebookData;
  const { storageType, creating, existing } = storageData;
  const isNotebookDataValid = !!(
    projectName &&
    notebookName &&
    notebookSize &&
    image.imageStream &&
    image.imageVersion
  );

  const newStorageFieldInvalid = storageType === StorageType.NEW_PVC && !creating.nameDesc.name;
  const existingStorageFiledInvalid = storageType === StorageType.EXISTING_PVC && !existing.storage;
  const isStorageDataValid = !newStorageFieldInvalid && !existingStorageFiledInvalid;

  return isNotebookDataValid && isStorageDataValid && isEnvVariableDataValid(envVariables);
};
