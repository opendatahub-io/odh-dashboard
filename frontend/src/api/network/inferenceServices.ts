import { k8sGetResource, k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { InferenceServiceModel } from 'api/models';
import { InferenceServiceKind } from 'k8sTypes';

export const listInferenceService = (namespace?: string): Promise<InferenceServiceKind[]> => {
  const queryOptions = namespace ? { ns: namespace } : undefined;
  return k8sListResource<InferenceServiceKind>({
    model: InferenceServiceModel,
    queryOptions,
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
