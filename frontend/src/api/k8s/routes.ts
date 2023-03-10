import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { RouteModel } from '~/api/models';
import { K8sAPIOptions, RouteKind } from '~/k8sTypes';
import { mergeRequestInit } from '~/api/apiMergeUtils';

export const getRoute = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<RouteKind> =>
  k8sGetResource<RouteKind>({
    model: RouteModel,
    queryOptions: { name, ns: namespace },
    fetchOptions: { requestInit: mergeRequestInit(opts) },
  });
