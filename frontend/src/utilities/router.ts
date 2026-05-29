import { NavigateFunction } from 'react-router';

export const buildQueryArgumentUrl = (k: string, v?: string): string => {
  const params = new URLSearchParams(window.location.search);
  if (v === undefined) {
    params.delete(k);
  } else {
    params.set(k, v);
  }
  const url = new URL(window.location.href);
  const query = params.toString();
  return `${url.pathname}${query ? `?${query}` : ''}${url.hash}`;
};

export const setQueryArgument = (navigate: NavigateFunction, k: string, v: string): void => {
  const params = new URLSearchParams(window.location.search);
  if (params.get(k) !== v) {
    navigate(buildQueryArgumentUrl(k, v), { replace: true });
  }
};

export const removeQueryArgument = (navigate: NavigateFunction, k: string): void => {
  const params = new URLSearchParams(window.location.search);
  if (params.has(k)) {
    navigate(buildQueryArgumentUrl(k), { replace: true });
  }
};
