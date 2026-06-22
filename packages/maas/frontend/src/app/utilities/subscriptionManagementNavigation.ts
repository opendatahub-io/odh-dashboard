import { URL_PREFIX } from './const';

const SUBSCRIPTION_MANAGEMENT_PREFIX = `${URL_PREFIX}/subscription-management`;

export const getReturnToFromState = (state: unknown): string | undefined => {
  if (state == null || typeof state !== 'object' || !('returnTo' in state)) {
    return undefined;
  }

  const obj: Record<string, unknown> = Object.assign({}, state);
  const { returnTo } = obj;
  if (typeof returnTo !== 'string') {
    return undefined;
  }

  if (returnTo.startsWith(URL_PREFIX)) {
    return returnTo;
  }

  if (returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    return returnTo;
  }

  return undefined;
};

export const getBackUrl = (
  pathname: string,
  state: unknown,
  section: 'subscriptions' | 'auth-policies',
): string => {
  const returnTo = getReturnToFromState(state);
  if (returnTo) {
    return returnTo;
  }

  if (pathname.startsWith(`${SUBSCRIPTION_MANAGEMENT_PREFIX}/`)) {
    return `${SUBSCRIPTION_MANAGEMENT_PREFIX}/${section}`;
  }

  return `${URL_PREFIX}/${section}`;
};
