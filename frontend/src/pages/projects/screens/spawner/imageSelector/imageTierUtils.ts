import type { LabelProps } from '@patternfly/react-core';
import { ImageStreamKind } from '#~/k8sTypes';
import { ImageStreamAnnotation } from '#~/types';
import { compareImageStreamOrder } from '#~/pages/projects/screens/spawner/spawnerUtils';

const tierColors = new Map<string, LabelProps['color']>([
  ['secure', 'blue'],
  ['community', 'green'],
  ['custom', 'purple'],
]);

export const getImageTierColor = (tier: string): LabelProps['color'] =>
  tierColors.get(tier.toLowerCase()) ?? 'grey';

export const getImageStreamTier = (imageStream: ImageStreamKind): string =>
  imageStream.metadata.annotations?.[ImageStreamAnnotation.NOTEBOOK_TIER] || 'custom';

export const compareImageStreamTier = (a: ImageStreamKind, b: ImageStreamKind): number =>
  getImageStreamTier(a).localeCompare(getImageStreamTier(b)) || compareImageStreamOrder(a, b);
