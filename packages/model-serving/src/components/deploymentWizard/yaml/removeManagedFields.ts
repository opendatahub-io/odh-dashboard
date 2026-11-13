import type { ModelResourceType } from '../../../../extension-points';

/**
 * Returns a copy of a model resource without Kubernetes-managed `metadata.managedFields`.
 * The original resource is not mutated.
 */
export const removeManagedFields = <T extends ModelResourceType>(
  resource: T | undefined,
): T | undefined => {
  if (!resource?.metadata.managedFields) {
    return resource;
  }

  const metadata = { ...resource.metadata };
  delete metadata.managedFields;
  return {
    ...resource,
    metadata,
  };
};
