import { k8sGetResource, k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import type { K8sAPIOptions, RouteKind } from '@odh-dashboard/k8s-core';
import { applyK8sAPIOptions } from '@odh-dashboard/k8s-core';
import { RouteModel } from '#~/api/models';

export const getRoute = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<RouteKind> =>
  k8sGetResource<RouteKind>(
    applyK8sAPIOptions(
      {
        model: RouteModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );

export const listRoutes = (
  namespace: string,
  labelSelector?: string,
  opts?: K8sAPIOptions,
): Promise<RouteKind[]> =>
  k8sListResource<RouteKind>(
    applyK8sAPIOptions(
      {
        model: RouteModel,
        queryOptions: {
          ns: namespace,
          queryParams: { ...(labelSelector ? { labelSelector } : {}) },
        },
      },
      opts,
    ),
  ).then((result) => result.items);
