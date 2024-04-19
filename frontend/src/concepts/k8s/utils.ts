import { K8sDSGResource } from '~/k8sTypes';

export const getDisplayNameFromK8sResource = (resource: K8sDSGResource): string =>
  resource.metadata.annotations?.['openshift.io/display-name'] || resource.metadata.name;
export const getDescriptionFromK8sResource = (resource: K8sDSGResource): string =>
  resource.metadata.annotations?.['openshift.io/description'] || '';

export const translateDisplayNameForK8s = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/\s/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '');

export const isValidK8sName = (name?: string): boolean =>
  name === undefined || (name.length > 0 && /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(name));
