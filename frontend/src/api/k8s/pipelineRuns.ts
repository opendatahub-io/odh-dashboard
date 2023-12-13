import {
  k8sListResource,
  k8sGetResource,
  k8sCreateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { K8sAPIOptions, PipelineRunKind, TaskRunKind } from '~/k8sTypes';
import { PipelineRunModel, TaskRunModel } from '~/api/models';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';

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

export const listK8sPipelineRuns = async (
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

export const listTaskRuns = (namespace: string): Promise<TaskRunKind[]> =>
  k8sListResource<TaskRunKind>({
    model: TaskRunModel,
    queryOptions: { ns: namespace },
  }).then((listResource) => listResource.items);

export const createK8sPipelineRun = async (
  resource: PipelineRunKind,
  opts?: K8sAPIOptions,
): Promise<PipelineRunKind> =>
  k8sCreateResource<PipelineRunKind>(
    applyK8sAPIOptions(opts, {
      model: PipelineRunModel,
      resource: resource,
    }),
  );
