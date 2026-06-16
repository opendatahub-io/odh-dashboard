import { URL_PREFIX } from './const';

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
