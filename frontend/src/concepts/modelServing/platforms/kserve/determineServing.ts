import {
  DetermineServingPlatform,
  ServingAvailable,
} from '~/concepts/modelServing/platforms/types';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

export const isProjectKServe: DetermineServingPlatform = (project) =>
  project.metadata.labels?.['modelmesh-enabled'] === 'false';

export const useIsKServeAvailable: ServingAvailable = () =>
  useIsAreaAvailable(SupportedArea.K_SERVE).status;
