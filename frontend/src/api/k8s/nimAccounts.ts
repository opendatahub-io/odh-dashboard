import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { NIMAccountModel } from '#~/api/models';
import { NIMAccountKind } from '#~/k8sTypes';

export const listNIMAccounts = async (namespace: string): Promise<NIMAccountKind[]> =>
  k8sListResource<NIMAccountKind>({
    model: NIMAccountModel,
    queryOptions: {
      ns: namespace,
    },
  }).then((listResource) => listResource.items);
