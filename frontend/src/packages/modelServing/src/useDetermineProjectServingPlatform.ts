import { SupportedServingPlatform } from '~/concepts/modelServing/platforms/const';
import { ProjectKind } from '~/k8sTypes';
import { determineProjectServingPlatform } from '~/concepts/modelServing/platforms/exports';
import useAvailableServingPlatforms from '~/packages/modelServing/src/useAvailableServingPlatforms';

const useDetermineServingPlatforms = (project: ProjectKind): SupportedServingPlatform | null =>
  useAvailableServingPlatforms().find((platform) =>
    determineProjectServingPlatform[platform](project),
  ) ?? null;

export default useDetermineServingPlatforms;
