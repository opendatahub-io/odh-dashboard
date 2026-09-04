import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const addOwnerReference = <R extends K8sResourceCommon>(
  resource: R,
  owner?: K8sResourceCommon,
  blockOwnerDeletion = false,
): R => {
  if (!owner) {
    return resource;
  }
  const ownerReferences = resource.metadata?.ownerReferences || [];
  const ownerMetadata = owner.metadata;
  if (
    ownerMetadata?.uid &&
    ownerMetadata.name &&
    owner.apiVersion &&
    owner.kind &&
    !ownerReferences.find((r) => r.uid === ownerMetadata.uid)
  ) {
    ownerReferences.push({
      uid: ownerMetadata.uid,
      name: ownerMetadata.name,
      apiVersion: owner.apiVersion,
      kind: owner.kind,
      blockOwnerDeletion,
    });
  }
  return {
    ...resource,
    metadata: {
      ...resource.metadata,
      ownerReferences,
    },
  };
};
