import * as React from 'react';
import { getRoute } from '../../../api';

const useRouteForNotebook = (
  notebookName?: string,
  projectName?: string,
): [routeLink: string | null, loaded: boolean, loadError: Error | null] => {
  const [route, setRoute] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let watchHandle;
    const watchRoute = () => {
      if (notebookName && projectName) {
        getRoute(notebookName, projectName)
          .then((route) => {
            setRoute(`https://${route.spec.host}/notebook/${projectName}/${notebookName}`);
            setLoaded(true);
          })
          .catch((e) => {
            setLoadError(e);
            watchHandle = setTimeout(watchRoute, 1000);
          });
      }
    };
    watchRoute();
    return () => clearTimeout(watchHandle);
  }, [notebookName, projectName]);

  return [route, loaded, loadError];
};

export default useRouteForNotebook;
