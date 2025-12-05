/** MLflow base URL, proxied through dashboard. */
export const MLFLOW_PROXY_BASE_PATH = '/mlflow';

/** Default MLflow path to redirect to if no path is specified in the URL. */
export const MLFLOW_DEFAULT_PATH = '/experiments';

/** Query param key for encoding MLflow path in parent URL. */
export const MLFLOW_PATH_PARAM = 'path';

/** Builds the full MLflow iframe URL from a path. */
export const buildMlflowIframeUrl = (path: string): string => `${MLFLOW_PROXY_BASE_PATH}/#${path}`;

/** Extracts hash path from the Mlflow iframe URL, strips query params since we only sync the path portion. */
export const getIframeHashPath = (iframe: HTMLIFrameElement): string | null => {
  const iframeUrl = iframe.contentWindow?.location.href;
  if (!iframeUrl) {
    return null;
  }
  const hashIndex = iframeUrl.indexOf('#');
  if (hashIndex !== -1) {
    return iframeUrl.slice(hashIndex + 1).split('?')[0];
  }
  return null;
};

/** Prevents iframe history from mixing with parent history. */
export const patchIframeHistory = (iframe: HTMLIFrameElement, onNavigate: () => void): void => {
  // Same-origin iframe assumed
  const frameWindow = iframe.contentWindow;
  if (frameWindow) {
    const originalReplace = frameWindow.history.replaceState.bind(frameWindow.history);
    frameWindow.history.pushState = (...args) => {
      originalReplace(...args);
      onNavigate();
    };
    frameWindow.history.replaceState = (...args) => {
      originalReplace(...args);
      onNavigate();
    };
    frameWindow.addEventListener('popstate', onNavigate);
  }
};
