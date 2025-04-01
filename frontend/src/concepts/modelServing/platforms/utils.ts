import {
  servingPlatformOrder,
  SupportedServingPlatform,
} from '~/concepts/modelServing/platforms/const';
import { isEnumMember } from '~/utilities/utils';

export const toServingPlatformOrderedArray = <Type>(
  servingPlatforms: Record<SupportedServingPlatform, Type>,
): Type[] =>
  Object.keys(servingPlatforms)
    .filter((key): key is SupportedServingPlatform => isEnumMember(key, SupportedServingPlatform))
    .toSorted(
      (platformA, platformB) =>
        servingPlatformOrder.indexOf(platformB) - servingPlatformOrder.indexOf(platformA),
    )
    .map((platform) => servingPlatforms[platform]);
