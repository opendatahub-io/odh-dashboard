import { K8sDSGResource } from '~/k8sTypes';

export const getDisplayNameFromK8sResource = (resource: K8sDSGResource): string =>
  resource.metadata.annotations?.['openshift.io/display-name'] || resource.metadata.name;
export const getResourceNameFromK8sResource = (resource: K8sDSGResource): string =>
  resource.metadata.name;
export const getDescriptionFromK8sResource = (resource: K8sDSGResource): string =>
  resource.metadata.annotations?.['openshift.io/description'] || '';

/**
 * Converts a display name to a k8s safe variant, if needed a `safeK8sPrefix` can be provided to customize the prefix used to align with k8s standards if it is needed.
 */
export const translateDisplayNameForK8s = (name: string, safeK8sPrefix?: string): string => {
  const translatedName: string = name
    .trim()
    .toLowerCase()
    .replace(/\s/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '');

  if (safeK8sPrefix) {
    if (/^\d+$/.test(translatedName)) {
      const translatedNameWithoutNumbers = `wb-${translatedName}`;
      return translatedNameWithoutNumbers;
    }
  }
  return translatedName;
};

export const isValidK8sName = (name?: string): boolean =>
  name === undefined || (name.length > 0 && /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(name));
