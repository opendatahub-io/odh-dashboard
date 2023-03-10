import { K8sAPIOptions } from '~/k8sTypes';

type KubeflowSpecificAPICall = (...args: unknown[]) => Promise<unknown>;
type KubeflowAPICall<ActualCall extends KubeflowSpecificAPICall = KubeflowSpecificAPICall> = (
  hostPath: string,
  opts?: K8sAPIOptions,
) => ActualCall;

type ListPipelinesResponse = {
  // TODO: Handle what this means to the kubeflow api
};
export type ListPipelines = () => Promise<ListPipelinesResponse>;
export type ListPipelinesAPI = KubeflowAPICall<ListPipelines>;

export type PipelineAPIs = {
  // TODO: fill out with all the APIs
  // eg: uploadPipeline: (content: string) => SomeReturnedStructure;
  listPipelines: ListPipelines;
};
