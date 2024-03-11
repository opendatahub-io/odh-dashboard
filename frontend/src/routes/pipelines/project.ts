import { routePipelineDetails } from '~/routes/pipelines/global';
import { routeProjectsNamespace } from '~/routes/projects';

export const routeProjectPipelineDetailsNamespace = (
  namespace: string,
  pipelineId: string,
  versionId: string,
): string => `${routeProjectsNamespace(namespace)}/${routePipelineDetails(pipelineId, versionId)}`;
