import * as React from 'react';
import { getRoute } from '#~/api';

// separate from useRouteForNotebook within projects directory. This one does not poll
const useRouteForNotebook = (
  notebookName?: string,
  projectName?: string,
  isRunning?: boolean,
): [routeLink: string | null, loaded: boolean, loadError: Error | null] => {
  const [route, setRoute] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const getNotebookRedirectLink = () => {
      if (notebookName && projectName) {
        getRoute(notebookName, projectName)
          .then((fetchedRoute) => {
            setRoute(`https://${fetchedRoute.spec.host}/notebook/${projectName}/${notebookName}`);
            setLoadError(null);
            setLoaded(true);
          })
          .catch((e) => {
            if (!isRunning && e.statusObject?.code === 404) {
              setLoadError(null);
            } else {
              setLoadError(e);
            }
          });
      }
    };
    getNotebookRedirectLink();
  }, [notebookName, projectName, isRunning]);

  return [route, loaded, loadError];
};

export default useRouteForNotebook;
