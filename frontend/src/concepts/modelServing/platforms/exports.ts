import { SupportedServingPlatform } from '~/concepts/modelServing/platforms/const';
import {
  DetermineServingPlatform,
  ServingAvailable,
  ServingExport,
} from '~/concepts/modelServing/platforms/types';
import {
  isProjectKServe,
  useIsKServeAvailable,
} from '~/concepts/modelServing/platforms/kserve/determineServing';
import {
  isProjectModelMesh,
  useIsModelMeshAvailable,
} from '~/concepts/modelServing/platforms/modelMesh/determineServing';

export const determineProjectServingPlatform: ServingExport<DetermineServingPlatform> = {
  [SupportedServingPlatform.KSERVE]: isProjectKServe,
  [SupportedServingPlatform.MODEL_MESH]: isProjectModelMesh,
};

export const isServingEnabledHook: ServingExport<ServingAvailable> = {
  [SupportedServingPlatform.KSERVE]: useIsKServeAvailable,
  [SupportedServingPlatform.MODEL_MESH]: useIsModelMeshAvailable,
};
