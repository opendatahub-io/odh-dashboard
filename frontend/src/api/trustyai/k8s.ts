import { K8sAPIOptions, RouteKind } from '~/k8sTypes';
import { getRoute } from '~/api';
import { TRUSTYAI_ROUTE_NAME } from '~/concepts/explainability/const';

export const getTrustyAIAPIRoute = async (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<RouteKind> => getRoute(TRUSTYAI_ROUTE_NAME, namespace, opts);
