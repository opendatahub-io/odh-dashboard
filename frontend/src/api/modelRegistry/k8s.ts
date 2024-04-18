import { k8sGetResource, k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { K8sAPIOptions, ModelRegistryKind, RouteKind } from '~/k8sTypes';
import { getRoute } from '~/api';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';
import { ModelRegistryModel } from '~/api/models/modelRegistry';
import { MODEL_REGISTRY_DEFAULT_NAMESPACE } from '~/concepts/modelRegistry/const';

export const getModelRegistryAPIRoute = async (
  namespace: string,
  name: string,
  opts?: K8sAPIOptions,
): Promise<RouteKind> => getRoute(name, namespace, opts);

export const getModelRegistryCR = async (
  namespace: string,
  name: string,
  opts?: K8sAPIOptions,
): Promise<ModelRegistryKind> =>
  k8sGetResource<ModelRegistryKind>(
    applyK8sAPIOptions(
      {
        model: ModelRegistryModel,
        queryOptions: {
          ns: namespace,
          name,
        },
      },
      opts,
    ),
  );

export const listModelRegistries = async (): Promise<ModelRegistryKind[]> =>
  k8sListResource<ModelRegistryKind>({
    model: ModelRegistryModel,
    queryOptions: {
      ns: MODEL_REGISTRY_DEFAULT_NAMESPACE,
    },
  }).then((listResource) => listResource.items);
