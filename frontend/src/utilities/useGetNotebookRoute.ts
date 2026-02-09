import * as React from 'react';
import { getRoute } from '#~/services/routeService';
import { getRoutePathForWorkbench } from '#~/concepts/notebooks/utils';
import { listRoutes } from '#~/api/k8s/routes';

export const useGetNotebookRoute = (
  workbenchNamespace?: string,
  workbenchName?: string,
  injectAuth?: boolean,
  isNotebookController?: boolean,
): string | undefined => {
  const [route, setRoute] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (!workbenchNamespace || !workbenchName) {
      return undefined;
    }

    if (injectAuth) {
      setRoute(getRoutePathForWorkbench(workbenchNamespace, workbenchName));
    } else if (isNotebookController) {
      getRoute(workbenchNamespace, workbenchName).then((fetchedRoute) => {
        setRoute(
          `https://${fetchedRoute.spec.host}/notebook/${workbenchNamespace}/${workbenchName}`,
        );
      });
    } else {
      listRoutes(workbenchNamespace, `notebook-name=${workbenchName}`).then((routes) => {
        if (routes.length > 0) {
          setRoute(
            `https://${routes[0].spec.host}/notebook/${workbenchNamespace}/${workbenchName}`,
          );
        } else {
          setRoute(undefined);
        }
      });
    }
  }, [workbenchNamespace, workbenchName, injectAuth, isNotebookController]);
  return route;
};
