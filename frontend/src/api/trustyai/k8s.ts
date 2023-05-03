import { K8sAPIOptions, RouteKind } from '~/k8sTypes';
import { getRoute } from '~/api';

const TRUSTYAI_ROUTE_NAME = 'trustyai';
export const getTrustyAIAPIRoute = async (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<RouteKind> => getRoute(TRUSTYAI_ROUTE_NAME, namespace, opts);
