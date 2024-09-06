import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { K8sDSGResource } from '~/k8sTypes';

export const PreInstalledName = 'Pre-installed';

export const ownedByDSC = (resource: K8sResourceCommon): boolean =>
  !!resource.metadata?.ownerReferences?.find((owner) => owner.kind === 'DataScienceCluster');

export const getDisplayNameFromK8sResource = (resource: K8sDSGResource): string =>
  resource.metadata.annotations?.['openshift.io/display-name'] || resource.metadata.name;
export const getResourceNameFromK8sResource = (resource: K8sDSGResource): string =>
  resource.metadata.name;
export const getDescriptionFromK8sResource = (resource: K8sDSGResource): string =>
  resource.metadata.annotations?.['openshift.io/description'] || '';
export const getCreatorFromK8sResource = (resource: K8sDSGResource): string =>
  ownedByDSC(resource)
    ? PreInstalledName
    : resource.metadata.annotations?.['opendatahub.io/username'] || 'unknown';

type AdditionalCriteriaForTranslation = {
  /** If pure digits, prevent it with this safe string */
  safeK8sPrefix?: string;
  /** Cap the characters allowed */
  maxLength?: number;
};
type AdditionalCriteriaApplied = Record<keyof AdditionalCriteriaForTranslation, boolean>;

/**
 * Converts a display name to a k8s safe variant.
 * Provide additional criteria to help trim the value
 */
export const translateDisplayNameForK8sAndReport = (
  name: string,
  { safeK8sPrefix, maxLength }: AdditionalCriteriaForTranslation = {},
): [string, AdditionalCriteriaApplied] => {
  const appliedCriteria: AdditionalCriteriaApplied = {
    safeK8sPrefix: false,
    maxLength: false,
  };

  let translatedName = name
    .trim()
    .toLowerCase()
    .replace(/\s/g, '-') // spaces to dashes
    .replace(/[^a-z0-9-]/g, '') // remove inverse of good k8s characters
    .replace(/[-]+/g, '-'); // simplify double dashes ('A - B' turns into 'a---b' where 'a-b' is enough)

  if (safeK8sPrefix && /^\d+$/.test(translatedName)) {
    // Avoid pure digit names
    translatedName = `${safeK8sPrefix}${translatedName}`;
    appliedCriteria.safeK8sPrefix = true;
  }

  if (maxLength && translatedName.length > maxLength) {
    // Avoid too long
    translatedName = translatedName
      .slice(0, maxLength) // shorten to length
      .replace(/[-]*$/, ''); // remove invalid trailing characters
    appliedCriteria.maxLength = true;
  }

  return [translatedName, appliedCriteria];
};

/**
 * Simplified if you don't care what happened.
 * @see translateDisplayNameForK8sAndReport
 */
export const translateDisplayNameForK8s = (
  name: string,
  additionalCriteria: AdditionalCriteriaForTranslation = {},
): string => translateDisplayNameForK8sAndReport(name, additionalCriteria)[0];

export const isValidK8sName = (name?: string): boolean =>
  name === undefined || (name.length > 0 && /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(name));
