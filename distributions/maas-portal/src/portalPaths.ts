/**
 * Browser-visible mount point for the MaaS Portal.
 * Keep in sync with the portal HTTPRoute and rspack BASE_PATH constants.
 */
export const PORTAL_BASE_PATH = '/maas-portal';

/** Internal route; React Router applies PORTAL_BASE_PATH as its basename. */
export const PORTAL_ROOT_REDIRECT_PATH = '/gen-ai-studio/assets';

export const PORTAL_MODELS_PATH = '/maas/models';

/** Read-only model access page (the MaaS governance subscriptions table). */
export const PORTAL_MODEL_ACCESS_PATH = '/maas/model-access';
