import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { AccountModel } from '~/api/models';
import { NIMAccountKind } from '~/k8sTypes';

export const listAccounts = async (namespace: string): Promise<NIMAccountKind[]> =>
  k8sListResource<NIMAccountKind>({
    model: AccountModel,
    queryOptions: {
      ns: namespace,
    },
  }).then((listResource) => listResource.items);
