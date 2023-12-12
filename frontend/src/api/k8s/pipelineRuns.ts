import { k8sListResource, k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { PipelineRunKind, TaskRunKind } from '~/k8sTypes';
import { PipelineRunModel, TaskRunModel } from '~/api/models';

export const listK8sPipelineRunsByLabel = async (
  namespace: string,
  label: string,
): Promise<PipelineRunKind[]> =>
  k8sListResource<PipelineRunKind>({
    model: PipelineRunModel,
    queryOptions: {
      ns: namespace,
      queryParams: { labelSelector: label },
    },
  }).then((listResource) => listResource.items);

export const listK8sPipelineRun = async (
  namespace: string,
  name: string,
): Promise<PipelineRunKind[]> =>
  k8sListResource<PipelineRunKind>({
    model: PipelineRunModel,
    queryOptions: {
      ns: namespace,
      queryParams: { name: name },
    },
  }).then((listResource) => listResource.items);

export const getK8sPipelineRun = (name: string, namespace: string): Promise<PipelineRunKind> =>
  k8sGetResource<PipelineRunKind>({
    model: PipelineRunModel,
    queryOptions: { name, ns: namespace },
  });

export const getTaskRun = (name: string, namespace: string): Promise<TaskRunKind> =>
  k8sGetResource<TaskRunKind>({
    model: TaskRunModel,
    queryOptions: { name, ns: namespace },
  });
