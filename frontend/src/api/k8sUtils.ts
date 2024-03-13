import {
  K8sGroupVersionKind,
  K8sModelCommon,
  K8sResourceCommon,
} from '@openshift/dynamic-plugin-sdk-utils';

export const addOwnerReference = <R extends K8sResourceCommon>(
  resource: R,
  owner?: K8sResourceCommon,
  blockOwnerDeletion = false,
): R => {
  if (!owner) {
    return resource;
  }
  const ownerReferences = resource.metadata?.ownerReferences || [];
  if (
    owner.metadata?.uid &&
    owner.metadata.name &&
    !ownerReferences.find((r) => r.uid === owner.metadata?.uid)
  ) {
    ownerReferences.push({
      uid: owner.metadata.uid,
      name: owner.metadata.name,
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

export const groupVersionKind = (model: K8sModelCommon): K8sGroupVersionKind => ({
  group: model.apiGroup,
  version: model.apiVersion,
  kind: model.kind,
});
