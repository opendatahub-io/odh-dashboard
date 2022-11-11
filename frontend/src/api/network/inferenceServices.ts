import {
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { InferenceServiceModel } from 'api/models';
import { InferenceServiceKind, K8sStatus } from 'k8sTypes';

export const listInferenceService = (namespace?: string): Promise<InferenceServiceKind[]> => {
  return k8sListResource<InferenceServiceKind>({
    model: InferenceServiceModel,
    ...(namespace && { ns: namespace }),
  }).then((listResource) => listResource.items);
};

export const getInferenceService = (
  name: string,
  namespace: string,
): Promise<InferenceServiceKind> => {
  return k8sGetResource<InferenceServiceKind>({
    model: InferenceServiceModel,
    queryOptions: { name, ns: namespace },
  });
};

export const deleteInferenceService = (name: string, namespace: string): Promise<K8sStatus> => {
  return k8sDeleteResource<InferenceServiceKind, K8sStatus>({
    model: InferenceServiceModel,
    queryOptions: { name, ns: namespace },
  });
};
