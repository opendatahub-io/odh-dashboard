import * as React from 'react';
import { OdhGettingStarted } from '../types';
import { fetchGettingStartedDoc } from '../services/gettingStartedService';

export const useGettingStarted = (
  appName: string | undefined,
): {
  odhGettingStarted: OdhGettingStarted | undefined;
  loaded: boolean;
  loadError: Error | undefined;
} => {
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [odhGettingStarted, setOdhGettingStarted] = React.useState<OdhGettingStarted>();

  React.useEffect(() => {
    let cancelled = false;
    if (!appName) {
      return;
    }
    fetchGettingStartedDoc(appName)
      .then((gs: OdhGettingStarted) => {
        if (!cancelled) {
          setLoaded(true);
          setLoadError(undefined);
          setOdhGettingStarted(gs);
        }
      })
      .catch((e) => {
        setLoadError(e);
      });
    return () => {
      cancelled = true;
    };
  }, [appName]);

  return { odhGettingStarted, loaded, loadError };
};
