import type { SecretKind } from '@odh-dashboard/k8s-core';

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
