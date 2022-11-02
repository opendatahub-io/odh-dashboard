import { k8sGetResource, k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { DeployedModelModel } from 'api/models';
import { DeployedModelKind } from 'k8sTypes';

export const listDeployedModels = (namespace: string): Promise<DeployedModelKind[]> => {
  return k8sListResource<DeployedModelKind>({
    model: DeployedModelModel,
    queryOptions: { ns: namespace },
  }).then((listResource) => listResource.items);
};

export const getDeployedModel = (name: string, namespace: string): Promise<DeployedModelKind> => {
  return k8sGetResource<DeployedModelKind>({
    model: DeployedModelModel,
    queryOptions: { name, ns: namespace },
  });
};
