import type { SecretKind } from '@odh-dashboard/k8s-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import type { ExistingSecretRef, EnvVariable } from '#~/pages/projects/types';
import { SecretCategory } from '#~/pages/projects/types';
import type { Connection } from '#~/concepts/connectionTypes/types';

/**
 * Determines if a secret is eligible for the "Existing secret" dropdown.
 * Must be Opaque type and must not have any connection-related annotations.
 */
export const isExistingSecretEligible = (secret: SecretKind): boolean => {
  // Must be Opaque type (or unset, which defaults to Opaque)
  if (secret.type && secret.type !== 'Opaque') {
    return false;
  }
  // Filter out Connection secrets by annotation keys
  const annotations = secret.metadata.annotations || {};
  if (
    'opendatahub.io/connection-type' in annotations ||
    'opendatahub.io/connection-type-protocol' in annotations ||
    'opendatahub.io/connection-type-ref' in annotations
  ) {
    return false;
  }
  return true;
};

export type EnvVarSource = {
  type: 'existing-secret' | 'inline-secret' | 'connection';
  name: string;
};

export type EnvVarConflict = {
  key: string;
  sources: EnvVarSource[];
};

const addToSourceMap = (
  map: Map<string, EnvVarSource[]>,
  key: string,
  source: EnvVarSource,
): void => {
  const existing = map.get(key) || [];
  existing.push(source);
  map.set(key, existing);
};

export const detectEnvVarConflicts = (
  existingSecretRefs: ExistingSecretRef[],
  availableSecrets: SecretKind[],
  inlineEnvVars: EnvVariable[],
  connections: Connection[],
): EnvVarConflict[] => {
  const keySourceMap = new Map<string, EnvVarSource[]>();

  // 1. Collect keys from existing secret references
  for (const ref of existingSecretRefs) {
    const secret = availableSecrets.find((s) => s.metadata.name === ref.secretName);
    const keys = ref.allKeys ? Object.keys(secret?.data || {}) : ref.selectedKeys;
    for (const key of keys) {
      addToSourceMap(keySourceMap, key, {
        type: 'existing-secret',
        name: ref.secretName,
      });
    }
  }

  // 2. Collect keys from inline secrets (GENERIC and UPLOAD categories)
  for (const envVar of inlineEnvVars) {
    if (
      envVar.values?.category === SecretCategory.GENERIC ||
      envVar.values?.category === SecretCategory.UPLOAD
    ) {
      for (const entry of envVar.values.data) {
        if (entry.key) {
          addToSourceMap(keySourceMap, entry.key, {
            type: 'inline-secret',
            name: envVar.existingName || 'New secret',
          });
        }
      }
    }
  }

  // 3. Collect keys from connections
  for (const connection of connections) {
    if (connection.data) {
      for (const key of Object.keys(connection.data)) {
        addToSourceMap(keySourceMap, key, {
          type: 'connection',
          name: getDisplayNameFromK8sResource(connection),
        });
      }
    }
  }

  // Return only keys with multiple sources
  return Array.from(keySourceMap.entries())
    .filter(([, sources]) => sources.length > 1)
    .map(([key, sources]) => ({ key, sources }));
};
