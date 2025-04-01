import {
  DetermineServingPlatform,
  ServingAvailable,
} from '~/concepts/modelServing/platforms/types';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

export const isProjectModelMesh: DetermineServingPlatform = (project) =>
  project.metadata.labels?.['modelmesh-enabled'] === 'true';

export const useIsModelMeshAvailable: ServingAvailable = () =>
  useIsAreaAvailable(SupportedArea.MODEL_MESH).status;
