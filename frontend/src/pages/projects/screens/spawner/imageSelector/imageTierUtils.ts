import { ImageStreamKind } from '#~/k8sTypes';
import { ImageStreamAnnotation } from '#~/types';
import { compareImageStreamOrder } from '#~/pages/projects/screens/spawner/spawnerUtils';

export const getImageStreamTier = (imageStream: ImageStreamKind): string =>
  imageStream.metadata.annotations?.[ImageStreamAnnotation.NOTEBOOK_TIER] || 'custom';

export const compareImageStreamTier = (a: ImageStreamKind, b: ImageStreamKind): number =>
  getImageStreamTier(a).localeCompare(getImageStreamTier(b)) || compareImageStreamOrder(a, b);
