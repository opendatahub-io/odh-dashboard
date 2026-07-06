import { applyOverrides } from '@openshift/dynamic-plugin-sdk';
import {
  commonFetchJSON,
  getK8sResourceURL,
  K8sGroupVersionKind,
  K8sModelCommon,
  K8sResourceCommon,
  K8sResourceUpdateOptions,
  type Patch,
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

export const k8sMergePatchResource = <
  TResource extends K8sResourceCommon,
  TUpdatedResource extends TResource = TResource,
>({
  model,
  resource,
  queryOptions = {},
  fetchOptions = {},
}: K8sResourceUpdateOptions<TResource>): Promise<TUpdatedResource> => {
  if (!resource.metadata?.name) {
    return Promise.reject(new Error('Resource payload name not specified'));
  }

  return commonFetchJSON<TUpdatedResource>(
    getK8sResourceURL(model, resource, queryOptions),
    applyOverrides(fetchOptions.requestInit, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/merge-patch+json',
      },
      body: JSON.stringify(resource),
    }),
    fetchOptions.timeout,
    true,
  );
};

/**
 * Generates JSON Patch operations by comparing an old object with a new object.
 * This is useful for creating targeted k8s resource patches instead of full updates.
 *
 * Automatically filters out Kubernetes managed fields like status, resourceVersion, etc.
 *
 * @param oldObj - The original object (current state)
 * @param newObj - The desired object (target state)
 * @param basePath - The base path for the patches (default: '')
 * @returns Array of Patch operations that transform oldObj into newObj
 *
 * @example
 * const oldResource = { spec: { replicas: 1, image: 'v1' } };
 * const newResource = { spec: { replicas: 3, image: 'v2', newField: 'value' } };
 * const patches = createPatchesFromDiff(oldResource, newResource);
 * // Returns: [
 * //   { op: 'replace', path: '/spec/replicas', value: 3 },
 * //   { op: 'replace', path: '/spec/image', value: 'v2' },
 * //   { op: 'add', path: '/spec/newField', value: 'value' }
 * // ]
 */
export const createPatchesFromDiff = (oldObj: unknown, newObj: unknown, basePath = ''): Patch[] => {
  const patches: Patch[] = [];

  // K8s managed fields that should not be patched
  const managedMetadataFields = new Set([
    'resourceVersion',
    'uid',
    'selfLink',
    'creationTimestamp',
    'deletionTimestamp',
    'deletionGracePeriodSeconds',
    'generation',
    'managedFields',
    'ownerReferences', // Typically managed via specialized APIs
  ]);

  // Helper to check if a path should be ignored
  const shouldIgnorePath = (path: string): boolean => {
    // Ignore the entire status subresource
    if (path === '/status' || path.startsWith('/status/')) {
      return true;
    }

    // Ignore managed metadata fields
    if (path.startsWith('/metadata/')) {
      const field = path.split('/')[2]; // Get field name after /metadata/
      if (managedMetadataFields.has(field)) {
        return true;
      }
    }

    return false;
  };

  // Helper to escape JSON Pointer special characters
  const escapePathComponent = (component: string): string =>
    component.replace(/~/g, '~0').replace(/\//g, '~1');

  // Helper to build path
  const buildPath = (path: string, key: string | number): string => {
    const escapedKey = typeof key === 'string' ? escapePathComponent(key) : key.toString();
    return path === '' ? `/${escapedKey}` : `${path}/${escapedKey}`;
  };

  // Helper to check if value is a plain object
  const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof RegExp);

  // Helper to deeply compare values
  const areEqual = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (a === undefined || b === undefined) return false;
    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => areEqual(item, b[index]));
    }

    if (isPlainObject(a) && isPlainObject(b)) {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      return keysA.every((key) => areEqual(a[key], b[key]));
    }

    return false;
  };

  // Main comparison logic
  const compare = (oldVal: unknown, newVal: unknown, path: string): void => {
    // Skip managed fields
    if (shouldIgnorePath(path)) {
      return;
    }

    // If values are identical, no patch needed
    if (areEqual(oldVal, newVal)) {
      return;
    }

    // Handle null/undefined cases
    if (newVal === undefined || newVal === null) {
      if (oldVal !== undefined && oldVal !== null) {
        // Remove the field (but check if path is allowed)
        if (!shouldIgnorePath(path)) {
          patches.push({ op: 'remove', path });
        }
      }
      return;
    }

    if (oldVal === undefined || oldVal === null) {
      // Add new field
      patches.push({ op: 'add', path, value: newVal });
      return;
    }

    // Handle arrays - replace entire array for simplicity
    // (More sophisticated array diffing could be added if needed)
    if (Array.isArray(newVal)) {
      if (!Array.isArray(oldVal) || !areEqual(oldVal, newVal)) {
        patches.push({ op: 'replace', path, value: newVal });
      }
      return;
    }

    // Handle objects recursively
    if (isPlainObject(newVal) && isPlainObject(oldVal)) {
      const oldKeys = new Set(Object.keys(oldVal));
      const newKeys = new Set(Object.keys(newVal));

      // Special handling for metadata object - filter out managed fields
      const keysToProcess =
        path === '/metadata'
          ? Array.from(newKeys).filter((key) => !managedMetadataFields.has(key))
          : Array.from(newKeys);

      // Process all keys from new object
      keysToProcess.forEach((key) => {
        const newPath = buildPath(path, key);
        compare(oldVal[key], newVal[key], newPath);
      });

      // Remove keys that exist in old but not in new (except managed fields)
      oldKeys.forEach((key) => {
        if (!newKeys.has(key)) {
          const newPath = buildPath(path, key);
          if (!shouldIgnorePath(newPath)) {
            // Additional check for metadata fields
            if (path !== '/metadata' || !managedMetadataFields.has(key)) {
              patches.push({ op: 'remove', path: newPath });
            }
          }
        }
      });

      return;
    }

    // For primitives or type changes, replace the value
    if (oldVal !== newVal) {
      patches.push({ op: 'replace', path, value: newVal });
    }
  };

  compare(oldObj, newObj, basePath);
  return patches;
};

/**
 * Simplified version that only generates patches for fields that exist in both objects
 * and ignores removals. Useful when you want to update specific fields without removing others.
 *
 * Also automatically filters out Kubernetes managed fields like status, resourceVersion, etc.
 *
 * @param oldObj - The original object (current state)
 * @param newObj - The desired object (target state)
 * @param basePath - The base path for the patches (default: '')
 * @returns Array of Patch operations (add/replace only, no remove)
 */
export const createNonDestructivePatches = (
  oldObj: unknown,
  newObj: unknown,
  basePath = '',
): Patch[] => {
  const allPatches = createPatchesFromDiff(oldObj, newObj, basePath);
  // Filter out 'remove' operations
  return allPatches.filter((patch) => patch.op !== 'remove');
};
