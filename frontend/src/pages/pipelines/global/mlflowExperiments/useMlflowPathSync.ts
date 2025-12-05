import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  buildMlflowIframeUrl,
  getIframeHashPath,
  patchIframeHistory,
  MLFLOW_PATH_PARAM,
  MLFLOW_DEFAULT_PATH,
} from '#~/routes/pipelines/mlflowExperiments';

export const useMlflowPathSync = (
  iframeRef: React.RefObject<HTMLIFrameElement>,
): {
  iframeSrc: string;
} => {
  const [searchParams, setSearchParams] = useSearchParams();
  const lastSyncedPath = React.useRef<string | null>(null);
  const pathParam = searchParams.get(MLFLOW_PATH_PARAM);
  const currentPath = pathParam || MLFLOW_DEFAULT_PATH;
  const [iframeSrc, setIframeSrc] = React.useState(() => buildMlflowIframeUrl(currentPath));

  React.useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return undefined;
    }
    const syncIframeToParent = () => {
      const path = getIframeHashPath(iframe);
      if (path && path !== lastSyncedPath.current) {
        lastSyncedPath.current = path;
        const newParams = new URLSearchParams(searchParams);
        if (path === MLFLOW_DEFAULT_PATH) {
          newParams.delete(MLFLOW_PATH_PARAM);
        } else {
          newParams.set(MLFLOW_PATH_PARAM, path);
        }
        setSearchParams(newParams, { replace: true });
      }
    };
    const onLoad = () => {
      syncIframeToParent();
      patchIframeHistory(iframe, syncIframeToParent);
    };
    iframe.addEventListener('load', onLoad);
    return () => {
      iframe.removeEventListener('load', onLoad);
    };
  }, [iframeRef, searchParams, setSearchParams]);

  React.useEffect(() => {
    if (currentPath !== lastSyncedPath.current) {
      lastSyncedPath.current = currentPath;
      const newSrc = buildMlflowIframeUrl(currentPath);
      setIframeSrc(newSrc);

      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        iframe.contentWindow.location.replace(newSrc);
      }
    }
  }, [currentPath]);

  return { iframeSrc };
};
