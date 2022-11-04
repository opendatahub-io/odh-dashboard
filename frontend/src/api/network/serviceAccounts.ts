import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import { getModelServiceAccountName } from 'pages/modelServing/utils';
import { ServiceAccountModel } from '../../api/models';
import { ServiceAccountKind } from '../../k8sTypes';

export const assembleServingRuntimeSA = (namespace: string): ServiceAccountKind => {
  const name = getModelServiceAccountName(namespace);

  const serviceAccount: ServiceAccountKind = {
    apiVersion: 'v1',
    kind: 'ServiceAccount',
    metadata: {
      name,
      namespace,
    },
  };
  return serviceAccount;
};

export const createServiceAccount = async (
  data: ServiceAccountKind,
): Promise<ServiceAccountKind> => {
  return k8sCreateResource<ServiceAccountKind>({
    model: ServiceAccountModel,
    resource: data,
  });
};
