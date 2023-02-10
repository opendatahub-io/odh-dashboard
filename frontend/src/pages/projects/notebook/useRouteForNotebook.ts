import * as React from 'react';
import { getRoute } from '../../../api';
import { FAST_POLL_INTERVAL } from '../../../utilities/const';

const useRouteForNotebook = (
  notebookName?: string,
  projectName?: string,
): [routeLink: string | null, loaded: boolean, loadError: Error | null] => {
  const [route, setRoute] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let watchHandle;
    let cancelled = false;
    const watchRoute = () => {
      if (cancelled) {
        return;
      }
      if (notebookName && projectName) {
        getRoute(notebookName, projectName)
          .then((route) => {
            if (cancelled) {
              return;
            }
            setRoute(`https://${route.spec.host}/notebook/${projectName}/${notebookName}`);
            setLoadError(null);
            setLoaded(true);
          })
          .catch((e) => {
            if (cancelled) {
              return;
            }
            setLoadError(e);
            watchHandle = setTimeout(watchRoute, FAST_POLL_INTERVAL);
          });
      }
    };
    watchRoute();
    return () => {
      cancelled = true;
      clearTimeout(watchHandle);
    };
  }, [notebookName, projectName]);

  return [route, loaded, loadError];
};

export default useRouteForNotebook;
