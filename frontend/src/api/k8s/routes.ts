import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { RouteModel, ProjectModel } from '~/api/models';
import { K8sAPIOptions, RouteKind, ProjectKind } from '~/k8sTypes';
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
  return k8sGetResource<ProjectKind>({ model: ProjectModel, queryOptions })
    .then(
      (project) =>
        project?.metadata?.annotations?.[
          'service-mesh.opendatahub.io/public-gateway-host-external'
        ] || null,
    )
    .catch((error) => error);
};
