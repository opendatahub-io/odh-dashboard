import { K8sAPIOptions } from '~/k8sTypes';
import { ListPipelines } from '~/concepts/pipelines/types';

type KubeflowSpecificAPICall = (...args: unknown[]) => Promise<unknown>;
type KubeflowAPICall<ActualCall extends KubeflowSpecificAPICall = KubeflowSpecificAPICall> = (
  hostPath: string,
  opts?: K8sAPIOptions,
) => ActualCall;

export type ListPipelinesAPI = KubeflowAPICall<ListPipelines>;
