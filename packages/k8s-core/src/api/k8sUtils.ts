import type {
  K8sGroupVersionKind,
  K8sModelCommon,
  K8sResourceCommon,
  Patch,
} from '@openshift/dynamic-plugin-sdk-utils';

export const groupVersionKind = (model: K8sModelCommon): K8sGroupVersionKind => ({
  group: model.apiGroup,
  version: model.apiVersion,
  kind: model.kind,
});

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

/**
 * Generates JSON Patch operations that transform an existing value into a desired value.
 * Kubernetes-managed status and metadata fields are excluded from the result.
 */
export const createPatchesFromDiff = (oldObj: unknown, newObj: unknown, basePath = ''): Patch[] => {
  const patches: Patch[] = [];
  const managedMetadataFields = new Set([
    'resourceVersion',
    'uid',
    'selfLink',
    'creationTimestamp',
    'deletionTimestamp',
    'deletionGracePeriodSeconds',
    'generation',
    'managedFields',
    'ownerReferences',
  ]);

  const shouldIgnorePath = (path: string): boolean => {
    if (path === '/status' || path.startsWith('/status/')) {
      return true;
    }

    if (path.startsWith('/metadata/')) {
      const field = path.split('/')[2];
      if (managedMetadataFields.has(field)) {
        return true;
      }
    }

    return false;
  };

  const escapePathComponent = (component: string): string =>
    component.replace(/~/g, '~0').replace(/\//g, '~1');

  const buildPath = (path: string, key: string | number): string => {
    const escapedKey = typeof key === 'string' ? escapePathComponent(key) : key.toString();
    return path === '' ? `/${escapedKey}` : `${path}/${escapedKey}`;
  };

  const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof RegExp);

  const areEqual = (a: unknown, b: unknown): boolean => {
    if (a === b) {
      return true;
    }
    if (a === null || b === null || a === undefined || b === undefined) {
      return false;
    }
    if (typeof a !== typeof b) {
      return false;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((item, index) => areEqual(item, b[index]));
    }

    if (isPlainObject(a) && isPlainObject(b)) {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      return keysA.length === keysB.length && keysA.every((key) => areEqual(a[key], b[key]));
    }

    return false;
  };

  const compare = (oldVal: unknown, newVal: unknown, path: string): void => {
    if (shouldIgnorePath(path) || areEqual(oldVal, newVal)) {
      return;
    }

    if (newVal === undefined || newVal === null) {
      if (oldVal !== undefined && oldVal !== null) {
        patches.push({ op: 'remove', path });
      }
      return;
    }

    if (oldVal === undefined || oldVal === null) {
      patches.push({ op: 'add', path, value: newVal });
      return;
    }

    if (Array.isArray(newVal)) {
      if (!Array.isArray(oldVal) || !areEqual(oldVal, newVal)) {
        patches.push({ op: 'replace', path, value: newVal });
      }
      return;
    }

    if (isPlainObject(newVal) && isPlainObject(oldVal)) {
      const oldKeys = new Set(Object.keys(oldVal));
      const newKeys = new Set(Object.keys(newVal));
      const keysToProcess =
        path === '/metadata'
          ? Array.from(newKeys).filter((key) => !managedMetadataFields.has(key))
          : Array.from(newKeys);

      keysToProcess.forEach((key) => compare(oldVal[key], newVal[key], buildPath(path, key)));

      oldKeys.forEach((key) => {
        if (!newKeys.has(key)) {
          const newPath = buildPath(path, key);
          if (!shouldIgnorePath(newPath)) {
            patches.push({ op: 'remove', path: newPath });
          }
        }
      });
      return;
    }

    patches.push({ op: 'replace', path, value: newVal });
  };

  compare(oldObj, newObj, basePath);
  return patches;
};

/** Generates only add and replace operations, leaving omitted fields untouched. */
export const createNonDestructivePatches = (
  oldObj: unknown,
  newObj: unknown,
  basePath = '',
): Patch[] =>
  createPatchesFromDiff(oldObj, newObj, basePath).filter((patch) => patch.op !== 'remove');
