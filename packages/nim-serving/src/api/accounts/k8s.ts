import { K8sModelCommon, k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { NIMAccountKind } from '@odh-dashboard/internal/k8sTypes';

export const NIMAccountModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'nim.opendatahub.io',
  kind: 'Account',
  plural: 'accounts',
};

export const listNIMAccounts = async (namespace: string): Promise<NIMAccountKind[]> =>
  k8sListResource<NIMAccountKind>({
    model: NIMAccountModel,
    queryOptions: {
      ns: namespace,
    },
  }).then((listResource) => listResource.items);
