/**
 * In v3.0, the accessing of a Workbench will be assuming a shared gateway route with Dashboard.
 * Leveraging browser feature of "same-origin" on the use of slash (/) links.
 */
export const getRoutePathForWorkbench = (
  workbenchNamespace: string,
  workbenchName: string,
): string => `/notebook/${workbenchNamespace}/${workbenchName}`;
