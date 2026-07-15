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
    const hasExternalCollision = externalKeyNames?.has(key);
    if (sources.length > 1 || hasExternalCollision) {
      collisions.push({
        key,
        sources: hasExternalCollision ? [...sources, 'another variable'] : sources,
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
