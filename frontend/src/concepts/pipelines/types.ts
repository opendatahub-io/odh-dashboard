import { ListPipelinesResponseKF } from './kfTypes';

export type ListPipelines = () => Promise<ListPipelinesResponseKF>;

export type PipelineAPIs = {
  // TODO: fill out with all the APIs
  // eg: uploadPipeline: (content: string) => SomeReturnedStructure;
  listPipelines: ListPipelines;
};
