const DEPLOY_BUTTON_TOOLTIP = {
  ENABLE_SINGLE_MODEL_SERVING:
    'To deploy this model, an administrator must first enable single-model serving in the cluster settings.',
  ENABLE_MODEL_SERVING_PLATFORM:
    'To enable model serving, an administrator must first select a model serving platform in the cluster settings.',
};

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
