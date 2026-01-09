export const MLFLOW_EXPERIMENTS_ROUTE = '/develop-train/experiments-mlflow';
export const MLFLOW_PROXY_BASE_PATH = '/mlflow';
export const MLFLOW_DEFAULT_PATH = '/experiments';

export const buildIframePathQuery = (hashPathQuery: string): string =>
  `${MLFLOW_PROXY_BASE_PATH}/#${hashPathQuery}`;

export const getIframeHashPathQuery = (iframe: HTMLIFrameElement): string | null => {
  const iframePathQuery = iframe.contentWindow?.location.href;
  if (!iframePathQuery) {
    return null;
  }
  const hashIndex = iframePathQuery.indexOf('#');
  return hashIndex !== -1 ? iframePathQuery.slice(hashIndex + 1) : null;
};

export const buildParentPathQuery = (pathname: string, search: string): string => {
  const subPath = pathname.startsWith(MLFLOW_EXPERIMENTS_ROUTE)
    ? pathname.substring(MLFLOW_EXPERIMENTS_ROUTE.length)
    : pathname;
  const cleanPath = subPath === '' || subPath === '/' ? MLFLOW_DEFAULT_PATH : subPath;
  return search ? `${cleanPath}${search}` : cleanPath;
};

export const normalizePathQuery = (path: string | null): string | null => {
  if (!path) {
    return null;
  }
  const [pathname, query = ''] = path.split('?');
  if (!query) {
    return pathname || null;
  }
  const searchParams = new URLSearchParams(query).toString();
  return searchParams ? `${pathname}?${searchParams}` : pathname || null;
};

export const patchIframeHistory = (
  iframe: HTMLIFrameElement,
  onNavigate: (isPush: boolean) => void,
): (() => void) | undefined => {
  const frameWindow = iframe.contentWindow;
  if (!frameWindow) {
    return undefined;
  }
  const originalPush = frameWindow.history.pushState.bind(frameWindow.history);
  const originalReplace = frameWindow.history.replaceState.bind(frameWindow.history);
  frameWindow.history.pushState = (...args) => {
    originalReplace(...args);
    onNavigate(true);
  };
  frameWindow.history.replaceState = (...args) => {
    originalReplace(...args);
    onNavigate(false);
  };
  const onPopstate = () => onNavigate(false);
  const onHashChange = () => onNavigate(false);

  frameWindow.addEventListener('popstate', onPopstate);
  frameWindow.addEventListener('hashchange', onHashChange);

  return () => {
    if (iframe.contentWindow === frameWindow) {
      frameWindow.history.pushState = originalPush;
      frameWindow.history.replaceState = originalReplace;
      frameWindow.removeEventListener('popstate', onPopstate);
      frameWindow.removeEventListener('hashchange', onHashChange);
    }
  };
};
