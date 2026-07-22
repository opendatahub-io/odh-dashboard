import { URL_PREFIX } from './const';

const SUBSCRIPTION_MANAGEMENT_PREFIX = `${URL_PREFIX}/maas-governance`;

export const getPreSelectedModelFromState = (
  state: unknown,
): { name: string; namespace?: string } | undefined => {
  if (state == null || typeof state !== 'object' || !('preSelectedModel' in state)) {
    return undefined;
  }
  const obj: Record<string, unknown> = Object.assign({}, state);
  const { preSelectedModel } = obj;
  if (
    preSelectedModel == null ||
    typeof preSelectedModel !== 'object' ||
    !('name' in preSelectedModel)
  ) {
    return undefined;
  }
  const model: Record<string, unknown> = Object.assign({}, preSelectedModel);
  if (typeof model.name !== 'string') {
    return undefined;
  }
  const namespace = typeof model.namespace === 'string' ? model.namespace : undefined;
  return { name: model.name, namespace };
};

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

export const getBreadcrumbLabelFromState = (state: unknown): string | undefined => {
  if (state == null || typeof state !== 'object' || !('breadcrumbLabel' in state)) {
    return undefined;
  }
  const obj: Record<string, unknown> = Object.assign({}, state);
  return typeof obj.breadcrumbLabel === 'string' ? obj.breadcrumbLabel : undefined;
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
