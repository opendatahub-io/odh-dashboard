import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { DataScienceClusterKind } from '#~/k8sTypes';
import { DataScienceClusterModel } from '#~/api/models';

export const listDataScienceClusters = (): Promise<DataScienceClusterKind[]> =>
  k8sListResource<DataScienceClusterKind>({
    model: DataScienceClusterModel,
  }).then((dataScienceClusters) => dataScienceClusters.items);
