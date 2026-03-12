import * as React from 'react';
import { k8sGetResource, K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { GatewayModel, HTTPRouteModel } from '@odh-dashboard/internal/api/models';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';

const GATEWAY_NAME = 'data-science-gateway';
const GATEWAY_NAMESPACE = 'openshift-ingress';

type GatewayResource = K8sResourceCommon & {
  spec?: {
    listeners?: Array<{
      hostname?: string;
      [key: string]: unknown;
    }>;
  };
};

type HTTPRouteResource = K8sResourceCommon & {
  spec?: {
    rules?: Array<{
      filters?: Array<{
        requestRedirect?: {
          path?: {
            replaceFullPath?: string;
            [key: string]: unknown;
          };
          [key: string]: unknown;
        };
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }>;
  };
};

/**
 * Build the RayCluster dashboard URL from Gateway hostname + HTTPRoute path.
 *
 * Gateway: `data-science-gateway` in `openshift-ingress` -> spec.listeners[0].hostname
 * HTTPRoute: `<namespace>-<clustername>` in `redhat-ods-applications` -> spec.rules.filters[0].requestRedirect.path.replaceFullPath
 *
 * Final URL: https://<hostname><path>
 */
export const useRayClusterDashboardURL = (
  rayClusterName: string | undefined,
  namespace: string,
): { url: string | null; loaded: boolean; error: Error | undefined } => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [url, setUrl] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);

  React.useEffect(() => {
    if (!rayClusterName || !dashboardNamespace) {
      setUrl(null);
      setLoaded(true);
      setError(undefined);
      return;
    }

    setUrl(null);
    setError(undefined);
    setLoaded(false);

    let cancelled = false;

    const fetchURL = async () => {
      try {
        const [gateway, httpRoute] = await Promise.all([
          k8sGetResource<GatewayResource>({
            model: GatewayModel,
            queryOptions: { name: GATEWAY_NAME, ns: GATEWAY_NAMESPACE },
          }),
          k8sGetResource<HTTPRouteResource>({
            model: HTTPRouteModel,
            queryOptions: {
              name: `${namespace}-${rayClusterName}`,
              ns: dashboardNamespace,
            },
          }),
        ]);

        if (cancelled) {
          return;
        }

        const hostname = gateway.spec?.listeners?.[0]?.hostname;
        const path =
          httpRoute.spec?.rules?.[0]?.filters?.[0]?.requestRedirect?.path?.replaceFullPath;

        if (hostname && path) {
          setUrl(`https://${hostname}${path}`);
        } else if (hostname) {
          setUrl(`https://${hostname}`);
        } else {
          setUrl(null);
        }
        setLoaded(true);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error('Failed to fetch dashboard URL'));
          setUrl(null);
          setLoaded(true);
        }
      }
    };

    fetchURL();

    return () => {
      cancelled = true;
    };
  }, [rayClusterName, namespace, dashboardNamespace]);

  return { url, loaded, error };
};
