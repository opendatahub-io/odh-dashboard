import { applyOverrides } from '@openshift/dynamic-plugin-sdk';
import {
  commonFetchJSON,
  getK8sResourceURL,
  K8sGroupVersionKind,
  K8sModelCommon,
  K8sResourceCommon,
  K8sResourceUpdateOptions,
} from '@openshift/dynamic-plugin-sdk-utils';

// Utility type: requires identifier fields, rest is partial
export type K8sResourcePatchIdentifier = {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    [key: string]: unknown;
  };
};

export type K8sMergePatch<T> = K8sResourcePatchIdentifier & Partial<T>;

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

// RFC 7386 (JSON Merge Patch):
// - Setting an object property to null removes it from the target.
// - Arrays are replaced as a whole; individual elements are not patched.
// - This function replaces undefined with null in object properties only, not in arrays.
// - See also: https://www.npmjs.com/package/json-merge-patch
export const deepReplaceUndefinedWithNull: {
  <T>(obj: T): T;
  (obj: unknown): unknown;
} = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    // Do not replace undefined with null in arrays; recurse into objects inside arrays only
    return obj.map((v) =>
      typeof v === 'object' && v !== null && !Array.isArray(v)
        ? deepReplaceUndefinedWithNull(v)
        : v,
    );
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = value === undefined ? null : deepReplaceUndefinedWithNull(value);
    }
    return result;
  }
  return obj;
};

export const k8sMergePatchResource = <
  TResource extends K8sResourceCommon,
  TPatch extends K8sMergePatch<TResource> = K8sMergePatch<TResource>,
  TUpdatedResource extends TResource = TResource,
>({
  model,
  resource,
  queryOptions = {},
  fetchOptions = {},
}: K8sResourceUpdateOptions<TPatch>): Promise<TUpdatedResource> => {
  if (!resource.metadata.name) {
    return Promise.reject(new Error('Resource payload name not specified'));
  }

  // Convert all undefined values to null for merge patch
  const resourceWithNulls = deepReplaceUndefinedWithNull(resource);

  return commonFetchJSON<TUpdatedResource>(
    getK8sResourceURL(model, resourceWithNulls, queryOptions),
    applyOverrides(fetchOptions.requestInit, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/merge-patch+json',
      },
      body: JSON.stringify(resourceWithNulls),
    }),
    fetchOptions.timeout,
    true,
  );
};
