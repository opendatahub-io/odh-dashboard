import { pipelinesGET } from '~/api/pipelines/callUtils';
import { ListPipelinesAPI } from './callTypes';

// TODO: Kubeflow endpoints

// eg uploadPipeline: POST /apis/v1beta1/pipelines/upload
// https://www.kubeflow.org/docs/components/pipelines/v1/reference/api/kubeflow-pipeline-api-spec/#operation--apis-v1beta1-pipelines-upload-post

export const listPipelines: ListPipelinesAPI = (hostPath, opts?) => () =>
  pipelinesGET(hostPath, '/apis/v1beta1/pipelines', opts);
