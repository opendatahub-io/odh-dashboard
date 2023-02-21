import { k8sCreateResource, k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { DSPipelineModel } from '../models';
import { DSPipelineKind, RouteKind } from '../../k8sTypes';
import { getRoute } from '../k8s/routes';

const PIPELINE_ROUTE_NAME = 'ds-pipeline-ui';
const PIPELINE_DEFINITION_NAME = 'pipelines-definition';

export const getPipelineAPIRoute = async (namespace: string): Promise<RouteKind> => {
  console.debug('Not ready for a namespace yet! Overriding to opendatahub -- from', namespace);
  return getRoute(PIPELINE_ROUTE_NAME, 'opendatahub');
};

export const createPipelinesCR = async (namespace: string): Promise<DSPipelineKind> => {
  const resource: DSPipelineKind = {
    apiVersion: `${DSPipelineModel.apiGroup}/${DSPipelineModel.apiVersion}`,
    kind: DSPipelineModel.kind,
    metadata: {
      name: PIPELINE_DEFINITION_NAME,
      namespace,
    },
    spec: {}, // TODO: likely info from a modal
  };

  return k8sCreateResource<DSPipelineKind>({
    model: DSPipelineModel,
    resource,
  });
};

export const getPipelinesCR = async (namespace: string): Promise<DSPipelineKind> => {
  return k8sGetResource<DSPipelineKind>({
    model: DSPipelineModel,
    queryOptions: { name: PIPELINE_DEFINITION_NAME, ns: namespace },
  });
};
