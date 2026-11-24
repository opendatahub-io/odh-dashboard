import { MetadataAnnotation, type ImagePullSecret } from '@odh-dashboard/k8s-core';
import { getPVCNameFromURI } from './pvcUtils';

export type ConnectedModelResourceReference = {
  annotations?: Record<string, string | undefined>;
  storageKey?: string;
  imagePullSecrets?: ImagePullSecret[];
  storageUri?: string;
};

export type ConnectedResourceKind = 'connection' | 'pvc';

/**
 * Returns whether a model serving resource references the given connection or PVC.
 *
 * Callers map their platform-specific resource shape to the common reference fields.
 */
export const modelServingResourceUsesResource = (
  reference: ConnectedModelResourceReference,
  resourceName: string,
  resourceKind: ConnectedResourceKind,
): boolean =>
  resourceKind === 'connection'
    ? reference.annotations?.[MetadataAnnotation.ConnectionName] === resourceName ||
      reference.storageKey === resourceName ||
      !!reference.imagePullSecrets?.some((secret) => secret.name === resourceName)
    : getPVCNameFromURI(reference.storageUri ?? '') === resourceName;
