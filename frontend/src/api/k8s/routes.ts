import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { RouteModel, NamespaceModel } from '~/api/models';
import { K8sAPIOptions, RouteKind, NamespaceKind } from '~/k8sTypes';
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

export const getServiceMeshGwHost = async (namespace: string): Promise<string | null> => {
  const queryOptions = {
    name: namespace,
  };
  const project = await k8sGetResource<NamespaceKind>({ model: NamespaceModel, queryOptions });
  return project?.metadata?.annotations?.['opendatahub.io/service-mesh-gw-host'] || null;
};
