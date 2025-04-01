import * as React from 'react';
import { SupportedServingPlatform } from '~/concepts/modelServing/platforms/const';
import {
  DetermineServingPlatform,
  SelectServingCard,
  ServingAvailable,
  ServingExport,
} from '~/concepts/modelServing/platforms/types';
import ModelMeshLabel from '~/concepts/modelServing/platforms/modelMesh/ModelMeshLabel';
import KServeLabel from '~/concepts/modelServing/platforms/kserve/KServeLabel';
import {
  isProjectKServe,
  useIsKServeAvailable,
} from '~/concepts/modelServing/platforms/kserve/determineServing';
import {
  isProjectModelMesh,
  useIsModelMeshAvailable,
} from '~/concepts/modelServing/platforms/modelMesh/determineServing';
import EmptySingleModelServingCard from '~/concepts/modelServing/platforms/kserve/EmptySingleModelServingCard';
import EmptyMultiModelServingCard from '~/concepts/modelServing/platforms/modelMesh/EmptyMultiModelServingCard';

export const ServingLabel: ServingExport<React.FC> = {
  [SupportedServingPlatform.KSERVE]: KServeLabel,
  [SupportedServingPlatform.MODEL_MESH]: ModelMeshLabel,
};

export const determineProjectServingPlatform: ServingExport<DetermineServingPlatform> = {
  [SupportedServingPlatform.KSERVE]: isProjectKServe,
  [SupportedServingPlatform.MODEL_MESH]: isProjectModelMesh,
};

export const isServingEnabledHook: ServingExport<ServingAvailable> = {
  [SupportedServingPlatform.KSERVE]: useIsKServeAvailable,
  [SupportedServingPlatform.MODEL_MESH]: useIsModelMeshAvailable,
};

export const ProjectEnableCards: ServingExport<SelectServingCard> = {
  [SupportedServingPlatform.KSERVE]: EmptySingleModelServingCard,
  [SupportedServingPlatform.MODEL_MESH]: EmptyMultiModelServingCard,
};
