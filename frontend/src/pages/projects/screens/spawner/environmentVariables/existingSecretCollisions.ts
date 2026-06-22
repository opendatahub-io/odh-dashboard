import { ExistingSecretRef } from '#~/pages/projects/types';

export type KeyCollision = {
  key: string;
  sources: string[];
};

/**
 * Detect key name collisions across selected existing secret refs.
 * A collision occurs when two or more secrets have the same key selected.
 */
export const detectExistingSecretKeyCollisions = (
  existingSecretRefs: ExistingSecretRef[],
): KeyCollision[] => {
  const keySourceMap = new Map<string, string[]>();

  existingSecretRefs.forEach((ref) => {
    ref.selectedKeys.forEach((key) => {
      const sources = keySourceMap.get(key);
      if (sources) {
        sources.push(ref.secretName);
      } else {
        keySourceMap.set(key, [ref.secretName]);
      }
    });
  });

  const collisions: KeyCollision[] = [];
  keySourceMap.forEach((sources, key) => {
    if (sources.length > 1) {
      collisions.push({ key, sources });
    }
  });

  return collisions;
};

/**
 * Build a Set of key names that are colliding, for quick per-key lookup.
 */
export const getCollidingKeySet = (collisions: KeyCollision[]): Set<string> =>
  new Set(collisions.map((c) => c.key));
