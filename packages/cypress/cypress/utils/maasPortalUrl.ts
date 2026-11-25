/** Base route segment where the MaaS Portal is mounted. */
const MAAS_PORTAL_PATH = '/maas-portal';

/**
 * Returns whether the given URL belongs to the MaaS Portal: pathname equals `/maas-portal` or sits
 * inside `/maas-portal/`. Lookalike prefixes that are not true children—`/maas-portal-x` for
 * example—are rejected.
 */
export const isMaaSPortalUrl = (url: string): boolean => {
  const { pathname } = new URL(url);
  return pathname === MAAS_PORTAL_PATH || pathname.startsWith(`${MAAS_PORTAL_PATH}/`);
};
