import {
  servingPlatformOrder,
  SupportedServingPlatform,
} from '~/concepts/modelServing/platforms/const';
import { isEnumMember } from '~/utilities/utils';

export const keysAsSupportedServingPlatform = (
  record: Record<SupportedServingPlatform, unknown>,
): SupportedServingPlatform[] =>
  Object.keys(record).filter((key: string): key is SupportedServingPlatform =>
    isEnumMember(key, SupportedServingPlatform),
  );

export const sortServingByPlatformOrder = (
  platformA: SupportedServingPlatform,
  platformB: SupportedServingPlatform,
): number => servingPlatformOrder.indexOf(platformA) - servingPlatformOrder.indexOf(platformB);

export const toServingPlatformOrderedArray = <Type>(
  servingPlatforms: Record<SupportedServingPlatform, Type>,
): Type[] =>
  keysAsSupportedServingPlatform(servingPlatforms)
    .toSorted(sortServingByPlatformOrder)
    .map((platform) => servingPlatforms[platform]);
