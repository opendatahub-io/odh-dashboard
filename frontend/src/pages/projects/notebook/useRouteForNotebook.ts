import * as React from 'react';
import { getServiceMeshGwHost, getRoute } from '~/api';
import { FAST_POLL_INTERVAL } from '~/utilities/const';
import useServiceMeshEnabled from './useServiceMeshEnabled';

const useRouteForNotebook = (
  notebookName?: string,
  projectName?: string,
  isRunning?: boolean,
): [routeLink: string | null, loaded: boolean, loadError: Error | null] => {
  const [route, setRoute] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | null>(null);
  const enableServiceMesh = useServiceMeshEnabled();

  React.useEffect(() => {
    let watchHandle: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const watchRoute = () => {
      if (cancelled) {
        return;
      }
      if (notebookName && projectName) {
        // if not using service mesh fetch openshift route, otherwise get Istio Ingress Gateway route
        const getRoutePromise = !enableServiceMesh
          ? getRoute(notebookName, projectName).then((route) => route?.spec.host)
          : getServiceMeshGwHost(projectName);

        getRoutePromise
          .then((host) => {
            if (cancelled) {
              return;
            }
            setRoute(`https://${host}/notebook/${projectName}/${notebookName}/`);
            setLoadError(null);
            setLoaded(true);
          })
          .catch((e) => {
            if (cancelled) {
              return;
            }
            if (!isRunning && e.statusObject?.code === 404) {
              setLoadError(null);
            } else {
              setLoadError(e);
            }
            watchHandle = setTimeout(watchRoute, FAST_POLL_INTERVAL);
          });
      }
    };
    watchRoute();
    return () => {
      cancelled = true;
      clearTimeout(watchHandle);
    };
  }, [notebookName, projectName, isRunning, enableServiceMesh]);

  return [route, loaded, loadError];
};

export default useRouteForNotebook;
