import {
  servingPlatformOrder,
  SupportedServingPlatform,
} from '~/concepts/modelServing/platforms/const';
import { isServingEnabledHook } from '~/concepts/modelServing/platforms/exports';
import { toServingPlatformOrderedArray } from '~/concepts/modelServing/platforms/utils';

type Output = SupportedServingPlatform | null;
const toServingOrder = (bool: boolean, idx: number): Output =>
  bool ? servingPlatformOrder[idx] : null;
const onlySupportedPlatforms = (v: Output): v is SupportedServingPlatform => !!v;

const useAvailableServingPlatforms = (): SupportedServingPlatform[] =>
  toServingPlatformOrderedArray<boolean>({
    [SupportedServingPlatform.KSERVE]: isServingEnabledHook[SupportedServingPlatform.KSERVE](),
    [SupportedServingPlatform.MODEL_MESH]:
      isServingEnabledHook[SupportedServingPlatform.MODEL_MESH](),
  })
    .map(toServingOrder)
    .filter(onlySupportedPlatforms);

export default useAvailableServingPlatforms;
