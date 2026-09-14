/**
 * Browser-visible mount point for the MaaS Consumer Portal.
 * Keep in sync with the portal HTTPRoute and rspack BASE_PATH constants.
 */
export const PORTAL_BASE_PATH = '/maas-consumer-portal';

/** Internal route; React Router applies PORTAL_BASE_PATH as its basename. */
export const PORTAL_ROOT_REDIRECT_PATH = '/maas/keys-and-subs';
