import { k8sCreateResource, k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { DSPipelineModel } from '../models';
import { DSPipelineKind, K8sAPIOptions, RouteKind } from '../../k8sTypes';
import { getRoute } from '../k8s/routes';
import { mergeRequestInit } from '../apiMergeUtils';

const PIPELINE_ROUTE_NAME = 'ds-pipeline-ui';
const PIPELINE_DEFINITION_NAME = 'pipelines-definition';

export const getPipelineAPIRoute = async (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<RouteKind> => {
  console.debug('Not ready for a namespace yet! Overriding to opendatahub -- from', namespace);
  return getRoute(PIPELINE_ROUTE_NAME, 'opendatahub', opts);
};

export const createPipelinesCR = async (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<DSPipelineKind> => {
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
    fetchOptions: { requestInit: mergeRequestInit(opts) },
  });
};

export const getPipelinesCR = async (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<DSPipelineKind> => {
  return k8sGetResource<DSPipelineKind>({
    model: DSPipelineModel,
    queryOptions: { name: PIPELINE_DEFINITION_NAME, ns: namespace },
    fetchOptions: { requestInit: mergeRequestInit(opts) },
  });
};
