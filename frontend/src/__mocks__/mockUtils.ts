import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

/**
 * Clones the resource and increments its metadata.resourceVersion.
 */
export const incrementResourceVersion = <T extends K8sResourceCommon>(resource: T): T => {
  const clone = structuredClone(resource);
  clone.metadata = {
    ...clone.metadata,
    resourceVersion: `${Number(clone.metadata?.resourceVersion) + 1 || 1}`,
  };
  return clone;
};
