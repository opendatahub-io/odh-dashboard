import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { RouteModel } from '~/api/models';
import { K8sAPIOptions, RouteKind, List } from '~/k8sTypes';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';

export const getRoute = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<RouteKind> =>
  k8sGetResource<RouteKind>(
    applyK8sAPIOptions(opts, {
      model: RouteModel,
      queryOptions: { name, ns: namespace },
    }),
  );

export const getGatewayRoute = (
  namespace: string,
  gatewayName: string,
): Promise<RouteKind | null> => {
  const labelSelector = `maistra.io/gateway-name=${gatewayName}`;
  const queryOptions = {
    ns: namespace,
    labelSelector,
  };
  return k8sGetResource<List<RouteKind>>({ model: RouteModel, queryOptions })
    .then((response) => {
      const routes = response.items.filter(
        (route) => route.metadata?.labels?.['maistra.io/gateway-name'] === gatewayName,
      );
      return routes.length > 0 ? routes[0] : null;
    })
    .catch(() => null);
};
