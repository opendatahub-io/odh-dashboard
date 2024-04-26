export const executionsRootPath = '/executions';
export const globExecutionsAll = `${executionsRootPath}/*`;

export const executionsBaseRoute = (namespace: string | undefined): string =>
  !namespace ? executionsRootPath : `${executionsRootPath}/${namespace}`;
