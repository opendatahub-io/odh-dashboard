import * as React from 'react';
import { useMlflowEntityNames } from './MlflowEntityNamesContext';
import { parseEntityNamesFromResponse } from './mlflowParsers';

const patchedWindows = new WeakSet<Window>();
const originalFetchByWindow = new WeakMap<Window, typeof fetch>();

export const useMlflowFetchInterceptor = (iframeRef: React.RefObject<HTMLIFrameElement>): void => {
  const { setName } = useMlflowEntityNames();
  const setNameRef = React.useRef(setName);
  React.useEffect(() => {
    setNameRef.current = setName;
  }, [setName]);

  React.useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const patchFetch = (): void => {
      const iframeWindow = iframe.contentWindow;
      if (!iframeWindow || patchedWindows.has(iframeWindow)) return;

      const originalFetch = iframeWindow.fetch.bind(iframeWindow);
      originalFetchByWindow.set(iframeWindow, originalFetch);

      iframeWindow.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
        const response = await originalFetch(...args);
        void parseEntityNamesFromResponse(response.clone(), setNameRef.current).catch(() => {
          // ignore
        });
        return response;
      };
      patchedWindows.add(iframeWindow);
    };

    patchFetch();
    const handleLoad = (): void => patchFetch();
    iframe.addEventListener('load', handleLoad);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      const iframeWindow = iframe.contentWindow;
      const original = iframeWindow ? originalFetchByWindow.get(iframeWindow) : undefined;
      if (iframeWindow && original) {
        iframeWindow.fetch = original;
        patchedWindows.delete(iframeWindow);
        originalFetchByWindow.delete(iframeWindow);
      }
    };
  }, [iframeRef]);
};
