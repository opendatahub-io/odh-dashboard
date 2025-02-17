import { k8sListResource, k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { DataScienceClusterKind, DeploymentMode } from '~/k8sTypes';
import { DataScienceClusterModel } from '~/api/models';

export const listDataScienceClusters = (): Promise<DataScienceClusterKind[]> =>
  k8sListResource<DataScienceClusterKind>({
    model: DataScienceClusterModel,
  }).then((dataScienceClusters) => dataScienceClusters.items);

export const toggleInstructLabState = (
  instructLabState: string,
  dscName: string,
): Promise<DataScienceClusterKind> =>
  k8sPatchResource<DataScienceClusterKind>({
    model: DataScienceClusterModel,
    queryOptions: { name: dscName },
    patches: [
      {
        op: 'replace',
        path: '/spec/components/datasciencepipelines/managedPipelines/instructLab/state',
        value: instructLabState,
      },
    ],
  });

export const patchDefaultDeploymentMode = (
  deploymentMode: DeploymentMode,
  dscName: string,
): Promise<DataScienceClusterKind> =>
  k8sPatchResource<DataScienceClusterKind>({
    model: DataScienceClusterModel,
    queryOptions: { name: dscName },
    patches: [
      {
        op: 'replace',
        path: '/spec/components/kserve/defaultDeploymentMode',
        value: deploymentMode,
      },
    ],
  });
