import type { LabelProps } from '@patternfly/react-core';
import { ImageStreamKind } from '#~/k8sTypes';
import { ImageStreamAnnotation } from '#~/types';
import { compareImageStreamOrder } from '#~/pages/projects/screens/spawner/spawnerUtils';

const tierColors = new Map<string, LabelProps['color']>([
  ['secure', 'blue'],
  ['community', 'green'],
  ['custom', 'purple'],
]);

const tierOrder = new Map<string, number>([
  ['secure', 0],
  ['community', 1],
  ['custom', 2],
]);

export const getImageTierColor = (tier: string): LabelProps['color'] =>
  tierColors.get(tier.toLowerCase()) ?? 'grey';

export const getImageStreamTier = (imageStream: ImageStreamKind): string =>
  imageStream.metadata.annotations?.[ImageStreamAnnotation.NOTEBOOK_TIER]?.toLowerCase() ||
  'custom';

export const compareImageStreamTier = (a: ImageStreamKind, b: ImageStreamKind): number => {
  const tierA = getImageStreamTier(a);
  const tierB = getImageStreamTier(b);
  return (
    (tierOrder.get(tierA) ?? tierOrder.size) - (tierOrder.get(tierB) ?? tierOrder.size) ||
    tierA.localeCompare(tierB) ||
    compareImageStreamOrder(a, b)
  );
};
