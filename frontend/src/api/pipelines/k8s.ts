import { k8sCreateResource, k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { DataSciencePipelineApplicationModel } from '~/api/models';
import { DSPipelineKind, K8sAPIOptions, RouteKind } from '~/k8sTypes';
import { getRoute } from '~/api';
import { mergeRequestInit } from '~/api/apiMergeUtils';

const PIPELINE_ROUTE_NAME = 'ds-pipeline-pipelines-definition';
const PIPELINE_DEFINITION_NAME = 'pipelines-definition';

export const getPipelineAPIRoute = async (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<RouteKind> => getRoute(PIPELINE_ROUTE_NAME, namespace, opts);

export const createPipelinesCR = async (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<DSPipelineKind> => {
  const resource: DSPipelineKind = {
    apiVersion: `${DataSciencePipelineApplicationModel.apiGroup}/${DataSciencePipelineApplicationModel.apiVersion}`,
    kind: DataSciencePipelineApplicationModel.kind,
    metadata: {
      name: PIPELINE_DEFINITION_NAME,
      namespace,
    },
    spec: {
      // TODO: populate info from the modal
      objectStorage: {
        minio: {
          image: 'quay.io/opendatahub/minio:RELEASE.2019-08-14T20-37-41Z-license-compliance',
        },
      },
      mlpipelineUI: {
        image: 'quay.io/opendatahub/odh-ml-pipelines-frontend-container:beta-ui',
      },
    },
  };

  return k8sCreateResource<DSPipelineKind>({
    model: DataSciencePipelineApplicationModel,
    resource,
    fetchOptions: { requestInit: mergeRequestInit(opts) },
  });
};

export const getPipelinesCR = async (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<DSPipelineKind> => {
  return k8sGetResource<DSPipelineKind>({
    model: DataSciencePipelineApplicationModel,
    queryOptions: { name: PIPELINE_DEFINITION_NAME, ns: namespace },
    fetchOptions: { requestInit: mergeRequestInit(opts) },
  });
};
