import { ServingExport } from '~/concepts/modelServing/platforms/types';
import { SupportedServingPlatform } from '~/concepts/modelServing/platforms/const';
import {
  keysAsSupportedServingPlatform,
  sortServingByPlatformOrder,
} from '~/concepts/modelServing/platforms/utils';

export const trimForActiveServing = <T>(
  servingExport: ServingExport<T>,
  availableServingPlatforms: SupportedServingPlatform[],
): T[] =>
  keysAsSupportedServingPlatform(servingExport)
    .filter((platform) => availableServingPlatforms.includes(platform))
    .toSorted(sortServingByPlatformOrder)
    .map((platform) => servingExport[platform]);
