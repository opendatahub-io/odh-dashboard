import { ExistingSecretRef } from '#~/pages/projects/types';

export type KeyCollision = {
  key: string;
  sources: string[];
};

/**
 * Detect key name collisions across selected existing secret refs and
 * optionally against external key names (inline env vars, connections).
 * A collision occurs when two or more sources share the same key name.
 */
export const detectExistingSecretKeyCollisions = (
  existingSecretRefs: ExistingSecretRef[],
  externalKeyNames?: Set<string>,
): KeyCollision[] => {
  const keySourceMap = new Map<string, Set<string>>();

  existingSecretRefs.forEach((ref) => {
    ref.selectedKeys.forEach((key) => {
      const sources = keySourceMap.get(key) ?? new Set<string>();
      sources.add(ref.secretName);
      keySourceMap.set(key, sources);
    });
  });

  const collisions: KeyCollision[] = [];
  keySourceMap.forEach((sources, key) => {
    const hasExternalCollision = externalKeyNames?.has(key);
    if (sources.size > 1 || hasExternalCollision) {
      const sourceList = Array.from(sources);
      collisions.push({
        key,
        sources: hasExternalCollision ? [...sourceList, 'another variable'] : sourceList,
      });
    }
  });

  return collisions;
};

/**
 * Build a Set of key names that are colliding, for quick per-key lookup.
 */
export const getCollidingKeySet = (collisions: KeyCollision[]): Set<string> =>
  new Set(collisions.map((c) => c.key));
