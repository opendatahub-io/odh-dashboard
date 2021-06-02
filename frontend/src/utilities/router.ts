// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const setQueryArgument = (history, k: string, v: string) => {
  const params = new URLSearchParams(window.location.search);
  if (params.get(k) !== v) {
    params.set(k, v);
    const url = new URL(window.location.href);
    history.replace(`${url.pathname}?${params.toString()}${url.hash}`);
  }
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const removeQueryArgument = (history, k: string) => {
  const params = new URLSearchParams(window.location.search);
  if (params.has(k)) {
    params.delete(k);
    const url = new URL(window.location.href);
    history.replace(`${url.pathname}?${params.toString()}${url.hash}`);
  }
};
