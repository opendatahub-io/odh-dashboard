import { DEPLOY_BUTTON_TOOLTIP } from '@odh-dashboard/model-serving/shared';

export const getDeployButtonState = (
  availablePlatformIds: string[],
  requireKserve = false,
): { enabled?: boolean; tooltip?: string } => {
  if (availablePlatformIds.length === 0) {
    return {
      enabled: false,
      tooltip: DEPLOY_BUTTON_TOOLTIP.ENABLE_MODEL_SERVING_PLATFORM,
    };
  }

  if (requireKserve && !availablePlatformIds.includes('kserve')) {
    return {
      enabled: false,
      tooltip: DEPLOY_BUTTON_TOOLTIP.ENABLE_SINGLE_MODEL_SERVING,
    };
  }

  return {
    enabled: true,
  };
};
