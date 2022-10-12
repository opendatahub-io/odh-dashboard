import { NavigateFunction } from 'react-router';

export const setQueryArgument = (navigate: NavigateFunction, k: string, v: string): void => {
  const params = new URLSearchParams(window.location.search);
  if (params.get(k) !== v) {
    params.set(k, v);
    const url = new URL(window.location.href);
    navigate(`${url.pathname}?${params.toString()}${url.hash}`, { replace: true });
  }
};

export const removeQueryArgument = (navigate: NavigateFunction, k: string): void => {
  const params = new URLSearchParams(window.location.search);
  if (params.has(k)) {
    params.delete(k);
    const url = new URL(window.location.href);
    navigate(`${url.pathname}?${params.toString()}${url.hash}`, { replace: true });
  }
};
