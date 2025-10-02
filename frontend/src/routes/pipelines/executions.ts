export const executionsRootPath = '/develop-train/pipelines/executions';
export const globExecutionsAll = `${executionsRootPath}/*`;

export const executionsBaseRoute = (namespace: string | undefined): string =>
  !namespace ? executionsRootPath : `${executionsRootPath}/${namespace}`;

export const executionDetailsRoute = (
  namespace: string | undefined,
  executionId: string | undefined,
): string =>
  !executionId
    ? executionsBaseRoute(namespace)
    : `${executionsBaseRoute(namespace)}/${executionId}`;
