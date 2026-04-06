import * as React from 'react';
import useFetch, { NotReadyError } from '@odh-dashboard/internal/utilities/useFetch';
import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { GatewayModel, HTTPRouteModel } from '@odh-dashboard/internal/api/models';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { GatewayResource, HTTPRouteResource } from '../k8sTypes';

const GATEWAY_NAME = 'data-science-gateway';
const GATEWAY_NAMESPACE = 'openshift-ingress';

const getGateway = (): Promise<GatewayResource> =>
  k8sGetResource<GatewayResource>({
    model: GatewayModel,
    queryOptions: { name: GATEWAY_NAME, ns: GATEWAY_NAMESPACE },
  });

const getHTTPRoute = (name: string, namespace: string): Promise<HTTPRouteResource> =>
  k8sGetResource<HTTPRouteResource>({
    model: HTTPRouteModel,
    queryOptions: { name, ns: namespace },
  });

/**
 * Fetches the Gateway hostname from the cluster-wide `data-science-gateway`.
 * The result is shared across all consumers since the Gateway is a singleton.
 */
export const useGatewayHostname = (): {
  hostname: string | null;
  loaded: boolean;
  error: Error | undefined;
} => {
  const { data, loaded, error } = useFetch<GatewayResource | null>(
    React.useCallback(() => getGateway(), []),
    null,
    { initialPromisePurity: true },
  );

  return React.useMemo(
    () => ({
      hostname: data?.spec?.listeners?.[0]?.hostname ?? null,
      loaded,
      error,
    }),
    [data, loaded, error],
  );
};

/**
 * Build the RayCluster dashboard URL from Gateway hostname + HTTPRoute path.
 *
 * Gateway: `data-science-gateway` in `openshift-ingress` -> spec.listeners[0].hostname
 * HTTPRoute: `<namespace>-<clustername>` in the dashboard namespace -> spec.rules[0].filters[0].requestRedirect.path.replaceFullPath
 *
 * Final URL: https://<hostname><path>
 */
export const useRayClusterDashboardURL = (
  rayClusterName: string | undefined,
  namespace: string,
): { url: string | null; loaded: boolean; error: Error | undefined } => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { hostname, loaded: gatewayLoaded, error: gatewayError } = useGatewayHostname();

  const {
    data: httpRoute,
    loaded: routeLoaded,
    error: routeError,
  } = useFetch<HTTPRouteResource | null>(
    React.useCallback(() => {
      if (!rayClusterName || !dashboardNamespace) {
        return Promise.reject(new NotReadyError('Missing cluster name or dashboard namespace'));
      }
      return getHTTPRoute(`${namespace}-${rayClusterName}`, dashboardNamespace);
    }, [rayClusterName, namespace, dashboardNamespace]),
    null,
    { initialPromisePurity: true },
  );

  return React.useMemo(() => {
    const loaded =
      (gatewayLoaded || !!gatewayError) &&
      (routeLoaded || !!routeError || !rayClusterName || !dashboardNamespace);
    const error = gatewayError ?? routeError;

    if (!loaded || !hostname || !rayClusterName) {
      return { url: null, loaded, error };
    }

    const redirect = httpRoute?.spec?.rules?.[0]?.filters?.[0]?.requestRedirect;
    const path = redirect?.path?.replaceFullPath;

    return { url: path ? `https://${hostname}${path}` : null, loaded, error };
  }, [
    gatewayLoaded,
    routeLoaded,
    gatewayError,
    routeError,
    hostname,
    httpRoute,
    rayClusterName,
    dashboardNamespace,
  ]);
};
