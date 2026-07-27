import * as React from 'react';
import useFetch, { NotReadyError } from '@odh-dashboard/ui-core/hooks/useFetch';
import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import {
  GatewayConfigModel,
  GatewayModel,
  HTTPRouteModel,
} from '@odh-dashboard/internal/api/models';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { GatewayConfigResource, GatewayResource, HTTPRouteResource } from '../k8sTypes';

const GATEWAY_NAME = 'data-science-gateway';
const GATEWAY_NAMESPACE = 'openshift-ingress';
const GATEWAY_CONFIG_NAME = 'default-gateway'; // Fixed cluster-scoped name created by the ODH operator.

// Ray HTTPRoutes may live in a different namespace than the dashboard pod (e.g. RHOAI uses
// redhat-ods-applications while the dashboard reports opendatahub from /api/status).
const RAY_HTTP_ROUTE_FALLBACK_NAMESPACES = ['redhat-ods-applications', 'opendatahub'] as const;

const normalizeHostname = (hostname?: string | null): string | null => hostname || null;

const hasStatusObject = (error: unknown): error is { statusObject?: { code?: number } } =>
  typeof error === 'object' && error !== null && 'statusObject' in error;

const isNotFoundError = (error: unknown): boolean =>
  hasStatusObject(error) && error.statusObject?.code === 404;

const getHttpRouteNamespaces = (dashboardNamespace: string): string[] => [
  ...new Set([dashboardNamespace, ...RAY_HTTP_ROUTE_FALLBACK_NAMESPACES]),
];

const getGateway = (): Promise<GatewayResource> =>
  k8sGetResource<GatewayResource>({
    model: GatewayModel,
    queryOptions: { name: GATEWAY_NAME, ns: GATEWAY_NAMESPACE },
  });

const getGatewayConfig = (): Promise<GatewayConfigResource> =>
  k8sGetResource<GatewayConfigResource>({
    model: GatewayConfigModel,
    queryOptions: { name: GATEWAY_CONFIG_NAME },
  });

const getHTTPRoute = (name: string, namespace: string): Promise<HTTPRouteResource> =>
  k8sGetResource<HTTPRouteResource>({
    model: HTTPRouteModel,
    queryOptions: { name, ns: namespace },
  });

const getHTTPRouteForRayCluster = async (
  routeName: string,
  dashboardNamespace: string,
): Promise<HTTPRouteResource | null> => {
  for (const routeNamespace of getHttpRouteNamespaces(dashboardNamespace)) {
    try {
      return await getHTTPRoute(routeName, routeNamespace);
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }
    }
  }

  // Missing HTTPRoute across all namespaces is a normal case (plain-text cluster name).
  return null;
};

/**
 * Fetches the Gateway hostname from the cluster-wide `data-science-gateway`.
 * Falls back to GatewayConfig `status.domain` (or `spec.domain`) when the Gateway listener has
 * no hostname (clusters using ingressMode: OcpRoute leave the hostname field unset).
 */
export const useGatewayHostname = (): {
  hostname: string | null;
  loaded: boolean;
  error: Error | undefined;
} => {
  const {
    data: gateway,
    loaded: gatewayLoaded,
    error: gatewayError,
  } = useFetch<GatewayResource | null>(getGateway, null, { initialPromisePurity: true });

  const gatewayHostname = normalizeHostname(gateway?.spec?.listeners?.[0]?.hostname);
  const gatewayReady = gatewayLoaded || !!gatewayError;

  const {
    data: gatewayConfig,
    loaded: configLoaded,
    error: configError,
  } = useFetch<GatewayConfigResource | null>(
    React.useCallback(() => {
      if (!gatewayReady) {
        return Promise.reject(new NotReadyError('Waiting for Gateway'));
      }
      if (gatewayHostname) {
        return Promise.reject(new NotReadyError('Gateway hostname already resolved'));
      }
      return getGatewayConfig();
    }, [gatewayReady, gatewayHostname]),
    null,
    // Keep prior GatewayConfig state when the callback identity changes so a Gateway error
    // does not reset configLoaded and flash the Ray cluster loading skeleton again.
    { initialPromisePurity: false },
  );

  const hostname =
    gatewayHostname ||
    normalizeHostname(gatewayConfig?.status?.domain) ||
    normalizeHostname(gatewayConfig?.spec?.domain);

  const configSettled = configLoaded || !!configError;

  return React.useMemo(
    () => ({
      hostname,
      loaded: !!gatewayHostname || (gatewayReady && configSettled),
      error: hostname ? undefined : gatewayError ?? configError,
    }),
    [hostname, gatewayHostname, gatewayReady, configSettled, gatewayError, configError],
  );
};

/**
 * Build the RayCluster dashboard URL from Gateway hostname + HTTPRoute path.
 *
 * Gateway: `data-science-gateway` in `openshift-ingress` -> spec.listeners[0].hostname
 * HTTPRoute: `<namespace>-<clustername>` in the dashboard namespace (with RHOAI fallbacks) ->
 * spec.rules[0].filters[0].requestRedirect.path.replaceFullPath
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
      return getHTTPRouteForRayCluster(`${namespace}-${rayClusterName}`, dashboardNamespace);
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
