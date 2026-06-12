import * as React from 'react';
import useFetch, { NotReadyError } from '@odh-dashboard/internal/utilities/useFetch';
import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { GatewayModel, HTTPRouteModel } from '@odh-dashboard/internal/api/models';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import type { K8sModelCommon, K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { GatewayResource, HTTPRouteResource } from '../k8sTypes';

const GATEWAY_NAME = 'data-science-gateway';
const GATEWAY_NAMESPACE = 'openshift-ingress';
const GATEWAY_CONFIG_NAME = 'default-gateway';

const GatewayConfigModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'services.platform.opendatahub.io',
  kind: 'GatewayConfig',
  plural: 'gatewayconfigs',
};

type GatewayConfigResource = K8sResourceCommon & {
  spec?: { domain?: string };
  status?: { domain?: string };
};

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
  } = useFetch<GatewayResource | null>(
    React.useCallback(() => getGateway(), []),
    null,
    { initialPromisePurity: true },
  );

  const {
    data: gatewayConfig,
    loaded: configLoaded,
    error: configError,
  } = useFetch<GatewayConfigResource | null>(
    React.useCallback(() => getGatewayConfig(), []),
    null,
    { initialPromisePurity: true },
  );

  const hostname =
    gateway?.spec?.listeners?.[0]?.hostname ?? // ← Gateway API mode
    gatewayConfig?.status?.domain ?? // ← OcpRoute mode
    gatewayConfig?.spec?.domain ?? // ← older/other clusters
    null;

  return React.useMemo(
    () => ({
      hostname,
      loaded: (gatewayLoaded || !!gatewayError) && (configLoaded || !!configError),
      // Only surface errors when no hostname could be resolved — avoid showing an error
      error: hostname ? undefined : gatewayError ?? configError,
    }),
    [hostname, gatewayLoaded, configLoaded, gatewayError, configError],
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
