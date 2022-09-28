import { OdhRoute } from 'types';

export const routes = {
  '/': 'Enabled',
  '/clusterSettings': 'Settings',
  '/enabled': 'Enabled',
  '/explore': 'Explore',
  '/groupSettings': 'Group Settings',
  '/notebook': 'Notebook',
  '/notebook/:namespace': (value: string): string => value,
  '/notebook/:namespace/:notebookName': (value: string): string => value,
  '/notebook/:namespace/:notebookName/logout': 'Log out',
  '/notebookController': 'Juypter',
  '/notebookController/spawner': 'Start a notebook server',
  '/notebookImages': 'Notebook Images',
  '/projects': 'Data Project',
  '/resources': 'Learning',
};

/**
 * Converts a URL path / route to an array of OdhRoute objects.
 * @param path Route that appears in the URL.
 * @returns Returns an array of strings that are the text for each route. If no route is found it will return null.
 */
export const pathToOdhRoute = (path: string): Array<OdhRoute | null> => {
  let odhRoutes: Array<OdhRoute | null> = [];
  const pths: string[] = path.split('/');
  // Drop the empty string that's created from the split
  pths.shift();

  let currentLookup = '';
  let currentPath = '';

  const tempRoutes = Object.entries(routes);

  odhRoutes = pths.map((value: string) => {
    currentPath = `${currentPath}/${value}`;
    currentLookup = value.charAt(0) === ':' ? `${currentLookup}/:` : `${currentLookup}/${value}`;
    let match;
    tempRoutes.find(([key]) => {
      if (key.includes(currentLookup)) {
        match = key;
        return true;
      }
      return false;
    });

    if (value.charAt(0) === ':') {
      currentLookup = match;
    }

    const routeLabel = match
      ? value.charAt(0) === ':'
        ? routes[match](value)
        : routes[match]
      : null;

    return routeLabel
      ? ({
          label: routeLabel,
          path: currentPath,
        } as OdhRoute)
      : null;
  });

  return odhRoutes;
};
